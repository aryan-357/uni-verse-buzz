import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Search, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id!inner (username, display_name, avatar_url),
          recipient:recipient_id!inner (username, display_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation
      const grouped = new Map();
      data?.forEach((message) => {
        const otherUser = message.sender_id === user?.id ? message.recipient : message.sender;
        const key = [message.sender_id, message.recipient_id].sort().join('-');
        
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            other_user: otherUser,
            last_message: message,
            unread_count: 0
          });
        }

        if (message.recipient_id === user?.id && !message.is_read) {
          grouped.get(key).unread_count++;
        }
      });

      setConversations(Array.from(grouped.values()));
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!conversationId || !user?.id) return;
    
    try {
      const userIds = conversationId.split('-');
      if (userIds.length !== 2) return;
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id!inner (username, display_name, avatar_url)
        `)
        .or(`and(sender_id.eq.${userIds[0]},recipient_id.eq.${userIds[1]}),and(sender_id.eq.${userIds[1]},recipient_id.eq.${userIds[0]})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      const userIds = conversationId.split('-');
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', user?.id)
        .in('sender_id', userIds);
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const recipientId = selectedConversation.id.split('-').find((id: string) => id !== user?.id);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          recipient_id: recipientId,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to send message',
        description: error.message,
      });
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Error searching users:', error);
    }
  };

  const startConversation = (targetUser: any) => {
    const conversationId = [user?.id, targetUser.user_id].sort().join('-');
    setSelectedConversation({
      id: conversationId,
      other_user: targetUser
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="flex flex-col animate-slide-up">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                />
                <Button size="sm" onClick={searchUsers}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 p-1 hover:bg-muted rounded cursor-pointer"
                      onClick={() => startConversation(user)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.display_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.display_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-center space-x-3 p-2 rounded cursor-pointer hover:bg-muted ${
                  selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <Avatar>
                  <AvatarImage src={conversation.other_user?.avatar_url} />
                  <AvatarFallback>{conversation.other_user?.display_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium truncate">{conversation.other_user?.display_name}</p>
                    {conversation.unread_count > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message?.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.last_message?.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <div className="md:col-span-2">
          {selectedConversation ? (
            <Card className="flex flex-col h-full animate-slide-in-right">
              <CardHeader className="border-b">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={selectedConversation.other_user?.avatar_url} />
                    <AvatarFallback>{selectedConversation.other_user?.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedConversation.other_user?.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{selectedConversation.other_user?.username}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </CardContent>
              
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">Choose a conversation to start messaging</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;