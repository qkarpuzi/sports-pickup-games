import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function Home() {
  const [games, setGames] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchGames();
    }, [])
  );

  useEffect(() => {
    fetchCategories();
    getUserLocation();
  }, []);

  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
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
        .select('*, categories(name, emoji), game_participants(count)')
        .order('dt', { ascending: true });

      if (error) throw error;
      
      const formattedData = (data || []).map(game => ({
        ...game,
        current_players: game.game_participants?.[0]?.count || 0,
      }));
      
      setAllGames(formattedData);
      setGames(formattedData);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchGames();
    fetchCategories();
  }

  function handleCreateGame() {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push('/create-game');
  }

  function filterByCategory(categoryId) {
    if (categoryId === selectedCategory) {
      // Toggle off
      setSelectedCategory(null);
      setGames(allGames);
      setShowNearby(false);
    } else {
      // Filter by category ID OR by matching sport name
      setSelectedCategory(categoryId);
      setShowNearby(false);
      
      // Find the selected category to get its name
      const selectedCat = categories.find(cat => cat.id === categoryId);
      
      const filtered = allGames.filter(game => {
        // Match by category_id (for new games)
        if (game.category_id === categoryId) return true;
        
        // Match by sport name (for old games without category_id)
        if (selectedCat && game.sport) {
          const sportLower = game.sport.toLowerCase();
          const catLower = selectedCat.name.toLowerCase();
          return sportLower.includes(catLower) || catLower.includes(sportLower);
        }
        
        return false;
      });
      
      setGames(filtered);
    }
  }

  async function toggleNearbyFilter() {
    if (!showNearby) {
      // Turn ON nearby filter
      if (!userLocation) {
        Alert.alert('Location Required', 'Please enable location services to find nearby games.');
        await getUserLocation();
        if (!userLocation) {
          Alert.alert('Permission Required', 'Location access is required to show nearby games.');
          return;
        }
      }

      const nearbyGames = await filterNearbyGames(allGames);
      setGames(nearbyGames);
      setShowNearby(true);
      setSelectedCategory(null);
      
      if (nearbyGames.length === 0) {
        Alert.alert('No Nearby Games', 'No games found within 10km. Try expanding your search or create your own game!');
      }
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
        const geocoded = await Location.geocodeAsync(game.place);
        
        if (geocoded && geocoded.length > 0) {
          const distance = getDistance(
            userLocation.latitude,
            userLocation.longitude,
            geocoded[0].latitude,
            geocoded[0].longitude
          );

          if (distance <= 10) {
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

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
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
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 0) return 'Already started';
    if (diffHours === 0) return 'Starting soon';
    if (diffHours < 24) return `In ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return date.toLocaleDateString([], { weekday: 'long' });
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  function GameCard({ item }) {
    return (
      <TouchableOpacity 
        style={styles.gameCard}
        onPress={() => router.push(`/game-details?id=${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.gameCardContent}>
          {/* Game Header */}
          <View style={styles.gameHeader}>
            <View style={styles.sportIconContainer}>
              <Text style={styles.sportIcon}>
                {item.categories?.emoji || getSportEmoji(item.sport)}
              </Text>
            </View>
            
            <View style={styles.gameInfo}>
              <View style={styles.gameTitleRow}>
                <Text style={styles.sportName} numberOfLines={1}>
                  {item.sport}
                </Text>
                {item.categories && (
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{item.categories.name}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.gameMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>{formatTime(item.dt)}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color="#666" />
                  <Text style={styles.metaText}>{formatDate(item.dt)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Game Location */}
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color="#667eea" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.place}
            </Text>
          </View>

          {/* Game Description */}
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* Game Footer */}
          <View style={styles.gameFooter}>
            <View style={styles.playersContainer}>
              <View style={styles.playersInfo}>
                <FontAwesome5 name="users" size={12} color="#666" />
                <Text style={styles.playersText}>
                  {item.current_players}/{item.max_players || 10}
                </Text>
              </View>
              <View style={styles.playersProgressBar}>
                <View 
                  style={[
                    styles.playersProgressFill,
                    { width: `${(item.current_players / (item.max_players || 10)) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View</Text>
              <Ionicons name="arrow-forward" size={16} color="#667eea" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
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
            <Text style={styles.headerTitle}>Game Finder</Text>
            <Text style={styles.headerSubtitle}>
              {user ? `Welcome back, ${user.email?.split('@')[0]}!` : 'Find & join games near you'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => user ? router.push('/profile') : router.push('/login')}
          >
            {user ? (
              <Ionicons name="person-circle" size={28} color="white" />
            ) : (
              <Ionicons name="log-in" size={28} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Create Game Button */}
      <View style={styles.createButtonContainer}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateGame}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonGradient}
          >
            <View style={styles.createButtonContent}>
              <View style={styles.createButtonIcon}>
                <Ionicons name="add" size={24} color="white" />
              </View>
              <View>
                <Text style={styles.createButtonTitle}>Create Game</Text>
                <Text style={styles.createButtonSubtitle}>Host your own pickup game</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filters</Text>
          {(showNearby || selectedCategory) && (
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={() => {
                setShowNearby(false);
                setSelectedCategory(null);
                setGames(allGames);
              }}
            >
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          <TouchableOpacity 
            style={[
              styles.filterPill,
              showNearby && styles.filterPillActive
            ]}
            onPress={toggleNearbyFilter}
          >
            <Ionicons 
              name="location" 
              size={16} 
              color={showNearby ? 'white' : '#667eea'} 
            />
            <Text style={[
              styles.filterPillText,
              showNearby && styles.filterPillTextActive
            ]}>
              Nearby
            </Text>
          </TouchableOpacity>

          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.filterPill,
                selectedCategory === category.id && styles.filterPillActive
              ]}
              onPress={() => filterByCategory(category.id)}
            >
              <Text style={styles.filterPillEmoji}>{category.emoji}</Text>
              <Text style={[
                styles.filterPillText,
                selectedCategory === category.id && styles.filterPillTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Games Section */}
      <View style={styles.gamesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {showNearby ? 'Games Near You' : selectedCategory ? `${categories.find(c => c.id === selectedCategory)?.name} Games` : 'All Games'}
          </Text>
          <View style={styles.gamesCountBadge}>
            <Text style={styles.gamesCountText}>{games.length}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading games...</Text>
          </View>
        ) : games.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name={showNearby ? "location-off" : "sad-outline"} size={64} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>
              {showNearby ? 'No Games Nearby' : selectedCategory ? 'No Games in Category' : 'No Games Yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {showNearby 
                ? 'Try expanding your search radius or create a game in your area'
                : selectedCategory
                ? 'Be the first to create a game in this category'
                : 'Be the first to create a game!'
              }
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleCreateGame}
            >
              <Text style={styles.emptyButtonText}>Create a Game</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={games}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gamesList}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#667eea"
              />
            }
            renderItem={({ item }) => <GameCard item={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
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
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonContainer: {
    paddingHorizontal: 24,
    marginTop: -20,
    marginBottom: 16,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  createButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createButtonTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  createButtonSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  filterSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
  },
  clearFilterText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  filtersContainer: {
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1.5,
    borderColor: '#e8ecf4',
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterPillEmoji: {
    fontSize: 14,
  },
  filterPillText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: 'white',
  },
  gamesSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  gamesCountBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gamesCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  gamesList: {
    paddingBottom: 20,
  },
  separator: {
    height: 12,
  },
  gameCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  gameCardContent: {
    padding: 20,
  },
  gameHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sportIcon: {
    fontSize: 28,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  sportName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginRight: 8,
    flex: 1,
  },
  categoryTag: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  gameFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playersContainer: {
    flex: 1,
    marginRight: 16,
  },
  playersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  playersText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  playersProgressBar: {
    height: 4,
    backgroundColor: '#e8ecf4',
    borderRadius: 2,
    overflow: 'hidden',
  },
  playersProgressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '700',
  },
});