import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchGames();
  }, []);

  async function fetchGames() {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('dt', { ascending: true });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateGame() {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to create a game',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    router.push('/create-game');
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <View style={styles.container}>
      {/* Header with Login/Profile Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pickup Games</Text>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => user ? router.push('/profile') : router.push('/login')}
        >
          <Text style={styles.profileButtonText}>
            {user ? '👤 Profile' : '🔐 Login'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.createButton}
        onPress={handleCreateGame}
      >
        <Text style={styles.createButtonText}>+ Create New Game</Text>
      </TouchableOpacity>

      {loading ? (
        <Text style={styles.loadingText}>Loading games...</Text>
      ) : games.length === 0 ? (
        <Text style={styles.emptyText}>No games yet. Create the first one!</Text>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.gameCard}
              onPress={() => router.push(`/game-details?id=${item.id}`)}
            >
              <Text style={styles.sport}>{item.sport}</Text>
              <Text style={styles.place}>📍 {item.place}</Text>
              <Text style={styles.date}>🕐 {formatDate(item.dt)}</Text>
              {item.description && (
                <Text style={styles.description}>{item.description}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  profileButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#666',
  },
  gameCard: {
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
  sport: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  place: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});