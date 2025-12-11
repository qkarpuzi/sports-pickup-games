import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

export default function Home() {
  const [games, setGames] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchGames();
    getUserLocation();
  }, []);

  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log('Could not get location:', error);
    }
  }

  async function fetchGames() {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('dt', { ascending: true });

      if (error) throw error;
      setAllGames(data || []);
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchGames();
  }

  function handleCreateGame() {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push('/create-game');
  }

  async function toggleNearbyFilter() {
    if (!showNearby) {
      // Turn ON nearby filter
      if (!userLocation) {
        Alert.alert('Location Required', 'Getting your location...');
        await getUserLocation();
        if (!userLocation) {
          Alert.alert('Error', 'Could not get your location. Please enable location services.');
          return;
        }
      }

      // Filter games within 50km radius
      const nearbyGames = await filterNearbyGames(allGames);
      setGames(nearbyGames);
      setShowNearby(true);
      Alert.alert('Nearby Games', `Showing ${nearbyGames.length} games near you`);
    } else {
      // Turn OFF nearby filter
      setGames(allGames);
      setShowNearby(false);
    }
  }

  async function filterNearbyGames(gamesToFilter) {
    if (!userLocation) return gamesToFilter;

    const nearbyGames = [];

    for (const game of gamesToFilter) {
      try {
        // Try to geocode the game location
        const geocoded = await Location.geocodeAsync(game.place);
        
        if (geocoded && geocoded.length > 0) {
          const distance = getDistance(
            userLocation.latitude,
            userLocation.longitude,
            geocoded[0].latitude,
            geocoded[0].longitude
          );

          // Within 50km
          if (distance <= 50) {
            nearbyGames.push(game);
          }
        }
      } catch (error) {
        // If geocoding fails, include the game anyway
        nearbyGames.push(game);
      }
    }

    return nearbyGames;
  }

  // Calculate distance between two coordinates (Haversine formula)
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function toRad(value) {
    return (value * Math.PI) / 180;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Tomorrow at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Pickup Games</Text>
            <Text style={styles.headerSubtitle}>
              {user ? `Welcome back, ${user.email?.split('@')[0]}!` : 'Find your next game'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => user ? router.push('/profile') : router.push('/login')}
          >
            <Text style={styles.profileButtonText}>
              {user ? '👤' : '🔐'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Create Game Button */}
      <View style={styles.createButtonContainer}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateGame}
        >
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <Text style={styles.createButtonIcon}>+</Text>
            <Text style={styles.createButtonText}>Create New Game</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Nearby Filter Button */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, showNearby && styles.filterButtonActive]}
          onPress={toggleNearbyFilter}
        >
          <Text style={[styles.filterButtonText, showNearby && styles.filterButtonTextActive]}>
            {showNearby ? '✓ ' : ''}📍 Near Me
          </Text>
        </TouchableOpacity>
        <Text style={styles.gamesCount}>
          {games.length} {games.length === 1 ? 'game' : 'games'}
        </Text>
      </View>

      {/* Games List */}
      {loading ? (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading games...</Text>
        </View>
      ) : games.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>🎮</Text>
          <Text style={styles.emptyTitle}>
            {showNearby ? 'No games nearby' : 'No games yet'}
          </Text>
          <Text style={styles.emptyText}>
            {showNearby ? 'Try turning off the location filter' : 'Be the first to create one!'}
          </Text>
          {showNearby && (
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => toggleNearbyFilter()}
            >
              <Text style={styles.emptyButtonText}>Show All Games</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.gameCard}
              onPress={() => router.push(`/game-details?id=${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.gameCardHeader}>
                <Text style={styles.sportEmoji}>{getSportEmoji(item.sport)}</Text>
                <View style={styles.gameCardHeaderText}>
                  <Text style={styles.sportName}>{item.sport}</Text>
                  <Text style={styles.dateText}>{formatDate(item.dt)}</Text>
                </View>
              </View>
              
              <View style={styles.gameCardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📍</Text>
                  <Text style={styles.infoText}>{item.place}</Text>
                </View>
                
                {item.description && (
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>

              <View style={styles.gameCardFooter}>
                <View style={styles.playersInfo}>
                  <Text style={styles.playersIcon}>👥</Text>
                  <Text style={styles.playersText}>
                    {item.max_players || 10} spots
                  </Text>
                </View>
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrow}>→</Text>
                </View>
              </View>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 24,
  },
  createButtonContainer: {
    paddingHorizontal: 20,
    marginTop: -25,
    marginBottom: 16,
  },
  createButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  createButtonIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 10,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  gamesCount: {
    fontSize: 14,
    color: '#999',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gameCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  sportEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  gameCardHeaderText: {
    flex: 1,
  },
  sportName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  gameCardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    lineHeight: 20,
  },
  gameCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  playersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playersIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  playersText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
});