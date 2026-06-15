import { Stack } from "expo-router";

export default function DiagnosticLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#0d9488",
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: "Diagnostic Details",
        }}
      />
    </Stack>
  );
}
