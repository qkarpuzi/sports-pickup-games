import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
  

export default function CreateGame() {
  const [sport, setSport] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const { user } = useAuth();
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

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

  async function handleCreateGame() {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a game');
      router.replace('/login');
      return;
    }

    if (!sport.trim() || !place.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    const dateTime = `${date}T${time}:00`;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('games')
        .insert([
          {
            sport: sport.trim(),
            place: place.trim(),
            dt: dateTime,
            max_players: parseInt(maxPlayers) || 10,
            description: description.trim(),
            created_by: user.id,
            category_id: selectedCategoryId,
          },
        ])
        .select();

      if (error) throw error;

      Alert.alert('Success', 'Game created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Create New Game</Text>
            <Text style={styles.headerSubtitle}>Fill in the details below</Text>
          </View>
        </LinearGradient>

        <View style={styles.form}>
          {/* Category Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="grid-outline" size={20} color="#667eea" />
              <Text style={styles.label}>Category *</Text>
            </View>
            <View style={styles.categoriesContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategoryId === category.id && styles.categoryButtonActive
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(category.id);
                    setSport(category.name);
                  }}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategoryId === category.id && styles.categoryButtonTextActive
                  ]}>
                    {category.emoji} {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sport Name */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="football-outline" size={20} color="#667eea" />
              <Text style={styles.label}>Sport Name *</Text>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Sport name"
                placeholderTextColor="#999"
                value={sport}
                onChangeText={setSport}
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color="#667eea" />
              <Text style={styles.label}>Location *</Text>
            </View>
            <View style={styles.inputContainer}>
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
              {locationLoading ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Ionicons name="navigate-outline" size={18} color="#667eea" />
              )}
              <Text style={styles.locationButtonText}>
                {locationLoading ? 'Getting location...' : 'Use My Current Location'}
              </Text>
            </TouchableOpacity>
          </View>

                 {/* Date & Time */}
          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={20} color="#667eea" />
                <Text style={styles.label}>Date *</Text>
              </View>
              <TouchableOpacity 
                style={styles.inputContainer}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.input, !date && styles.placeholderText]}>
                  {date ? new Date(date).toLocaleDateString([], { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  }) : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.section, styles.halfWidth]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={20} color="#667eea" />
                <Text style={styles.label}>Time *</Text>
              </View>
              <TouchableOpacity 
                style={styles.inputContainer}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={[styles.input, !time && styles.placeholderText]}>
                  {time ? new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  }) : 'Select time'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date ? new Date(date) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(selectedDate.toISOString().split('T')[0]);
                }
              }}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={time ? new Date(`2000-01-01T${time}`) : new Date()}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) {
                  const hours = selectedTime.getHours().toString().padStart(2, '0');
                  const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
                  setTime(`${hours}:${minutes}`);
                }
              }}
            />
          )}

          {/* Max Players */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color="#667eea" />
              <Text style={styles.label}>Max Players</Text>
            </View>
            <View style={styles.inputContainer}>
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

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#667eea" />
              <Text style={styles.label}>Description (optional)</Text>
            </View>
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

          {/* Create Button */}
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateGame}
            disabled={loading}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={24} color="white" />
                  <Text style={styles.buttonText}>Create Game</Text>
                </>
              )}
            </LinearGradient>
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textAreaContainer: {
    paddingVertical: 12,
  },
  input: {
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    color: '#667eea',
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
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },

    placeholderText: {
    color: '#999',
  },
});