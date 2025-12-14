import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [myGames, setMyGames] = useState([]);
  const [joinedGames, setJoinedGames] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchMyGames();
      fetchJoinedGames();
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
    } finally {
      setLoading(false);
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

  async function fetchJoinedGames() {
    try {
      const { data: participantData, error } = await supabase
        .from('game_participants')
        .select('game_id')
        .eq('user_id', user.id);

      if (error) throw error;

      if (participantData && participantData.length > 0) {
        const gameIds = participantData.map(p => p.game_id);
        
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select('*')
          .in('id', gameIds)
          .order('dt', { ascending: true });

        if (gamesError) throw gamesError;
        setJoinedGames(gamesData || []);
      }
    } catch (error) {
      console.error('Error fetching joined games:', error);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchProfile();
    fetchMyGames();
    fetchJoinedGames();
    setRefreshing(false);
  }

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  }

  async function uploadImage(asset) {
  setUploading(true);
  try {
    const fileName = `${user.id}-${Date.now()}.jpg`;

    // Convert base64 to Uint8Array
    const base64Data = asset.base64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    // Update user profile with image URL
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ profile_picture_url: publicUrl })
      .eq('id', user.id);

    if (updateError) throw updateError;

    Alert.alert('Success', 'Profile picture updated!');
    fetchProfile();
  } catch (error) {
    console.error('Upload error:', error);
    Alert.alert('Error', 'Failed to upload image: ' + error.message);
  } finally {
    setUploading(false);
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

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getSportEmoji(sport) {
    const sportLower = sport.toLowerCase();
    if (sportLower.includes('football') || sportLower.includes('soccer')) return '⚽';
    if (sportLower.includes('basketball')) return '🏀';
    if (sportLower.includes('tennis')) return '🎾';
    if (sportLower.includes('volleyball')) return '🏐';
    if (sportLower.includes('baseball')) return '⚾';
    return '🏃';
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.notLoggedInGradient}
        >
          <Text style={styles.notLoggedInEmoji}>🔐</Text>
          <Text style={styles.notLoggedInTitle}>Please Login</Text>
          <Text style={styles.notLoggedInText}>Login to view your profile and games</Text>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={pickImage}
          disabled={uploading}
        >
          {profile?.profile_picture_url ? (
            <Image 
              source={{ uri: profile.profile_picture_url }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Text style={styles.cameraIconText}>📷</Text>
          </View>
        </TouchableOpacity>
        {uploading && <Text style={styles.uploadingText}>Uploading...</Text>}
        <Text style={styles.displayName}>{profile?.display_name || 'User'}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{myGames.length}</Text>
            <Text style={styles.statLabel}>Games Created</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{joinedGames.length}</Text>
            <Text style={styles.statLabel}>Games Joined</Text>
          </View>
        </View>

        {/* My Created Games */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 My Created Games</Text>
          {myGames.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>You haven't created any games yet</Text>
            </View>
          ) : (
            myGames.map((game) => (
              <View key={game.id} style={styles.gameCardContainer}>
                <TouchableOpacity
                  style={styles.gameCard}
                  onPress={() => router.push(`/game-details?id=${game.id}`)}
                >
                  <Text style={styles.gameEmoji}>{getSportEmoji(game.sport)}</Text>
                  <View style={styles.gameInfo}>
                    <Text style={styles.gameSport}>{game.sport}</Text>
                    <Text style={styles.gameDetails}>
                      📍 {game.place} • 🕐 {formatDate(game.dt)}
                    </Text>
                  </View>
                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrow}>→</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.editIconButton}
                  onPress={() => router.push(`/edit-game?id=${game.id}`)}
                >
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Joined Games */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Games I Joined</Text>
          {joinedGames.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>You haven't joined any games yet</Text>
            </View>
          ) : (
            joinedGames.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={styles.gameCard}
                onPress={() => router.push(`/game-details?id=${game.id}`)}
              >
                <Text style={styles.gameEmoji}>{getSportEmoji(game.sport)}</Text>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameSport}>{game.sport}</Text>
                  <Text style={styles.gameDetails}>
                    📍 {game.place} • 🕐 {formatDate(game.dt)}
                  </Text>
                </View>
                <View style={styles.arrowCircle}>
                  <Text style={styles.arrow}>→</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  notLoggedInGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  notLoggedInEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  notLoggedInTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  notLoggedInText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  loginButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  cameraIconText: {
    fontSize: 16,
  },
  uploadingText: {
    color: 'white',
    fontSize: 14,
    marginTop: 8,
  },
  displayName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    padding: 20,
    marginTop: -20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptySection: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  gameCardContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gameEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  gameInfo: {
    flex: 1,
  },
  gameSport: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  gameDetails: {
    fontSize: 14,
    color: '#666',
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  editIconButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  editIcon: {
    fontSize: 18,
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});