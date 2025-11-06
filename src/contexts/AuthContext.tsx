import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  ready: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (e) {
      // ignore parse errors
    } finally {
      setReady(true);
    }
  }, []);

  const login = (u: User) => {
    try {
      localStorage.setItem('currentUser', JSON.stringify(u));
    } catch (e) {
      // ignore
    }
    setUser(u);
  };

  const logout = () => {
    try {
      localStorage.removeItem('currentUser');
    } catch (e) {
      // ignore
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ProtectedRoute: renders children if authenticated, otherwise redirects to /login
export const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  // Note: we import useNavigate inside component to avoid hooks usage outside Router
  const { user, ready } = useAuth();
  if (!ready) return null; // or a loader
  if (!user) return <Navigate to="/login" replace />; // redirect to login when not authenticated
  return children;
};

// RequireRole: render children only if user role matches one of allowed roles
export const RequireRole: React.FC<{ roles: string[]; children: React.ReactElement }> = ({ roles, children }) => {
  const { user, ready } = useAuth();
  const [notifiedRole, setNotifiedRole] = useState(false);
  const [notifiedUnauth, setNotifiedUnauth] = useState(false);
  if (!ready) return null;

  // If not authenticated, notify once and redirect to login
  if (!user) {
    useEffect(() => {
      if (!notifiedUnauth) {
        toast.error('Debes iniciar sesión para ver esta página.');
        setNotifiedUnauth(true);
      }
    }, [notifiedUnauth]);
    return <Navigate to="/login" replace />;
  }

  // If user doesn't have required role, show a toast once and redirect to not-authorized
  const lacksRole = !roles.includes(user.role as string);
  useEffect(() => {
    if (lacksRole && !notifiedRole) {
      toast.error('No tienes permisos para ver esa página.');
      setNotifiedRole(true);
    }
  }, [lacksRole, notifiedRole]);

  if (lacksRole) return <Navigate to="/not-authorized" replace />;

  return children;
};
