import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import PostCard from '@/components/PostCard';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Explore = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any>({ posts: [], users: [], communities: [] });
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
        .eq('is_verified', true)
        .limit(5);

      if (error) throw error;
      setSuggestedUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching suggested users:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      // Search posts
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url, user_type, is_verified)
        `)
        .ilike('content', `%${searchTerm}%`)
        .limit(10);

      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .limit(10);

      // Search communities
      const { data: communities } = await supabase
        .from('communities')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(10);

      setSearchResults({
        posts: posts || [],
        users: users || [],
        communities: communities || []
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
            placeholder="Search posts, users, communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {searchTerm ? (
        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="posts">Posts ({searchResults.posts.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({searchResults.users.length})</TabsTrigger>
            <TabsTrigger value="communities">Communities ({searchResults.communities.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            {searchResults.posts.map((post: any) => (
              <PostCard key={post.id} post={post} />
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {searchResults.users.map((user: any) => (
              <Card key={user.id}>
                <CardContent className="flex items-center space-x-4 p-4">
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{user.display_name}</h3>
                      {user.is_verified && <Badge variant="secondary">Verified</Badge>}
                    </div>
                    <p className="text-muted-foreground">@{user.username}</p>
                    <Badge variant="outline">{user.user_type}</Badge>
                  </div>
                  <Button variant="outline">Follow</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="communities" className="space-y-4">
            {searchResults.communities.map((community: any) => (
              <Card key={community.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{community.name}</h3>
                      <p className="text-muted-foreground">{community.description}</p>
                    </div>
                    <Button variant="outline">Join</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                    <Button size="sm" variant="outline">Follow</Button>
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