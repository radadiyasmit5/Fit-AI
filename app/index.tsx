import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthContext } from "@/lib/auth-context";

export default function Index() {
  const { user, isLoading, needsOnboarding } = useAuthContext();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0d0d0d" }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
