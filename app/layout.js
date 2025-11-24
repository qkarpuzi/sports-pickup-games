import { Stack } from 'expo-router';

export default function Layout() {
  return (
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
    </Stack>
  );
}