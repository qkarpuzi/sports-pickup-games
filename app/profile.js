import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [myGames, setMyGames] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchMyGames();
    }
  }, [user]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }

  async function fetchMyGames() {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('created_by', user.id)
        .order('dt', { ascending: true });

      if (error) throw error;
      setMyGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  }

  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Please login to view your profile</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <Text style={styles.title}>Your Profile</Text>
        <Text style={styles.label}>Display Name:</Text>
        <Text style={styles.value}>{profile?.display_name || 'Anonymous'}</Text>
        
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user.email || 'N/A'}</Text>

        <Text style={styles.label}>Games Created:</Text>
        <Text style={styles.value}>{myGames.length}</Text>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});