'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SessionUser } from '@/types';

interface SessionContextType {
  currentUser: SessionUser;
  availableUsers: SessionUser[];
  loading: boolean;
  switchRole: (userId: string) => Promise<void>;
  switchToRoleName: (roleName: string) => Promise<void>;
}

const defaultAdminUser: SessionUser = {
  id: 'usr_admin',
  email: 'admin@furora.com',
  name: 'Ganesan (Admin)',
  role: 'ADMIN',
};

const SessionContext = createContext<SessionContextType>({
  currentUser: defaultAdminUser,
  availableUsers: [defaultAdminUser],
  loading: false,
  switchRole: async () => {},
  switchToRoleName: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser>(defaultAdminUser);
  const [availableUsers, setAvailableUsers] = useState<SessionUser[]>([defaultAdminUser]);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        if (data.availableUsers) {
          setAvailableUsers(data.availableUsers);
        }
      }
    } catch (e) {
      console.error('Session fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const switchRole = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        let targetUrl = '/admin';
        if (data.user.role === 'VENDOR') targetUrl = '/vendor';
        else if (data.user.role === 'DELIVERY_AGENT') targetUrl = '/agent';
        else if (data.user.role === 'SALES') targetUrl = '/sales';
        else if (data.user.role === 'CUSTOMER') targetUrl = '/customer/order';
        window.location.href = targetUrl;
      }
    } catch (e) {
      console.error('Failed to switch user:', e);
    }
  };

  const switchToRoleName = async (roleName: string) => {
    const target = availableUsers.find((u) => u.role === roleName);
    if (target) {
      await switchRole(target.id);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        currentUser,
        availableUsers,
        loading,
        switchRole,
        switchToRoleName,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
