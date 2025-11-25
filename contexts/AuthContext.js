import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  console.log('AuthProvider is rendering!'); // Debug log
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email, password, displayName) {
    console.log('Starting sign up...', email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Auth signup error:', error);
      throw error;
    }

    console.log('User created:', data.user);

    // Create user profile
    if (data.user) {
      console.log('Creating profile for user:', data.user.id);
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          { id: data.user.id, display_name: displayName }
        ])
        .select();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }
      
      console.log('Profile created:', profileData);
    }

    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Return safe defaults instead of throwing
    console.warn('useAuth called outside AuthProvider, returning defaults');
    return {
      user: null,
      loading: true,
      signUp: async () => { throw new Error('AuthProvider not loaded'); },
      signIn: async () => { throw new Error('AuthProvider not loaded'); },
      signOut: async () => { throw new Error('AuthProvider not loaded'); },
    };
  }
  return context;
}