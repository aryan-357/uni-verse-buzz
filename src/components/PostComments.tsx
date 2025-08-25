import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, MoreHorizontal, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PostCommentsProps {
  postId: string;
  onClose: () => void;
}

const PostComments: React.FC<PostCommentsProps> = ({ postId, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url, is_verified),
          post_interactions (interaction_type)
        `)
        .eq('reply_to', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading comments',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          content: newComment.trim(),
          user_id: user?.id,
          reply_to: postId
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
      
      toast({
        title: 'Comment posted!',
        description: 'Your comment has been added successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error posting comment',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('post_interactions')
          .delete()
          .eq('post_id', commentId)
          .eq('user_id', user.id)
          .eq('interaction_type', 'like');
      } else {
        await supabase
          .from('post_interactions')
          .insert({
            post_id: commentId,
            user_id: user.id,
            interaction_type: 'like'
          });
      }

      fetchComments();
    } catch (error: any) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user?.user_metadata?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {280 - newComment.length} characters remaining
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                  >
                    {submitting ? (
                      <>Loading...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse flex space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No comments yet</h3>
            <p className="text-muted-foreground text-center">
              Be the first to share your thoughts on this post.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const likeCount = comment.post_interactions?.filter((i: any) => i.interaction_type === 'like').length || 0;
            const isLiked = comment.post_interactions?.some((i: any) => i.interaction_type === 'like' && i.user_id === user?.id) || false;

            return (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback>
                        {comment.profiles?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm">{comment.profiles?.display_name}</p>
                        <p className="text-xs text-muted-foreground">@{comment.profiles?.username}</p>
                        {comment.profiles?.is_verified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <p className="text-sm mb-3">{comment.content}</p>
                      
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 px-2 ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
                          onClick={() => handleLikeComment(comment.id, isLiked)}
                        >
                          <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                          {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
                        </Button>
                        
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PostComments;