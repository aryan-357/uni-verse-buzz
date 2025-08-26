import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import PostCard from '@/components/PostCard';
import { Heart, MessageCircle, Users, UserPlus, Bell, Search, CheckCircle } from 'lucide-react';
import FollowButton from '@/components/FollowButton';
import { useToast } from '@/hooks/use-toast';

const Explore = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{
    posts: any[];
    users: any[];
  }>({ posts: [], users: [] });
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchTerm.trim()) {
      performSearch();
    } else {
      setSearchResults({ posts: [], users: [] });
      fetchTrendingContent();
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchTrendingContent();
    fetchSuggestedUsers();
  }, []);

  const fetchTrendingContent = async () => {
    try {
      // Get posts with most interactions in the last 7 days
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url, user_type, is_verified),
          post_interactions (interaction_type)
        `)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Sort by interaction count
      const sortedPosts = (data || []).sort((a, b) => 
        (b.post_interactions?.length || 0) - (a.post_interactions?.length || 0)
      );

      setTrendingPosts(sortedPosts);
    } catch (error: any) {
      console.error('Error fetching trending content:', error);
    }
  };

  const fetchSuggestedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user?.id)
        .limit(5);

      if (error) throw error;
      setSuggestedUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching suggested users:', error);
    }
  };

  const performSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      // Search posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url, user_type, is_verified)
        `)
        .ilike('content', `%${searchTerm}%`)
        .limit(10);

      if (postsError) throw postsError;

      // Search users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .limit(10);

      if (usersError) throw usersError;

      setSearchResults({
        posts: posts || [],
        users: users || []
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Explore</h1>
        
        <div className="flex space-x-2">
          <Input
            placeholder="Search posts, users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
          />
          <Button onClick={performSearch} disabled={loading}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {searchTerm ? (
        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="posts">Posts ({searchResults.posts.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({searchResults.users.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : searchResults.posts.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No posts found</h3>
                <p className="text-muted-foreground">Try different keywords or check your spelling.</p>
              </div>
            ) : (
              searchResults.posts.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : searchResults.users.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No users found</h3>
                <p className="text-muted-foreground">Try different keywords or check your spelling.</p>
              </div>
            ) : (
              searchResults.users.map((user: any) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center space-x-4 p-4">
                    <Avatar>
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.display_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{user.display_name}</h3>
                        {user.is_verified && (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        )}
                        {user.user_type === 'staff' && (
                          <Badge variant="secondary">Staff</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">@{user.username}</p>
                      {user.bio && <p className="text-sm mt-1">{user.bio}</p>}
                    </div>
                    <FollowButton targetUserId={user.user_id} size="sm" />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trending Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trendingPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Suggested Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestedUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.display_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <FollowButton targetUserId={user.user_id} size="sm" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Explore;