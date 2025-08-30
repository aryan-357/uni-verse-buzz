import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Users, UserPlus, Crown, Shield } from 'lucide-react';

interface CommunityAdminPanelProps {
  community: any;
  members: any[];
  isCreator: boolean;
  onRefresh: () => void;
}

const CommunityAdminPanel: React.FC<CommunityAdminPanelProps> = ({
  community,
  members,
  isCreator,
  onRefresh
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newDescription, setNewDescription] = useState(community?.description || '');
  const [loading, setLoading] = useState(false);

  const updateCommunityInfo = async () => {
    if (!user || !community) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          description: newDescription.trim()
        })
        .eq('id', community.id);

      if (error) throw error;

      toast({
        title: 'Community updated!',
        description: 'Community information has been updated successfully.',
      });

      onRefresh();
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating community',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const promoteMember = async (memberId: string, newRole: string) => {
    if (!user || !community) return;

    try {
      const { error } = await supabase
        .from('community_members')
        .update({ role: newRole })
        .eq('community_id', community.id)
        .eq('user_id', memberId);

      if (error) throw error;

      toast({
        title: 'Member role updated!',
        description: `Member has been promoted to ${newRole}.`,
      });

      onRefresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating member role',
        description: error.message,
      });
    }
  };

  const removeMember = async (memberId: string) => {
    if (!user || !community) return;

    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', community.id)
        .eq('user_id', memberId);

      if (error) throw error;

      toast({
        title: 'Member removed',
        description: 'Member has been removed from the community.',
      });

      onRefresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error removing member',
        description: error.message,
      });
    }
  };

  const getUserRole = (memberId: string) => {
    const member = members.find(m => m.user_id === memberId);
    return member?.role || 'member';
  };

  const canManageMembers = isCreator || getUserRole(user?.id) === 'admin';

  if (!canManageMembers) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Manage Community
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Community Administration
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Community Settings */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Community Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Community description..."
                  className="mt-1"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {500 - newDescription.length} characters remaining
                </p>
              </div>
              <Button onClick={updateCommunityInfo} disabled={loading}>
                {loading ? 'Updating...' : 'Update Settings'}
              </Button>
            </div>
          </Card>

          {/* Member Management */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Member Management ({members.length} members)
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const isMemberCreator = member.user_id === community.created_by;
                
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.profiles?.avatar_url} />
                        <AvatarFallback>{member.profiles?.display_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profiles?.display_name}</p>
                        <p className="text-sm text-muted-foreground">@{member.profiles?.username}</p>
                      </div>
                      <div className="flex gap-1">
                        {isMemberCreator && (
                          <Badge variant="default">
                            <Crown className="w-3 h-3 mr-1" />
                            Creator
                          </Badge>
                        )}
                        {member.role === 'admin' && !isMemberCreator && (
                          <Badge variant="secondary">Admin</Badge>
                        )}
                        {member.role === 'moderator' && (
                          <Badge variant="outline">Moderator</Badge>
                        )}
                      </div>
                    </div>
                    
                    {!isCurrentUser && !isMemberCreator && isCreator && (
                      <div className="flex gap-2">
                        <Select 
                          value={member.role} 
                          onValueChange={(newRole) => promoteMember(member.user_id, newRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMember(member.user_id)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommunityAdminPanel;