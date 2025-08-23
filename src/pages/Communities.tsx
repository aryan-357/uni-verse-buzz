import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Crown, Shield, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Communities = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [communities, setCommunities] = useState<any[]>([]);
  const [myCommunities, setMyCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [newCommunity, setNewCommunity] = useState({ name: '', description: '' });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchCommunities();
    fetchMyCommunities();
  }, [user]);

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select(`
          *,
          creator:created_by (username, display_name, avatar_url),
          community_members (id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunities(data || []);
    } catch (error: any) {
      console.error('Error fetching communities:', error);
    }
  };

  const fetchMyCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          *,
          communities (
            *,
            creator:created_by (username, display_name, avatar_url)
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;
      setMyCommunities(data?.map(item => ({ ...item.communities, member_role: item.role })) || []);
    } catch (error: any) {
      console.error('Error fetching my communities:', error);
    }
  };

  const fetchCommunityMembers = async (communityId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url, user_type)
        `)
        .eq('community_id', communityId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
    }
  };

  const createCommunity = async () => {
    if (!newCommunity.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('communities')
        .insert({
          name: newCommunity.name,
          description: newCommunity.description,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin
      await supabase
        .from('community_members')
        .insert({
          community_id: data.id,
          user_id: user?.id,
          role: 'admin'
        });

      setNewCommunity({ name: '', description: '' });
      setShowCreateDialog(false);
      fetchCommunities();
      fetchMyCommunities();

      toast({
        title: 'Community created!',
        description: 'Your new community has been created successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating community',
        description: error.message,
      });
    }
  };

  const joinCommunity = async (communityId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user?.id,
          role: 'member'
        });

      if (error) throw error;

      fetchCommunities();
      fetchMyCommunities();

      toast({
        title: 'Joined community!',
        description: 'You have successfully joined the community.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error joining community',
        description: error.message,
      });
    }
  };

  const leaveCommunity = async (communityId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user?.id);

      if (error) throw error;

      fetchCommunities();
      fetchMyCommunities();

      toast({
        title: 'Left community',
        description: 'You have left the community.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error leaving community',
        description: error.message,
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'moderator': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const isUserMember = (communityId: string) => {
    return myCommunities.some(c => c.id === communityId);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Communities</h1>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Community
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Community</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Community name"
                value={newCommunity.name}
                onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
              />
              <Textarea
                placeholder="Community description"
                value={newCommunity.description}
                onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
              />
              <Button onClick={createCommunity} className="w-full">
                Create Community
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="discover" className="space-y-4">
        <TabsList>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="my-communities">My Communities ({myCommunities.length})</TabsTrigger>
          {selectedCommunity && <TabsTrigger value="members">Members</TabsTrigger>}
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((community) => (
              <Card key={community.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedCommunity(community);
                      fetchCommunityMembers(community.id);
                    }}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>{community.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{community.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={community.creator?.avatar_url} />
                        <AvatarFallback>{community.creator?.display_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        by {community.creator?.display_name}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {community.community_members?.length || 0} members
                    </Badge>
                  </div>
                  <div className="mt-4">
                    {isUserMember(community.id) ? (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          leaveCommunity(community.id);
                        }}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          joinCommunity(community.id);
                        }}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-communities" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCommunities.map((community) => (
              <Card key={community.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedCommunity(community);
                      fetchCommunityMembers(community.id);
                    }}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>{community.name}</span>
                    <Badge variant={community.member_role === 'admin' ? 'default' : 'secondary'}>
                      {community.member_role}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{community.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {selectedCommunity && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedCommunity.name} - Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted">
                    <Avatar>
                      <AvatarImage src={member.profiles?.avatar_url} />
                      <AvatarFallback>{member.profiles?.display_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{member.profiles?.display_name}</p>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="text-sm text-muted-foreground">@{member.profiles?.username}</p>
                      <Badge variant="outline">{member.profiles?.user_type}</Badge>
                    </div>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Communities;