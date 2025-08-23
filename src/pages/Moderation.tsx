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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, Ban, Clock, Volume2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import PostCard from '@/components/PostCard';

const Moderation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reportedPosts, setReportedPosts] = useState<any[]>([]);
  const [reportedUsers, setReportedUsers] = useState<any[]>([]);
  const [moderationActions, setModerationActions] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionForm, setActionForm] = useState({
    action_type: 'mute',
    reason: '',
    expires_at: ''
  });
  const [showActionDialog, setShowActionDialog] = useState(false);

  useEffect(() => {
    fetchReportedContent();
    fetchModerationActions();
  }, []);

  const fetchReportedContent = async () => {
    try {
      // For now, we'll simulate reported posts by fetching posts with many interactions
      // In a real app, you'd have a reports table
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, display_name, avatar_url, user_type),
          post_interactions (interaction_type)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Simulate some posts being reported
      const reportedPosts = (posts || []).slice(0, 5).map(post => ({
        ...post,
        report_reason: 'Inappropriate content',
        report_count: Math.floor(Math.random() * 5) + 1,
        reporter: 'Anonymous User'
      }));

      setReportedPosts(reportedPosts);

      // Simulate reported users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

      if (usersError) throw usersError;

      const reportedUsers = (users || []).slice(0, 3).map(user => ({
        ...user,
        report_reason: 'Spam or harassment',
        report_count: Math.floor(Math.random() * 3) + 1,
        reporter: 'Multiple Users'
      }));

      setReportedUsers(reportedUsers);
    } catch (error: any) {
      console.error('Error fetching reported content:', error);
    }
  };

  const fetchModerationActions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_moderation')
        .select(`
          *,
          user:user_id (username, display_name, avatar_url),
          moderator:moderator_id (username, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setModerationActions(data || []);
    } catch (error: any) {
      console.error('Error fetching moderation actions:', error);
    }
  };

  const takeAction = async () => {
    if (!selectedUser || !actionForm.reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a user and provide a reason.',
      });
      return;
    }

    try {
      const actionData = {
        user_id: selectedUser.user_id,
        moderator_id: user?.id,
        action_type: actionForm.action_type,
        reason: actionForm.reason,
        expires_at: actionForm.expires_at ? new Date(actionForm.expires_at).toISOString() : null
      };

      const { error } = await supabase
        .from('user_moderation')
        .insert(actionData);

      if (error) throw error;

      setShowActionDialog(false);
      setSelectedUser(null);
      setActionForm({
        action_type: 'mute',
        reason: '',
        expires_at: ''
      });

      fetchModerationActions();

      toast({
        title: 'Action taken',
        description: `${actionForm.action_type} action has been applied to the user.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error taking action',
        description: error.message,
      });
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'mute':
        return <Volume2 className="w-4 h-4 text-yellow-500" />;
      case 'suspend':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'ban':
        return <Ban className="w-4 h-4 text-red-500" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getSeverityBadge = (count: number) => {
    if (count >= 5) return <Badge variant="destructive">High</Badge>;
    if (count >= 3) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Shield className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Moderation Dashboard</h1>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Reports ({reportedPosts.length + reportedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Shield className="w-4 h-4 mr-2" />
            Recent Actions ({moderationActions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Reported Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Reported Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportedPosts.map((post) => (
                  <Card key={post.id} className="border-l-4 border-l-destructive">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="font-medium">Report: {post.report_reason}</span>
                        </div>
                        {getSeverityBadge(post.report_count)}
                      </div>
                      
                      <PostCard post={post} />
                      
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                        <Button size="sm" variant="destructive">
                          Remove Post
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            setSelectedUser(post.profiles);
                            setShowActionDialog(true);
                          }}
                        >
                          Action User
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* Reported Users */}
            <Card>
              <CardHeader>
                <CardTitle>Reported Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportedUsers.map((user) => (
                  <Card key={user.id} className="border-l-4 border-l-destructive">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="font-medium">Report: {user.report_reason}</span>
                        </div>
                        {getSeverityBadge(user.report_count)}
                      </div>
                      
                      <div className="flex items-center space-x-3 mb-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>{user.display_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.display_name}</p>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                          <Badge variant="outline">{user.user_type}</Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        Reported by: {user.reporter} • {user.report_count} reports
                      </p>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          View Profile
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowActionDialog(true);
                          }}
                        >
                          Take Action
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Moderation Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {moderationActions.map((action) => (
                <Card key={action.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getActionIcon(action.action_type)}
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={action.user?.avatar_url} />
                          <AvatarFallback>{action.user?.display_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {action.user?.display_name} was {action.action_type}d
                          </p>
                          <p className="text-sm text-muted-foreground">
                            by {action.moderator?.display_name} • 
                            {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        action.action_type === 'ban' ? 'destructive' :
                        action.action_type === 'suspend' ? 'secondary' : 'outline'
                      }>
                        {action.action_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 ml-11">
                      Reason: {action.reason}
                    </p>
                    {action.expires_at && (
                      <p className="text-xs text-muted-foreground mt-1 ml-11">
                        Expires: {formatDistanceToNow(new Date(action.expires_at), { addSuffix: true })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Moderation Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="flex items-center space-x-3 p-3 bg-muted rounded">
                <Avatar>
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback>{selectedUser.display_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select 
                value={actionForm.action_type} 
                onValueChange={(value) => setActionForm({ ...actionForm, action_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mute">Mute (Can't post for a period)</SelectItem>
                  <SelectItem value="suspend">Suspend (Temporary ban)</SelectItem>
                  <SelectItem value="ban">Ban (Permanent ban)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={actionForm.reason}
                onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
                placeholder="Describe the reason for this action..."
              />
            </div>

            {actionForm.action_type !== 'ban' && (
              <div className="space-y-2">
                <Label>Expires At (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={actionForm.expires_at}
                  onChange={(e) => setActionForm({ ...actionForm, expires_at: e.target.value })}
                />
              </div>
            )}

            <div className="flex space-x-2">
              <Button onClick={takeAction} variant="destructive" className="flex-1">
                Apply {actionForm.action_type}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowActionDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Moderation;