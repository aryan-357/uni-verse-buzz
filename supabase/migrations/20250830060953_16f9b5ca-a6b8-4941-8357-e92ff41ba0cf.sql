-- Skip storage policies that already exist and fix remaining issues
-- Fix user_moderation RLS policy that was fixed before

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

-- Enable realtime for tables that might not have it
DO $$
BEGIN
  -- Enable replica identity and realtime publication if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    ALTER TABLE notifications REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER TABLE messages REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'community_posts'
  ) THEN
    ALTER TABLE community_posts REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'posts'
  ) THEN
    ALTER TABLE posts REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'post_interactions'
  ) THEN
    ALTER TABLE post_interactions REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE post_interactions;
  END IF;
END $$;