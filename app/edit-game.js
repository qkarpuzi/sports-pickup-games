import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function EditGame() {
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
  const [gameImage, setGameImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchGameDetails();
    }
  }, [id]);

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

      const gameDate = new Date(data.dt);
      const dateStr = gameDate.toISOString().split('T')[0];
      const timeStr = gameDate.toTimeString().slice(0, 5);

      setSport(data.sport);
      setPlace(data.place);
      setDate(dateStr);
      setTime(timeStr);
      setMaxPlayers(data.max_players?.toString() || '10');
      setDescription(data.description || '');
      setSelectedCategoryId(data.category_id);
      setExistingImageUrl(data.game_picture_url);
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
        aspect: [16, 9],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setGameImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  }

  async function uploadGameImage() {
    if (!gameImage) return existingImageUrl;

    setUploadingImage(true);
    try {
      const fileName = `${user.id}-${Date.now()}.jpg`;

      // Convert base64 to Uint8Array
      const base64Data = gameImage.base64;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('game-pictures')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('game-pictures')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Warning', 'Image upload failed, but game will still be updated');
      return existingImageUrl;
    } finally {
      setUploadingImage(false);
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

    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    const dateTime = `${date}T${time}:00`;
    setLoading(true);

    try {
      // Upload new image if selected
      const imageUrl = await uploadGameImage();

      const { error } = await supabase
        .from('games')
        .update({
          sport: sport.trim(),
          place: place.trim(),
          dt: dateTime,
          max_players: parseInt(maxPlayers) || 10,
          description: description.trim(),
          category_id: selectedCategoryId,
          game_picture_url: imageUrl,
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

  const displayImage = gameImage ? gameImage.uri : existingImageUrl;

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
          {/* Game Image */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="image-outline" size={20} color="#667eea" />
              <Text style={styles.label}>Game Picture</Text>
            </View>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {displayImage ? (
                <Image 
                  source={{ uri: displayImage }} 
                  style={styles.gameImage}
                />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="camera" size={40} color="#667eea" />
                  <Text style={styles.imagePickerText}>Add Cover Photo</Text>
                </View>
              )}
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={24} color="white" />
              </View>
            </TouchableOpacity>
          </View>

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

          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={20} color="#667eea" />
                <Text style={styles.label}>Date *</Text>
              </View>
              <View style={styles.inputContainer}>
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
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={20} color="#667eea" />
                <Text style={styles.label}>Time *</Text>
              </View>
              <View style={styles.inputContainer}>
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

          <TouchableOpacity 
            style={[styles.button, (loading || uploadingImage) && styles.buttonDisabled]}
            onPress={handleUpdateGame}
            disabled={loading || uploadingImage}
          >
            <LinearGradient
              colors={['#f093fb', '#f5576c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {(loading || uploadingImage) ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.buttonText}>Update Game</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteGame}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={styles.deleteButtonText}>Delete Game</Text>
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
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
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
  imagePickerButton: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  imagePickerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  gameImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  inputContainer: {
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
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#ff3b30',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    gap: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});