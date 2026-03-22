import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="nutrition/add-meal" options={{ presentation: "modal" }} />
      <Stack.Screen name="nutrition/scan-meal" options={{ presentation: "modal" }} />
      <Stack.Screen name="workout/exercise-library" options={{ presentation: "modal" }} />
      <Stack.Screen name="workout/create-routine" options={{ presentation: "modal" }} />
      <Stack.Screen name="workout/identify-equipment" options={{ presentation: "modal" }} />
      <Stack.Screen name="workout/session" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
    </Stack>
  );
}
