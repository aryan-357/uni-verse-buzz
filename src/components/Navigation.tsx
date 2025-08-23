import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, MessageCircle, Users, Settings, LogOut, Search, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navigation = () => {
  const { signOut } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Explore', href: '/explore' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: MessageCircle, label: 'Messages', href: '/messages' },
    { icon: Users, label: 'Communities', href: '/communities' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-4 z-10">
      <div className="flex flex-col h-full">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-primary">School Social</h1>
        </div>
        
        <div className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Button variant="ghost" className="w-full justify-start" size="lg">
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
        
        <div className="pt-4 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={signOut}
            className="w-full justify-start text-destructive hover:text-destructive"
            size="lg"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;