-- Fix UUID issue in messages table by adding proper foreign key relationships
-- Fix community posts relationship issues
-- Fix user moderation RLS policy
-- Add proper avatar storage bucket
-- Add triggers for notifications
-- Enable RLS on all tables and fix policies

-- Create storage bucket for avatars if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fix user_moderation RLS policy
DROP POLICY IF EXISTS "Moderators can create moderation actions" ON user_moderation;

CREATE POLICY "Moderators can create moderation actions" 
ON user_moderation 
FOR INSERT 
WITH CHECK (
  auth.uid() = moderator_id AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.is_moderator = true OR profiles.user_type IN ('staff', 'admin'))
  )
);

-- Create function to automatically create notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_content TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, content, data)
  VALUES (p_user_id, p_type, p_title, p_content, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create trigger function for post interactions notifications
CREATE OR REPLACE FUNCTION notify_post_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  post_owner_id UUID;
  actor_name TEXT;
BEGIN
  -- Get post owner and actor name
  SELECT p.user_id INTO post_owner_id 
  FROM posts p 
  WHERE p.id = NEW.post_id;
  
  SELECT prof.display_name INTO actor_name 
  FROM profiles prof 
  WHERE prof.user_id = NEW.user_id;
  
  -- Don't notify if user is interacting with their own post
  IF post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification based on interaction type
  IF NEW.interaction_type = 'like' THEN
    PERFORM create_notification(
      post_owner_id,
      'like',
      'New like on your post',
      actor_name || ' liked your post',
      jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger function for replies notifications
CREATE OR REPLACE FUNCTION notify_post_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  original_post_owner_id UUID;
  actor_name TEXT;
BEGIN
  -- Only process if this is a reply
  IF NEW.reply_to IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get original post owner and actor name
  SELECT p.user_id INTO original_post_owner_id 
  FROM posts p 
  WHERE p.id = NEW.reply_to;
  
  SELECT prof.display_name INTO actor_name 
  FROM profiles prof 
  WHERE prof.user_id = NEW.user_id;
  
  -- Don't notify if user is replying to their own post
  IF original_post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Create notification
  PERFORM create_notification(
    original_post_owner_id,
    'comment',
    'New reply to your post',
    actor_name || ' replied to your post',
    jsonb_build_object('post_id', NEW.reply_to, 'reply_id', NEW.id, 'user_id', NEW.user_id)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger function for follows notifications
CREATE OR REPLACE FUNCTION notify_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  SELECT prof.display_name INTO actor_name 
  FROM profiles prof 
  WHERE prof.user_id = NEW.follower_id;
  
  -- Create notification
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    'New follower',
    actor_name || ' started following you',
    jsonb_build_object('user_id', NEW.follower_id)
  );
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_post_interaction_notification ON post_interactions;
CREATE TRIGGER trigger_post_interaction_notification
  AFTER INSERT ON post_interactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_interaction();

DROP TRIGGER IF EXISTS trigger_post_reply_notification ON posts;
CREATE TRIGGER trigger_post_reply_notification
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_reply();

DROP TRIGGER IF EXISTS trigger_follow_notification ON follows;
CREATE TRIGGER trigger_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_follow();

-- Enable realtime for tables
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE community_posts REPLICA IDENTITY FULL;
ALTER TABLE posts REPLICA IDENTITY FULL;
ALTER TABLE post_interactions REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_interactions;