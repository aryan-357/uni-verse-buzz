import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface PasswordUpdateFormProps {
  onUpdate: (currentPassword: string, newPassword: string) => Promise<void>;
}

const PasswordUpdateForm: React.FC<PasswordUpdateFormProps> = ({ onUpdate }) => {
  const { toast } = useToast();
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwords.new || passwords.new.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Invalid password',
        description: 'Password must be at least 6 characters long.',
      });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      toast({
        variant: 'destructive',
        title: 'Password mismatch',
        description: 'New password and confirmation do not match.',
      });
      return;
    }

    setLoading(true);
    try {
      await onUpdate(passwords.current, passwords.new);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
      <h3 className="text-lg font-medium">Change Password</h3>
      
      <div className="space-y-2">
        <Label htmlFor="current-password">Current Password</Label>
        <Input 
          id="current-password" 
          type="password"
          value={passwords.current}
          onChange={(e) => setPasswords({...passwords, current: e.target.value})}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input 
          id="new-password" 
          type="password"
          value={passwords.new}
          onChange={(e) => setPasswords({...passwords, new: e.target.value})}
          required
          minLength={6}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <Input 
          id="confirm-password" 
          type="password"
          value={passwords.confirm}
          onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
          required
        />
      </div>
      
      <Button type="submit" variant="outline" disabled={loading}>
        {loading ? 'Updating...' : 'Update Password'}
      </Button>
    </form>
  );
};

export default PasswordUpdateForm;