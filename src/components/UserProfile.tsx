import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Calendar, Users, Shield, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import PostCard from './PostCard';
import FollowButton from './FollowButton';
import ReportDialog from './ReportDialog';

interface UserProfileProps {
  userId: string;
  onStartConversation?: (user: any) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onStartConversation }) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
    fetchUserPosts();
    fetchUserCommunities();
    fetchFollowData();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading profile',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url, is_verified),
          post_interactions (interaction_type)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchUserCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          role,
          communities (id, name, description)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setCommunities(data || []);
    } catch (error: any) {
      console.error('Error fetching communities:', error);
    }
  };

  const fetchFollowData = async () => {
    try {
      // Fetch followers
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles:follower_id (username, display_name, avatar_url)
        `)
        .eq('following_id', userId);

      if (followersError) throw followersError;

      // Fetch following
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles:following_id (username, display_name, avatar_url)
        `)
        .eq('follower_id', userId);

      if (followingError) throw followingError;

      setFollowers(followersData || []);
      setFollowing(followingData || []);
      setStats({
        followers: followersData?.length || 0,
        following: followingData?.length || 0,
        posts: posts.length
      });
    } catch (error: any) {
      console.error('Error fetching follow data:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-medium mb-2">User not found</h3>
            <p className="text-muted-foreground">This user profile does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="w-24 h-24 mx-auto sm:mx-0">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl">
                {profile.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <div className="flex items-center space-x-2 justify-center sm:justify-start mb-2 sm:mb-0">
                  <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                  {profile.is_verified && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                  {profile.is_moderator && (
                    <Shield className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                
                {!isOwnProfile && (
                  <div className="flex space-x-2">
                    <FollowButton targetUserId={profile.user_id} />
                    <Button
                      onClick={() => onStartConversation?.(profile)}
                      className="flex items-center space-x-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Message</span>
                    </Button>
                    <ReportDialog reportedUserId={profile.user_id} />
                  </div>
                )}
              </div>
              
              <p className="text-muted-foreground mb-2">@{profile.username}</p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                <Badge variant="outline">{profile.user_type}</Badge>
                {profile.is_moderator && <Badge variant="secondary">Moderator</Badge>}
                {profile.is_verified && <Badge>Verified</Badge>}
              </div>
              
              {profile.bio && (
                <p className="text-muted-foreground mb-4">{profile.bio}</p>
              )}
              
              <div className="flex justify-center sm:justify-start items-center space-x-6 text-sm text-muted-foreground mb-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{stats.posts}</p>
                  <p>Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{stats.followers}</p>
                  <p>Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">{stats.following}</p>
                  <p>Following</p>
                </div>
              </div>
              
              <div className="flex justify-center sm:justify-start items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="posts">Posts ({stats.posts})</TabsTrigger>
          <TabsTrigger value="followers">Followers ({stats.followers})</TabsTrigger>
          <TabsTrigger value="following">Following ({stats.following})</TabsTrigger>
          <TabsTrigger value="communities">Communities ({communities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                <p className="text-muted-foreground text-center">
                  {isOwnProfile ? "You haven't shared anything yet." : "This user hasn't shared anything yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={fetchUserPosts}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="followers" className="space-y-4">
          {followers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No followers yet</h3>
                <p className="text-muted-foreground text-center">
                  {isOwnProfile ? "You don't have any followers yet." : "This user doesn't have any followers yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {followers.map((follower) => (
                <Card key={follower.follower_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={follower.profiles?.avatar_url} />
                          <AvatarFallback>
                            {follower.profiles?.display_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{follower.profiles?.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{follower.profiles?.username}</p>
                        </div>
                      </div>
                      <FollowButton targetUserId={follower.follower_id} size="sm" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="space-y-4">
          {following.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Not following anyone</h3>
                <p className="text-muted-foreground text-center">
                  {isOwnProfile ? "You're not following anyone yet." : "This user isn't following anyone yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {following.map((followed) => (
                <Card key={followed.following_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={followed.profiles?.avatar_url} />
                          <AvatarFallback>
                            {followed.profiles?.display_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{followed.profiles?.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{followed.profiles?.username}</p>
                        </div>
                      </div>
                      <FollowButton targetUserId={followed.following_id} size="sm" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="communities" className="space-y-4">
          {communities.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No communities</h3>
                <p className="text-muted-foreground text-center">
                  {isOwnProfile ? "You haven't joined any communities yet." : "This user hasn't joined any communities yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {communities.map((membership) => (
                <Card key={membership.communities.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{membership.communities.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {membership.communities.description}
                        </p>
                      </div>
                      <Badge variant={membership.role === 'admin' ? 'default' : 'secondary'}>
                        {membership.role}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfile;