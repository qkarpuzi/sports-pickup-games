import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function GameDetails() {
  const [game, setGame] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    if (id) {
      fetchGameDetails();
      fetchParticipants();
    }
  }, [id]);

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
    }
  }

  async function fetchParticipants() {
    try {
      const { data, error } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', id);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }

  async function handleJoinGame() {
    try {
      // Sign in anonymously
      const { data: { user }, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError) throw authError;

      // Check if already joined
      const { data: existing } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        Alert.alert('Info', 'You already joined this game!');
        return;
      }

      // Join the game
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
      fetchParticipants(); // Refresh participants list
    } catch (error) {
      Alert.alert('Error', error.message);
    }
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Game not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sport}>{game.sport}</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>📍 Location</Text>
          <Text style={styles.infoValue}>{game.place}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>🕐 Date & Time</Text>
          <Text style={styles.infoValue}>{formatDate(game.dt)}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>👥 Players</Text>
          <Text style={styles.infoValue}>
            {participants.length} / {game.max_players || 10}
          </Text>
        </View>

        {game.description && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>📝 Description</Text>
            <Text style={styles.infoValue}>{game.description}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.joinButton}
          onPress={handleJoinGame}
        >
          <Text style={styles.joinButtonText}>Join Game</Text>
        </TouchableOpacity>

        {participants.length > 0 && (
          <View style={styles.participantsSection}>
            <Text style={styles.participantsTitle}>Participants ({participants.length})</Text>
            {participants.map((participant) => (
              <View key={participant.id} style={styles.participantItem}>
                <Text style={styles.participantText}>
                  Player {participant.user_id.substring(0, 8)}...
                </Text>
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: 'red',
  },
  sport: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantsSection: {
    marginTop: 10,
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  participantItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  participantText: {
    fontSize: 14,
    color: '#666',
  },
});