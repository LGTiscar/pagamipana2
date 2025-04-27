import { Stack } from "expo-router";
import React from "react";
import { AppProvider } from "./context/AppContext";

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="components/UploadBillPage" />
        <Stack.Screen name="components/PeoplePage" />
        <Stack.Screen name="components/ItemsPage" />
        <Stack.Screen name="components/SummaryPage" />
      </Stack>
    </AppProvider>
  );
}