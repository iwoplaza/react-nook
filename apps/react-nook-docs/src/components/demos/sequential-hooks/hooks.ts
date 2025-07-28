import { useState, useEffect } from 'react';

// Simple hook that fetches a user ID after a delay
export function useUserId(delay: number) {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setUserId(Math.floor(Math.random() * 1000) + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return userId;
}

// Hook that fetches user profile based on user ID
export function useUserProfile(userId: number | null) {
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const timer = setTimeout(() => {
      setProfile({
        name: `User ${userId}`,
        email: `user${userId}@example.com`
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [userId]);

  return profile;
}

// Hook that fetches user permissions based on profile
export function useUserPermissions(profile: { name: string; email: string } | null) {
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    if (!profile) {
      setPermissions(null);
      return;
    }

    const timer = setTimeout(() => {
      const isAdmin = profile.name.includes('1') || profile.name.includes('5');
      setPermissions(isAdmin ? ['read', 'write', 'admin'] : ['read']);
    }, 300);

    return () => clearTimeout(timer);
  }, [profile]);

  return permissions;
}