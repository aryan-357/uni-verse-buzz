import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, AlertTriangle, Info, AlertCircle, Send } from 'lucide-react';

const Announcements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [isPosting, setIsPosting] = useState(false);

  const canCreateAnnouncements = userProfile?.is_moderator || userProfile?.user_type === 'staff' || userProfile?.user_type === 'admin';

  const fetchData = async () => {
    try {
      // Fetch user profile
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;
        setUserProfile(profileData);
      }

      // Fetch announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            user_type,
            is_moderator
          )
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;
      setAnnouncements(announcementsData || []);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading announcements',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim() || !newContent.trim()) return;

    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
          content: newContent.trim(),
          priority: newPriority
        });

      if (error) throw error;

      setNewTitle('');
      setNewContent('');
      setNewPriority('normal');
      fetchData();
      toast({
        title: 'Announcement created!',
        description: 'Your announcement has been published.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating announcement',
        description: error.message,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      case 'normal':
        return <Info className="w-4 h-4" />;
      case 'low':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'normal':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscription
    const channel = supabase
      .channel('announcements_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Official Announcements</h1>
        </div>
        <p className="text-muted-foreground">
          Important notices and updates from the administration
        </p>
      </header>

      {/* Create Announcement Form (Staff Only) */}
      {canCreateAnnouncements && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Announcement</h2>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <Input
              placeholder="Announcement title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={200}
              required
            />
            <Textarea
              placeholder="Announcement content"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[120px]"
              maxLength={2000}
              required
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Priority:</label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1"></div>
              <Button 
                type="submit" 
                disabled={!newTitle.trim() || !newContent.trim() || isPosting}
              >
                {isPosting ? 'Publishing...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="p-8 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No announcements yet.</p>
          </Card>
        ) : (
          announcements.map((announcement, index) => (
            <Card key={announcement.id} 
              className={`p-6 animate-fade-in ${
                announcement.priority === 'urgent' ? 'border-destructive' : 
                announcement.priority === 'high' ? 'border-primary' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <Avatar>
                  <AvatarImage src={announcement.profiles?.avatar_url} />
                  <AvatarFallback>{announcement.profiles?.display_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold">{announcement.title}</h3>
                    <Badge 
                      variant={getPriorityVariant(announcement.priority)}
                      className="flex items-center gap-1"
                    >
                      {getPriorityIcon(announcement.priority)}
                      {announcement.priority}
                    </Badge>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {announcement.content}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>By</span>
                      <span className="font-medium">{announcement.profiles?.display_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {announcement.profiles?.user_type === 'staff' ? 'Staff' : 
                         announcement.profiles?.is_moderator ? 'Moderator' : 'Admin'}
                      </Badge>
                    </div>
                    <span>•</span>
                    <span>{new Date(announcement.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                    {announcement.updated_at !== announcement.created_at && (
                      <>
                        <span>•</span>
                        <span className="italic">
                          Updated {new Date(announcement.updated_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Announcements;