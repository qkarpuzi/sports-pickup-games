import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function GameDetails() {
  const [game, setGame] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
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
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setGame(data);
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
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Game not found</Text>
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
        <Text style={styles.sportEmoji}>{getSportEmoji(game.sport)}</Text>
        <Text style={styles.sportName}>{game.sport}</Text>
        <Text style={styles.dateText}>{formatDate(game.dt)}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>📍</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{game.place}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>👥</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Players</Text>
              <Text style={styles.infoValue}>
                {participants.length} / {game.max_players || 10} joined
              </Text>
            </View>
          </View>
        </View>

        {game.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionLabel}>📝 About this game</Text>
            <Text style={styles.descriptionText}>{game.description}</Text>
          </View>
        )}

        {user && game.created_by === user.id ? (
          // Owner sees Edit button
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push(`/edit-game?id=${game.id}`)}
          >
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.editButtonGradient}
            >
              <Text style={styles.editButtonText}>✏️ Edit Game</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : hasJoined ? (
          // Participant sees Leave button
          <TouchableOpacity 
            style={styles.leaveButton}
            onPress={handleLeaveGame}
          >
            <Text style={styles.leaveButtonText}>❌ Leave Game</Text>
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
              end={{ x: 1, y: 0 }}
              style={styles.joinButtonGradient}
            >
              <Text style={styles.joinButtonText}>✨ Join Game</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {participants.length > 0 && (
          <View style={styles.participantsSection}>
            <Text style={styles.participantsTitle}>
              🎮 Players ({participants.length})
            </Text>
            {participants.map((participant, index) => (
              <View key={participant.id} style={styles.participantCard}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>
                    {participant.display_name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={styles.participantName}>
                  {participant.display_name}
                </Text>
                {participant.user_id === user?.id && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>You</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
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
    fontSize: 16,
    color: '#999',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  sportEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  sportName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  descriptionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  editButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  joinButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  joinButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  joinButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  leaveButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  leaveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantsSection: {
    marginTop: 10,
  },
  participantsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  youBadge: {
    backgroundColor: '#f093fb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  youBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});