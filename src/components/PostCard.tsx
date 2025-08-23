import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PostCardProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles?: {
      username: string;
      display_name: string;
      avatar_url?: string;
      user_type: string;
      is_verified: boolean;
    };
  };
  onUpdate?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchInteractions();
  }, [post.id, user]);

  const fetchInteractions = async () => {
    try {
      // Get like count
      const { data: likesData } = await supabase
        .from('post_interactions')
        .select('*')
        .eq('post_id', post.id)
        .eq('interaction_type', 'like');

      setLikes(likesData?.length || 0);

      // Check if current user liked
      if (user) {
        const { data: userLike } = await supabase
          .from('post_interactions')
          .select('*')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('interaction_type', 'like')
          .single();

        setIsLiked(!!userLike);
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  const handleLike = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from('post_interactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('interaction_type', 'like');

        setLikes(prev => prev - 1);
        setIsLiked(false);
      } else {
        // Add like
        await supabase
          .from('post_interactions')
          .insert({
            post_id: post.id,
            user_id: user.id,
            interaction_type: 'like'
          });

        setLikes(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex space-x-3">
        <Avatar>
          <AvatarImage src={post.profiles?.avatar_url} />
          <AvatarFallback>
            {post.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold">{post.profiles?.display_name || 'Anonymous'}</span>
            <span className="text-muted-foreground">@{post.profiles?.username}</span>
            {post.profiles?.is_verified && (
              <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
              </div>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-foreground mb-3">{post.content}</p>
          
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              <span>Reply</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-green-500"
            >
              <Repeat2 className="w-4 h-4 mr-1" />
              <span>Repost</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className={`text-muted-foreground hover:text-red-500 ${
                isLiked ? 'text-red-500' : ''
              }`}
              onClick={handleLike}
              disabled={isLoading}
            >
              <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likes}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Share className="w-4 h-4 mr-1" />
              <span>Share</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary ml-auto"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PostCard;