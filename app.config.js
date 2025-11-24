export default {
  expo: {
    name: "Sports Pickup Games",
    slug: "sports-pickup-games",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
  }
};