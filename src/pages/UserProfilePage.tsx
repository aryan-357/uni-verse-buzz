import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserProfile from '@/components/UserProfile';

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const handleStartConversation = (targetUser: any) => {
    navigate('/messages', { state: { startConversation: targetUser } });
  };

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <p>User not found.</p>
      </div>
    );
  }

  return (
    <UserProfile
      userId={userId}
      onStartConversation={handleStartConversation}
    />
  );
};

export default UserProfilePage;