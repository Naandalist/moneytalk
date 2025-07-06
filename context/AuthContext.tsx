import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    isFirstTimeUser: boolean;
    setIsFirstTimeUser: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);

                if (event === 'SIGNED_IN' && session?.user) {
                    // Store user ID for cloud backup
                    await AsyncStorage.setItem('supabase_user_id', session.user.id);
                    // Clear any existing device user ID to prevent confusion
                    await AsyncStorage.removeItem('device_user_id');
                    // Create user profile in database
                    await createUserProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    // Clear stored user ID
                    await AsyncStorage.removeItem('supabase_user_id');
                }
            }
        );

        // Check if this is a first-time user (no transactions saved yet)
        checkFirstTimeUser();

        return () => subscription.unsubscribe();
    }, []);

    const checkFirstTimeUser = async () => {
        try {
            const hasTransactions = await AsyncStorage.getItem('has_saved_transactions');
            setIsFirstTimeUser(!hasTransactions);
        } catch (error) {
            console.error('Error checking first time user:', error);
            setIsFirstTimeUser(true);
        }
    };

    const createUserProfile = async (userId: string) => {
        try {
            console.log('Creating user profile for:', userId);
            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    id: userId,
                    created_at: new Date().toISOString(),
                    timezone: 'Asia/Jakarta',
                    last_sync: new Date().toISOString(),
                });

            if (error && error.code !== '23505') { // Ignore duplicate key error
                console.error('Error creating user profile:', error);
            } else {
                console.log('User profile created successfully');
            }
        } catch (error) {
            console.error('Error creating user profile:', error);
        }
    };

    /**
     * Sign up a new user without email confirmation requirement
     * Users can log in immediately after account creation
     */
    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: undefined, // Disable email confirmation
            }
        });
        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        isFirstTimeUser,
        setIsFirstTimeUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}