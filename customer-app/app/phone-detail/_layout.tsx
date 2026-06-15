import { Stack } from "expo-router";

export default function PhoneDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTintColor: "#111827",
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen
        name="[phoneId]"
        options={{
          headerTitle: "Phone Details",
        }}
      />
    </Stack>
  );
}
