import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function Layout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ title: 'Pickup Games' }} 
        />
        <Stack.Screen 
          name="create-game" 
          options={{ title: 'Create Game' }} 
        />
        <Stack.Screen 
          name="game-details" 
          options={{ title: 'Game Details' }} 
        />
        <Stack.Screen 
          name="login" 
          options={{ title: 'Login' }} 
        />
        <Stack.Screen 
          name="register" 
          options={{ title: 'Register' }} 
        />
        <Stack.Screen 
          name="profile" 
          options={{ title: 'Profile' }} 
        />
        <Stack.Screen 
          name="edit-game" 
          options={{ title: 'Edit Game' }} 
        />
      </Stack>
    </AuthProvider>
  );
}