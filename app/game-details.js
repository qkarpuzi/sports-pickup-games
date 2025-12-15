import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function GameDetails() {
  const [game, setGame] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [categoryEmoji, setCategoryEmoji] = useState('🏃');
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    if (id) {
      fetchGameDetails();
      fetchParticipants();
    }
  }, [id]);

  useEffect(() => {
    if (user && participants.length > 0) {
      const joined = participants.some(p => p.user_id === user.id);
      setHasJoined(joined);
    }
  }, [user, participants]);

  async function fetchGameDetails() {
    try {
      // Fetch game with its category info
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          categories (emoji, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setGame(data);
      
      // Set the category emoji if available, otherwise use sport-based emoji
      if (data.categories?.emoji) {
        setCategoryEmoji(data.categories.emoji);
      } else {
        setCategoryEmoji(getSportEmoji(data.sport));
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchParticipants() {
    try {
      const { data, error } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', id);

      if (error) throw error;

      if (data && data.length > 0) {
        const participantsWithNames = await Promise.all(
          data.map(async (participant) => {
            try {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('display_name')
                .eq('id', participant.user_id)
                .single();
              
              return {
                ...participant,
                display_name: profile?.display_name || 'Anonymous Player'
              };
            } catch (err) {
              return {
                ...participant,
                display_name: 'Anonymous Player'
              };
            }
          })
        );
        
        setParticipants(participantsWithNames);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setParticipants([]);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchGameDetails();
    fetchParticipants();
  }

  async function handleJoinGame() {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to join a game',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    if (hasJoined) {
      Alert.alert('Info', 'You already joined this game!');
      return;
    }

    try {
      const { error } = await supabase
        .from('game_participants')
        .insert([
          {
            game_id: id,
            user_id: user.id,
          },
        ]);

      if (error) throw error;

      Alert.alert('Success', 'You joined the game!');
      fetchParticipants();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }

  async function handleLeaveGame() {
    if (!user) return;

    Alert.alert(
      'Leave Game',
      'Are you sure you want to leave this game?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('game_participants')
                .delete()
                .eq('game_id', id)
                .eq('user_id', user.id);

              if (error) throw error;

              Alert.alert('Success', 'You left the game');
              fetchParticipants();
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
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Tomorrow at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      month: 'long', 
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

  function getSportIcon(sportName) {
    const sportLower = sportName.toLowerCase();
    if (sportLower.includes('football') || sportLower.includes('soccer')) return '⚽';
    if (sportLower.includes('basketball')) return '🏀';
    if (sportLower.includes('tennis')) return '🎾';
    if (sportLower.includes('volleyball')) return '🏐';
    if (sportLower.includes('baseball')) return '⚾';
    return '🏃';
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading game details...</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
        <Text style={styles.errorTitle}>Game Not Found</Text>
        <Text style={styles.errorText}>The game you're looking for doesn't exist or has been removed</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        {/* Header with Game Info */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.gameHeader}>
            <View style={styles.sportIconContainer}>
              <Text style={styles.sportIcon}>{categoryEmoji}</Text>
            </View>
            
            <View style={styles.gameInfo}>
              <Text style={styles.gameSport}>{game.sport}</Text>
              <Text style={styles.gameDate}>{formatDate(game.dt)}</Text>
              
              {game.categories && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{game.categories.name}</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Game Details */}
        <View style={styles.content}>
          {/* Location Card */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailIcon}>
                <Ionicons name="location" size={24} color="#667eea" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{game.place}</Text>
              </View>
            </View>
          </View>

          {/* Players Card */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailIcon}>
                <FontAwesome5 name="users" size={22} color="#667eea" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Players</Text>
                <View style={styles.playersInfo}>
                  <Text style={styles.playersCount}>
                    {participants.length} / {game.max_players || 10} joined
                  </Text>
                  <View style={styles.playersProgress}>
                    <View 
                      style={[
                        styles.playersProgressFill,
                        { width: `${(participants.length / (game.max_players || 10)) * 100}%` }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Description */}
          {game.description && (
            <View style={styles.descriptionCard}>
              <View style={styles.descriptionHeader}>
                <Ionicons name="document-text" size={20} color="#333" />
                <Text style={styles.descriptionTitle}>About this game</Text>
              </View>
              <Text style={styles.descriptionText}>{game.description}</Text>
            </View>
          )}

          {/* Action Button */}
          <View style={styles.actionContainer}>
            {user && game.created_by === user.id ? (
              // Owner sees Edit button
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => router.push(`/edit-game?id=${game.id}`)}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="create-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Edit Game</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : hasJoined ? (
              // Participant sees Leave button
              <TouchableOpacity 
                style={styles.leaveButton}
                onPress={handleLeaveGame}
              >
                <Ionicons name="exit-outline" size={20} color="white" />
                <Text style={styles.buttonText}>Leave Game</Text>
              </TouchableOpacity>
            ) : (
              // Others see Join button
              <TouchableOpacity 
                style={styles.joinButton}
                onPress={handleJoinGame}
              >
                <LinearGradient
                  colors={['#34C759', '#28a745']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="person-add" size={20} color="white" />
                  <Text style={styles.buttonText}>Join Game</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Participants */}
          {participants.length > 0 && (
            <View style={styles.participantsSection}>
              <View style={styles.sectionHeader}>
                <FontAwesome5 name="user-friends" size={20} color="#333" />
                <Text style={styles.sectionTitle}>Players ({participants.length})</Text>
              </View>
              
              {participants.map((participant) => (
                <View key={participant.id} style={styles.participantCard}>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantInitials}>
                      {participant.display_name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName} numberOfLines={1}>
                      {participant.display_name}
                    </Text>
                    {participant.user_id === user?.id && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  errorButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
  },
  sportIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  sportIcon: {
    fontSize: 40,
  },
  gameInfo: {
    flex: 1,
  },
  gameSport: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  gameDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  content: {
    padding: 24,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  playersInfo: {
    marginTop: 4,
  },
  playersCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  playersProgress: {
    height: 6,
    backgroundColor: '#e8ecf4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  playersProgressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 3,
  },
  descriptionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  actionContainer: {
    marginBottom: 32,
  },
  editButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  joinButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  leaveButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
    elevation: 4,
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  participantsSection: {
    marginBottom: 24,
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
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  participantInitials: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  youBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 12,
  },
  youBadgeText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bottomSpacer: {
    height: 40,
  },
});