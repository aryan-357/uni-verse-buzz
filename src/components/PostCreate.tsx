import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageIcon, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from './ImageUpload';

interface PostCreateProps {
  onPostCreated?: () => void;
}

const PostCreate: React.FC<PostCreateProps> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !selectedImage) || !user) return;

    setIsPosting(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedImage);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        imageUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
          image_url: imageUrl
        });

      if (error) throw error;

      setContent('');
      setSelectedImage(null);
      setImagePreview('');
      toast({
        title: 'Post created!',
        description: 'Your post has been shared with the community.',
      });
      
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating post',
        description: error.message,
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          <Avatar>
            <AvatarImage src="" />
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's happening at school?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none border-none focus-visible:ring-0 text-lg"
              maxLength={280}
            />
            
            {/* Image Upload Preview */}
            {selectedImage && (
              <div className="mt-3">
                <ImageUpload
                  onImageSelect={handleImageSelect}
                  onImageRemove={handleImageRemove}
                  preview={imagePreview}
                  disabled={isPosting}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={() => !selectedImage && (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                  disabled={isPosting}
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                {!selectedImage && (
                  <div className="hidden">
                    <ImageUpload
                      onImageSelect={handleImageSelect}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {280 - content.length} characters remaining
                </span>
                <Button 
                  type="submit" 
                  disabled={(!content.trim() && !selectedImage) || isPosting}
                  className="rounded-full"
                >
                  {isPosting ? 'Posting...' : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Card>
  );
};

export default PostCreate;