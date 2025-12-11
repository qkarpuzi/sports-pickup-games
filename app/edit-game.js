import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

export default function EditGame() {
  const [sport, setSport] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const quickSports = ['⚽ Football', '🏀 Basketball', '🎾 Tennis', '🏐 Volleyball', '⚾ Baseball'];

  useEffect(() => {
    if (id) {
      fetchGameDetails();
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

      if (data.created_by !== user.id) {
        Alert.alert('Error', 'You can only edit your own games');
        router.back();
        return;
      }

      // Parse date and time
      const gameDate = new Date(data.dt);
      const dateStr = gameDate.toISOString().split('T')[0];
      const timeStr = gameDate.toTimeString().slice(0, 5);

      setSport(data.sport);
      setPlace(data.place);
      setDate(dateStr);
      setTime(timeStr);
      setMaxPlayers(data.max_players?.toString() || '10');
      setDescription(data.description || '');
    } catch (error) {
      Alert.alert('Error', error.message);
      router.back();
    }
  }

  async function getCurrentLocation() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need location permission to use this feature');
        setLocationLoading(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address && address.length > 0) {
        const addr = address[0];
        const locationString = [
          addr.street,
          addr.city,
          addr.region
        ].filter(Boolean).join(', ');
        
        setPlace(locationString || 'Current Location');
        Alert.alert('Success', 'Location added!');
      } else {
        setPlace('Current Location');
        Alert.alert('Success', 'Location added!');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get location: ' + error.message);
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleUpdateGame() {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    if (!sport.trim() || !place.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const dateTime = `${date}T${time}:00`;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('games')
        .update({
          sport: sport.trim().replace(/^[^\s]+\s/, ''),
          place: place.trim(),
          dt: dateTime,
          max_players: parseInt(maxPlayers) || 10,
          description: description.trim(),
        })
        .eq('id', id)
        .eq('created_by', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Game updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGame() {
    Alert.alert(
      'Delete Game',
      'Are you sure you want to delete this game? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('games')
                .delete()
                .eq('id', id)
                .eq('created_by', user.id);

              if (error) throw error;

              Alert.alert('Success', 'Game deleted successfully!', [
                { text: 'OK', onPress: () => router.replace('/profile') }
              ]);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Edit Game</Text>
          <Text style={styles.headerSubtitle}>Update your game details</Text>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.label}>Sport *</Text>
            <View style={styles.quickSelectContainer}>
              {quickSports.map((quickSport) => (
                <TouchableOpacity
                  key={quickSport}
                  style={[
                    styles.quickSelectButton,
                    sport === quickSport.split(' ')[1] && styles.quickSelectButtonActive
                  ]}
                  onPress={() => setSport(quickSport.split(' ')[1])}
                >
                  <Text style={[
                    styles.quickSelectText,
                    sport === quickSport.split(' ')[1] && styles.quickSelectTextActive
                  ]}>
                    {quickSport}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>⚽</Text>
              <TextInput
                style={styles.input}
                placeholder="Or type custom sport"
                placeholderTextColor="#999"
                value={sport}
                onChangeText={setSport}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Location *</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📍</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Central Park, Court 3"
                placeholderTextColor="#999"
                value={place}
                onChangeText={setPlace}
              />
            </View>
            <TouchableOpacity 
              style={[styles.locationButton, locationLoading && styles.locationButtonDisabled]}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              <Text style={styles.locationButtonText}>
                {locationLoading ? '🔄 Getting location...' : '📍 Use My Current Location'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <Text style={styles.label}>Date *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📅</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  value={date}
                  onChangeText={setDate}
                />
              </View>
            </View>

            <View style={[styles.section, styles.halfWidth]}>
              <Text style={styles.label}>Time *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🕐</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                  value={time}
                  onChangeText={setTime}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Max Players</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>👥</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor="#999"
                value={maxPlayers}
                onChangeText={setMaxPlayers}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description (optional)</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional details..."
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdateGame}
            disabled={loading}
          >
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Updating...' : '✅ Update Game'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteGame}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete Game</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  quickSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  quickSelectButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  quickSelectText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  quickSelectTextActive: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
    marginTop: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});