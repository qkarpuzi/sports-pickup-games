import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Mismatch', 'Please make sure your passwords match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      // Sign up with email confirmation required
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: displayName.trim(),
            display_name: displayName.trim(),
          },
        }
      });

      if (error) throw error;

      if (data?.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          Alert.alert('Email Already Registered', 'This email is already registered. Please login instead.');
          router.push('/login');
        } else {
          Alert.alert(
            'Verification Email Sent! ✉️',
            `We've sent a verification link to ${email}.\n\nPlease check your email and click the link to activate your account.\n\nAfter verifying, you can login to start using the app.`,
            [
              {
                text: 'OK',
                onPress: () => router.push('/login')
              }
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={60}
        >
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.headerSection}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="person-add" size={48} color="white" />
                </View>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join our sports community</Text>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                {/* Display Name */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Display Name</Text>
                  <View style={styles.inputCard}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="person-outline" size={20} color="#667eea" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="What should we call you?"
                      placeholderTextColor="#999"
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputCard}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="mail-outline" size={20} color="#667eea" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputCard}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="lock-closed-outline" size={20} color="#667eea" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoComplete="new-password"
                    />
                  </View>
                  <Text style={styles.hintText}>Must be at least 6 characters</Text>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.inputCard}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#667eea" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#999"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoComplete="new-password"
                    />
                  </View>
                  <Text style={styles.hintText}>
                    {password && confirmPassword && password !== confirmPassword 
                      ? '⚠️ Passwords do not match' 
                      : password && confirmPassword && password === confirmPassword 
                      ? '✅ Passwords match' 
                      : ''}
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity 
                  style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.registerGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="person-add" size={22} color="white" />
                        <Text style={styles.registerButtonText}>Create Account</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.loginSection}>
                  <Text style={styles.loginText}>Already have an account?</Text>
                  <TouchableOpacity 
                    style={styles.loginButton}
                    onPress={() => router.push('/login')}
                    disabled={loading}
                  >
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
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
    zIndex: 10,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#e8ecf4',
  },
  inputIconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    marginLeft: 4,
  },
  registerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  loginSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  loginButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  loginButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '700',
  },
});