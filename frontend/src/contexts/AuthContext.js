import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';


const AuthContext = createContext();

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "http://localhost:8000/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const getAuthHeaders = (token) => ({ Authorization: `Bearer ${token}` });

  const fetchCurrentUser = async (token) => {
    const response = await axios.get(`${API}/auth/me`, {
      headers: getAuthHeaders(token)
    });

    const currentUser = {
      id: response.data.id,
      email: response.data.email,
      display_name: response.data.display_name,
      bio: response.data.bio,
      avatar_url: response.data.avatar_url
    };

    setUser(currentUser);
    setIsAdmin(Boolean(response.data.is_admin));

    return currentUser;
  };

  // Validar se o token é válido
  const validateToken = async (token) => {
    try {
      await axios.get(`${API}/auth/me`, {
        headers: getAuthHeaders(token)
      });
      return true;
    } catch (error) {
      // Token inválido ou expirado
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');

        if (token) {
          // Validar se o token ainda é válido
          const isValid = await validateToken(token);

          if (isValid) {
            setSession({ access_token: token });
            await fetchCurrentUser(token);
          } else {
            // Token expirado ou inválido, fazer logout
            localStorage.removeItem('access_token');
            setSession(null);
            setUser(null);
            setIsAdmin(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signUp = async (email, password) => {
    const response = await axios.post(`${API}/auth/signup`, { email, password });
    const { session: authSession } = response.data;

    if (authSession?.access_token) {
      localStorage.setItem('access_token', authSession.access_token);
      setSession(authSession);
      await fetchCurrentUser(authSession.access_token);
    }

    return response.data;
  };

  const signIn = async (email, password) => {
    const response = await axios.post(`${API}/auth/signin`, { email, password });
    const { session: authSession } = response.data;

    if (authSession?.access_token) {
      localStorage.setItem('access_token', authSession.access_token);
      setSession(authSession);
      await fetchCurrentUser(authSession.access_token);
    }

    return response.data;
  };

  const updateLocalProfile = (partialProfile) => {
    setUser((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        ...partialProfile
      };
    });
  };

  const signOut = async () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    updateLocalProfile,
    refreshCurrentUser: async () => {
      if (!session?.access_token) return null;
      return fetchCurrentUser(session.access_token);
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};