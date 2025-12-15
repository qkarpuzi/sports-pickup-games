import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    
    try {
      await signIn(email, password);
      
      // Add this line - redirect immediately after successful login
      router.replace('/');
      
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password. Please try again.');
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
        {/* Back Button */}
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
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.headerSection}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="log-in" size={48} color="white" />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Email Input */}
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
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputCard}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#667eea" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    style={styles.visibilityToggle}
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loginGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={22} color="white" />
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerSection}>
                <Text style={styles.registerText}>New to the app?</Text>
                <TouchableOpacity 
                  style={styles.registerButton}
                  onPress={() => router.push('/register')}
                  disabled={loading}
                >
                  <Text style={styles.registerButtonText}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 48,
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
  visibilityToggle: {
    padding: 8,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  registerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  registerButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  registerButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '700',
  },
});