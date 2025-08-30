-- Drop existing function and recreate with proper type
DROP FUNCTION IF EXISTS create_notification(uuid,text,text,text,jsonb);

-- Create storage bucket for avatars if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'avatars');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar" 
    ON storage.objects 
    FOR INSERT 
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar" 
    ON storage.objects 
    FOR UPDATE 
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

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