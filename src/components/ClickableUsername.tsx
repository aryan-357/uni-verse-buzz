import React from 'react';
import { Link } from 'react-router-dom';

interface ClickableUsernameProps {
  userId: string;
  username: string;
  displayName?: string;
  className?: string;
}

const ClickableUsername: React.FC<ClickableUsernameProps> = ({
  userId,
  username,
  displayName,
  className = ""
}) => {
  return (
    <Link 
      to={`/profile/${userId}`}
      className={`hover:underline transition-colors hover:text-primary ${className}`}
    >
      {displayName || username}
    </Link>
  );
};

export default ClickableUsername;