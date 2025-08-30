import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Eye, Trash2, UserX, Clock, CheckCircle, XCircle, Shield, User, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const EnhancedModeration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [moderationActions, setModerationActions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionTarget, setActionTarget] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expirationDays, setExpirationDays] = useState('');

  const isModerator = userProfile?.is_moderator || userProfile?.user_type === 'staff' || userProfile?.user_type === 'admin';

  const fetchData = async () => {
    try {
      // Fetch user profile
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setUserProfile(profileData);
      }

      // Fetch reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select(`
          *,
          reported_user_profile:reported_user_id(username, display_name, avatar_url),
          reporter_profile:reporter_id(username, display_name, avatar_url),
          reported_post:reported_post_id(content, created_at)
        `)
        .order('created_at', { ascending: false });

      setReports(reportsData || []);

      // Fetch moderation actions
      const { data: actionsData } = await supabase
        .from('user_moderation')
        .select(`
          *,
          target_user:user_id(username, display_name, avatar_url),
          moderator:moderator_id(username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      setModerationActions(actionsData || []);

      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setUsers(usersData || []);

      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id(username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setPosts(postsData || []);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading moderation data',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async () => {
    if (!user || !actionTarget || !selectedAction) return;

    try {
      const actionData: any = {
        user_id: actionTarget.user_id || actionTarget.id,
        moderator_id: user.id,
        action_type: selectedAction,
        reason: actionReason
      };

      if (expirationDays && ['mute', 'suspend'].includes(selectedAction)) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + parseInt(expirationDays));
        actionData.expires_at = expirationDate.toISOString();
      }

      const { error } = await supabase
        .from('user_moderation')
        .insert(actionData);

      if (error) throw error;

      // If banning or suspending, also update the user profile
      if (['ban', 'suspend'].includes(selectedAction)) {
        // You could add a banned/suspended flag to profiles table if needed
      }

      toast({
        title: 'Moderation action taken',
        description: `${selectedAction} action applied to user.`,
      });

      setIsDialogOpen(false);
      resetActionForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error taking moderation action',
        description: error.message,
      });
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Report resolved',
        description: 'The report has been marked as resolved.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error resolving report',
        description: error.message,
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Create moderation log
      await supabase
        .from('user_moderation')
        .insert({
          user_id: posts.find(p => p.id === postId)?.user_id,
          moderator_id: user?.id,
          action_type: 'delete_post',
          reason: 'Post deleted by moderator'
        });

      toast({
        title: 'Post deleted',
        description: 'The post has been removed.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting post',
        description: error.message,
      });
    }
  };

  const resetActionForm = () => {
    setSelectedAction('');
    setActionReason('');
    setActionTarget(null);
    setExpirationDays('');
  };

  const openActionDialog = (target: any) => {
    setActionTarget(target);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isModerator) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access the moderation panel.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Moderation Dashboard</h1>
        </div>
        <p className="text-muted-foreground">Manage reports and moderate content</p>
      </header>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reports">Reports ({reports.filter(r => r.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="actions">Recent Actions</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="posts">Post Management</TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {reports.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No reports to review.</p>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
                      {report.status}
                    </Badge>
                    <Badge variant="outline">{report.report_type}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="font-medium">Reason: {report.reason}</p>
                  </div>

                  {report.reported_user_id && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Reported User:</span>
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={report.reported_user_profile?.avatar_url} />
                        <AvatarFallback>{report.reported_user_profile?.display_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span>{report.reported_user_profile?.display_name}</span>
                    </div>
                  )}

                  {report.reported_post_id && (
                    <div className="bg-muted p-3 rounded">
                      <p className="text-sm">Reported Post:</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.reported_post?.content}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Reporter:</span>
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={report.reporter_profile?.avatar_url} />
                      <AvatarFallback>{report.reporter_profile?.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span>{report.reporter_profile?.display_name}</span>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={() => handleResolveReport(report.id)}
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolve
                      </Button>
                      {report.reported_user_id && (
                        <Button 
                          variant="outline"
                          onClick={() => openActionDialog({ 
                            user_id: report.reported_user_id,
                            ...report.reported_user_profile 
                          })}
                          size="sm"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Take Action
                        </Button>
                      )}
                      {report.reported_post_id && (
                        <Button 
                          variant="destructive"
                          onClick={() => handleDeletePost(report.reported_post_id)}
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Post
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          {moderationActions.map((action) => (
            <Card key={action.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{action.action_type}</Badge>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={action.target_user?.avatar_url} />
                      <AvatarFallback>{action.target_user?.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{action.target_user?.display_name}</span>
                  </div>
                  <span className="text-muted-foreground">by</span>
                  <span className="font-medium">{action.moderator?.display_name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                </span>
              </div>
              {action.reason && (
                <p className="text-sm text-muted-foreground mt-2">Reason: {action.reason}</p>
              )}
              {action.expires_at && (
                <p className="text-sm text-muted-foreground">
                  Expires: {new Date(action.expires_at).toLocaleDateString()}
                </p>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                    <Badge variant="outline">{user.user_type}</Badge>
                    {user.is_verified && <Badge variant="default">Verified</Badge>}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openActionDialog(user)}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Moderate
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          <div className="grid gap-4">
            {posts.map((post) => (
              <Card key={post.id} className="p-4">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={post.profiles?.avatar_url} />
                    <AvatarFallback>{post.profiles?.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{post.profiles?.display_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mb-3">{post.content}</p>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Moderation Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Moderation Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionTarget && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded">
                <Avatar>
                  <AvatarImage src={actionTarget.avatar_url} />
                  <AvatarFallback>{actionTarget.display_name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{actionTarget.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{actionTarget.username}</p>
                </div>
              </div>
            )}

            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="mute">Mute</SelectItem>
                <SelectItem value="suspend">Suspend</SelectItem>
                <SelectItem value="ban">Ban</SelectItem>
              </SelectContent>
            </Select>

            {['mute', 'suspend'].includes(selectedAction) && (
              <Input
                placeholder="Duration in days"
                type="number"
                value={expirationDays}
                onChange={(e) => setExpirationDays(e.target.value)}
              />
            )}

            <Textarea
              placeholder="Reason for this action"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />

            <div className="flex gap-2">
              <Button onClick={handleModerationAction} disabled={!selectedAction}>
                Apply Action
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedModeration;