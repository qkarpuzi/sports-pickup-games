import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

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
    Promise.all([fetchProfile(), fetchMyGames(), fetchJoinedGames()])
      .finally(() => setRefreshing(false));
  }

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload a profile picture');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
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
      const base64Data = asset.base64;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Profile picture updated successfully!');
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
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
          style={styles.gradientFull}
        >
          <View style={styles.authContainer}>
            <Ionicons name="person-circle-outline" size={80} color="white" />
            <Text style={styles.authTitle}>Welcome</Text>
            <Text style={styles.authSubtitle}>Please login to access your profile</Text>
            
            <TouchableOpacity 
              style={styles.authButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.authButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#667eea"
          />
        }
      >
        {/* Header with Profile Info */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={pickImage}
              disabled={uploading}
            >
              {profile?.profile_picture_url ? (
                <Image 
                  source={{ uri: profile.profile_picture_url }} 
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileInitials}>
                    {profile?.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              {uploading ? (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="white" />
                </View>
              ) : (
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.display_name || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, styles.statIcon1]}>
                <Ionicons name="game-controller" size={24} color="#667eea" />
              </View>
              <Text style={styles.statNumber}>{myGames.length}</Text>
              <Text style={styles.statLabel}>Created</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statItem}>
              <View style={[styles.statIcon, styles.statIcon2]}>
                <FontAwesome5 name="users" size={20} color="#667eea" />
              </View>
              <Text style={styles.statNumber}>{joinedGames.length}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statItem}>
              <View style={[styles.statIcon, styles.statIcon3]}>
                <Ionicons name="calendar" size={24} color="#667eea" />
              </View>
              <Text style={styles.statNumber}>{myGames.length + joinedGames.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Content Sections */}
        <View style={styles.content}>
          {/* My Created Games */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="sports" size={24} color="#333" />
              <Text style={styles.sectionTitle}>My Games</Text>
            </View>
            
            {myGames.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="add-circle-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No games created yet</Text>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => router.push('/create-game')}
                >
                  <Text style={styles.createButtonText}>Create Your First Game</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myGames.map((game) => (
                <View key={game.id} style={styles.gameCard}>
                  <View style={styles.gameCardHeader}>
                    <View style={styles.gameSportInfo}>
                      <Text style={styles.gameEmoji}>{getSportEmoji(game.sport)}</Text>
                      <View>
                        <Text style={styles.gameSport}>{game.sport}</Text>
                        <Text style={styles.gameDate}>{formatDate(game.dt)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => router.push(`/edit-game?id=${game.id}`)}
                    >
                      <Ionicons name="create-outline" size={20} color="#667eea" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.gameCardBody}>
                    <View style={styles.gameDetail}>
                      <Ionicons name="location-outline" size={16} color="#666" />
                      <Text style={styles.gameDetailText}>{game.place}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.viewGameButton}
                    onPress={() => router.push(`/game-details?id=${game.id}`)}
                  >
                    <Text style={styles.viewGameButtonText}>View Details</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Joined Games */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="user-friends" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Joined Games</Text>
            </View>
            
            {joinedGames.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No games joined yet</Text>
                <TouchableOpacity 
                  style={styles.browseButton}
                  onPress={() => router.push('/games')}
                >
                  <Text style={styles.browseButtonText}>Browse Available Games</Text>
                </TouchableOpacity>
              </View>
            ) : (
              joinedGames.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={styles.gameCard}
                  onPress={() => router.push(`/game-details?id=${game.id}`)}
                >
                  <View style={styles.gameCardHeader}>
                    <View style={styles.gameSportInfo}>
                      <Text style={styles.gameEmoji}>{getSportEmoji(game.sport)}</Text>
                      <View>
                        <Text style={styles.gameSport}>{game.sport}</Text>
                        <Text style={styles.gameDate}>{formatDate(game.dt)}</Text>
                      </View>
                    </View>
                    <View style={styles.joinedBadge}>
                      <Text style={styles.joinedBadgeText}>Joined</Text>
                    </View>
                  </View>
                  
                  <View style={styles.gameCardBody}>
                    <View style={styles.gameDetail}>
                      <Ionicons name="location-outline" size={16} color="#666" />
                      <Text style={styles.gameDetailText}>{game.place}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Logout Button (Fixed at bottom) */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  gradientFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginTop: 20,
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 32,
  },
  authButton: {
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: '600',
    color: 'white',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  statsSection: {
    marginTop: -20,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon1: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  statIcon2: {
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
  },
  statIcon3: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
    marginHorizontal: 10,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  browseButton: {
    backgroundColor: '#764ba2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  gameCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameSportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  gameSport: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  gameDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinedBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  joinedBadgeText: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: '600',
  },
  gameCardBody: {
    marginBottom: 16,
  },
  gameDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  viewGameButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  viewGameButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logoutButton: {
    backgroundColor: '#ff4757',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});