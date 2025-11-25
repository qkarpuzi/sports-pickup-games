import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function CreateGame() {
  const [sport, setSport] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  async function handleCreateGame() {
    // Check if user is logged in
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a game');
      router.replace('/login');
      return;
    }

    // Validation
    if (!sport.trim() || !place.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Combine date and time into datetime
    const dateTime = `${date}T${time}:00`;

    setLoading(true);

    try {
      // Create the game
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
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Sport *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Football, Basketball, Tennis"
          value={sport}
          onChangeText={setSport}
        />

        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Central Park, Court 3"
          value={place}
          onChangeText={setPlace}
        />

        <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 2024-12-25"
          value={date}
          onChangeText={setDate}
        />

        <Text style={styles.label}>Time * (HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 14:30"
          value={time}
          onChangeText={setTime}
        />

        <Text style={styles.label}>Max Players</Text>
        <TextInput
          style={styles.input}
          placeholder="10"
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any additional info..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateGame}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Game'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});