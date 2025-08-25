import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PostCard from './PostCard';
import PostCreate from './PostCreate';
import { useToast } from '@/hooks/use-toast';

const Feed = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            user_type,
            is_verified
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading posts',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Set up real-time subscription for new posts
    const channel = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <PostCreate onPostCreated={fetchPosts} />
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PostCreate onPostCreated={fetchPosts} />
      
      {posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        posts.map((post, index) => (
          <div key={post.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <PostCard
              post={post}
              onUpdate={fetchPosts}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default Feed;