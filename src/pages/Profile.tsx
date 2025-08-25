import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartConversation = (targetUser: any) => {
    navigate('/messages', { state: { startConversation: targetUser } });
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <UserProfile
      userId={user.id}
      onStartConversation={handleStartConversation}
    />
  );
};

export default Profile;