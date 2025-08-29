import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal } from 'lucide-react';
import FollowButton from './FollowButton';
import ReportDialog from './ReportDialog';
import ClickableUsername from './ClickableUsername';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PostComments from './PostComments';

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
  const [comments, setComments] = useState(0);
  const [showComments, setShowComments] = useState(false);

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

      // Get comment count
      const { data: commentsData } = await supabase
        .from('posts')
        .select('id')
        .eq('reply_to', post.id);

      setComments(commentsData?.length || 0);
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
    <Card className="p-4 hover-lift animate-fade-in">
      <div className="flex space-x-3">
        <Avatar>
          <AvatarImage src={post.profiles?.avatar_url} />
          <AvatarFallback>
            {post.profiles?.display_name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="cursor-pointer">
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback>
                  {post.profiles?.display_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <ClickableUsername 
                    userId={post.user_id}
                    username={post.profiles?.username || 'unknown'}
                    displayName={post.profiles?.display_name || 'Unknown User'}
                    className="font-semibold"
                  />
                  <span className="text-muted-foreground text-sm">
                    @{post.profiles?.username || 'unknown'}
                  </span>
                  {post.profiles?.is_verified && (
                    <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    </div>
                  )}
                  {post.profiles?.user_type === 'staff' && (
                    <Badge variant="secondary">Staff</Badge>
                  )}
                  <span className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FollowButton targetUserId={post.user_id} size="sm" />
            </div>
          </div>
          
          <p className="text-foreground mb-3">{post.content}</p>
          
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary interaction-bounce"
              onClick={() => setShowComments(true)}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              <span>{comments > 0 ? comments : 'Reply'}</span>
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
              className={`text-muted-foreground hover:text-red-500 interaction-bounce ${
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
              <ReportDialog 
                reportedPostId={post.id} 
                reportedUserId={post.user_id}
                trigger={<MoreHorizontal className="w-4 h-4" />}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <PostComments
            postId={post.id}
            onClose={() => setShowComments(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PostCard;