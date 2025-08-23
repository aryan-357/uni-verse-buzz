import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Users, UserPlus, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Notifications = () => {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'like',
      actor: { name: 'Sarah Johnson', username: 'sarah_j', avatar: '' },
      content: 'liked your post about the upcoming school festival',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false
    },
    {
      id: '2',
      type: 'comment',
      actor: { name: 'Mike Chen', username: 'mike_c', avatar: '' },
      content: 'commented on your post: "This looks amazing! Can\'t wait to participate."',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      read: false
    },
    {
      id: '3',
      type: 'follow',
      actor: { name: 'Emma Wilson', username: 'emma_w', avatar: '' },
      content: 'started following you',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '4',
      type: 'community',
      actor: { name: 'Photography Club', username: 'photo_club', avatar: '' },
      content: 'You have been added to Photography Club',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '5',
      type: 'mention',
      actor: { name: 'Alex Rodriguez', username: 'alex_r', avatar: '' },
      content: 'mentioned you in a post about the science fair',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      read: true
    }
  ]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
      case 'mention':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'community':
        return <Users className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const allNotifications = notifications;
  const unreadNotifications = notifications.filter(n => !n.read);

  const NotificationItem = ({ notification }: { notification: any }) => (
    <Card 
      className={`cursor-pointer transition-colors ${
        !notification.read ? 'bg-accent/50 border-l-4 border-l-primary' : 'hover:bg-muted/50'
      }`}
      onClick={() => markAsRead(notification.id)}
    >
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={notification.actor.avatar} />
            <AvatarFallback>
              {notification.actor.name.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                {getNotificationIcon(notification.type)}
                <span className="font-medium">{notification.actor.name}</span>
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mt-1">
              {notification.content}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <span>All</span>
            <Badge variant="secondary">{allNotifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center space-x-2">
            <span>Unread</span>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {allNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
                <p className="text-muted-foreground text-center">
                  When someone interacts with your posts or follows you, you'll see it here.
                </p>
              </CardContent>
            </Card>
          ) : (
            allNotifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-3">
          {unreadNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                <p className="text-muted-foreground text-center">
                  You have no unread notifications.
                </p>
              </CardContent>
            </Card>
          ) : (
            unreadNotifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;