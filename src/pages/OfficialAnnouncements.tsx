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
import { Separator } from '@/components/ui/separator';
import { Send, Megaphone, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const OfficialAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isPosting, setIsPosting] = useState(false);

  const isStaff = userProfile?.user_type === 'staff' || userProfile?.is_moderator;

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
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

      await fetchAnnouncements();
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles!announcements_user_id_fkey (
            username,
            display_name,
            avatar_url,
            user_type
          )
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim() || !user) return;

    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
          content: newContent.trim(),
          priority: priority
        });

      if (error) throw error;

      setNewTitle('');
      setNewContent('');
      setPriority('normal');
      
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') {
      return <AlertCircle className="w-4 h-4" />;
    }
    return <Megaphone className="w-4 h-4" />;
  };

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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <header className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Megaphone className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Official Announcements</h1>
        </div>
        <p className="text-muted-foreground">
          Important updates and notices from the administration
        </p>
      </header>

      {/* Create Announcement Form (Staff Only) */}
      {isStaff && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Announcement</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Announcement title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>
            
            <Textarea
              placeholder="Write your announcement content..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[120px]"
              maxLength={2000}
            />
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {2000 - newContent.length} characters remaining
              </span>
              <Button 
                onClick={handleCreateAnnouncement}
                disabled={!newTitle.trim() || !newContent.trim() || isPosting}
              >
                {isPosting ? 'Publishing...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish Announcement
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="p-8 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No announcements yet</h3>
            <p className="text-muted-foreground">
              Check back later for important updates and notices.
            </p>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${getPriorityColor(announcement.priority)} text-white`}>
                  {getPriorityIcon(announcement.priority)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{announcement.title}</h3>
                    <Badge variant={announcement.priority === 'high' ? 'destructive' : 'secondary'}>
                      {announcement.priority} priority
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={announcement.profiles?.avatar_url} />
                      <AvatarFallback>{announcement.profiles?.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span>By {announcement.profiles?.display_name}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{announcement.content}</p>
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

export default OfficialAnnouncements;