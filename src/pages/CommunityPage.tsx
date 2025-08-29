import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, MessageSquare, Send, Pin } from 'lucide-react';
import PostCard from '@/components/PostCard';

const CommunityPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [community, setCommunity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const fetchCommunityData = async () => {
    if (!id) return;

    try {
      // Fetch community details
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select(`
          *,
          profiles:created_by (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (communityError) throw communityError;
      setCommunity(communityData);

      // Fetch community posts
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
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
        .eq('community_id', id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('community_members')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            user_type
          )
        `)
        .eq('community_id', id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Check if current user is a member
      if (user) {
        const userIsMember = membersData?.some(member => member.user_id === user.id);
        setIsMember(userIsMember || false);
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading community',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async () => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: id,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      setIsMember(true);
      fetchCommunityData();
      toast({
        title: 'Joined community!',
        description: `You are now a member of ${community?.name}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error joining community',
        description: error.message,
      });
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || (!newPostTitle.trim() && !newPostContent.trim())) return;

    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          community_id: id,
          user_id: user.id,
          title: newPostTitle.trim() || null,
          content: newPostContent.trim()
        });

      if (error) throw error;

      setNewPostTitle('');
      setNewPostContent('');
      fetchCommunityData();
      toast({
        title: 'Post created!',
        description: 'Your post has been shared in the community.',
      });
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

  useEffect(() => {
    fetchCommunityData();

    // Set up real-time subscription for community posts
    if (id) {
      const channel = supabase
        .channel(`community_posts_${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'community_posts',
            filter: `community_id=eq.${id}`
          },
          () => {
            fetchCommunityData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, user]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p>Community not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Community Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{community.name}</h1>
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                {members.length} members
              </Badge>
            </div>
            <p className="text-muted-foreground mb-4">{community.description}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Created by</span>
              <Avatar className="w-5 h-5">
                <AvatarImage src={community.profiles?.avatar_url} />
                <AvatarFallback>{community.profiles?.display_name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{community.profiles?.display_name}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {user && !isMember && (
              <Button onClick={handleJoinCommunity}>
                Join Community
              </Button>
            )}
            {isMember && (
              <Badge variant="default">Member</Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Post Form (for members only) */}
          {isMember && (
            <Card className="p-4">
              <form onSubmit={handleCreatePost} className="space-y-4">
                <Input
                  placeholder="Post title (optional)"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  maxLength={200}
                />
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-[100px]"
                  maxLength={1000}
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {1000 - newPostContent.length} characters remaining
                  </span>
                  <Button 
                    type="submit" 
                    disabled={(!newPostTitle.trim() && !newPostContent.trim()) || isPosting}
                  >
                    {isPosting ? 'Posting...' : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Post
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Posts */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback>{post.profiles?.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{post.profiles?.display_name}</span>
                        <span className="text-sm text-muted-foreground">@{post.profiles?.username}</span>
                        {post.profiles?.is_verified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                        {post.pinned && (
                          <Badge variant="default" className="text-xs">
                            <Pin className="w-3 h-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {post.title && (
                        <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                      )}
                      <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <img 
                          src={post.image_url} 
                          alt="Post image" 
                          className="mt-3 rounded-lg max-w-full h-auto"
                        />
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Community Info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">About Community</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Members</span>
                <span className="font-medium">{members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posts</span>
                <span className="font-medium">{posts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(community.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Recent Members */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Recent Members</h3>
            <div className="space-y-3">
              {members.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.profiles?.avatar_url} />
                    <AvatarFallback>{member.profiles?.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.profiles?.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{member.profiles?.username}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;