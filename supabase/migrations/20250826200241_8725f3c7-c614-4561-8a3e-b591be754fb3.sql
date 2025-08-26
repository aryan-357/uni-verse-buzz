-- Create follows table for social connections
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS policies for follows
CREATE POLICY "Follows are viewable by everyone" 
ON public.follows 
FOR SELECT 
USING (true);

CREATE POLICY "Users can follow others" 
ON public.follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" 
ON public.follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- Create notifications table for real-time updates
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create reports table for content moderation
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  reported_post_id UUID,
  report_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can create reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all reports" 
ON public.reports 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_moderator = true
));

-- Add realtime for posts, messages, and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;  
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;

-- Create function to send notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  user_id UUID,
  type TEXT,
  title TEXT,
  content TEXT,
  data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, content, data)
  VALUES (user_id, type, title, content, data);
END;
$$;

-- Create trigger function for post interactions
CREATE OR REPLACE FUNCTION public.handle_post_interaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  actor_name TEXT;
BEGIN
  -- Get post author and actor name
  SELECT posts.user_id INTO post_author_id
  FROM posts 
  WHERE posts.id = NEW.post_id;
  
  SELECT profiles.display_name INTO actor_name
  FROM profiles 
  WHERE profiles.user_id = NEW.user_id;
  
  -- Don't notify if user liked their own post
  IF post_author_id != NEW.user_id THEN
    -- Create notification for post author
    PERFORM create_notification(
      post_author_id,
      NEW.interaction_type,
      actor_name || ' ' || NEW.interaction_type || 'd your post',
      actor_name || ' ' || NEW.interaction_type || 'd your post',
      jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for post interactions
CREATE TRIGGER on_post_interaction_created
  AFTER INSERT ON post_interactions
  FOR EACH ROW EXECUTE FUNCTION handle_post_interaction();

-- Create trigger function for follows
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name TEXT;
BEGIN
  SELECT profiles.display_name INTO follower_name
  FROM profiles 
  WHERE profiles.user_id = NEW.follower_id;
  
  -- Create notification for the followed user
  PERFORM create_notification(
    NEW.following_id,
    'follow',
    follower_name || ' started following you',
    follower_name || ' started following you',
    jsonb_build_object('follower_id', NEW.follower_id)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new follows
CREATE TRIGGER on_follow_created
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION handle_new_follow();