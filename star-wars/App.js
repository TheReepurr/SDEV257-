// Keep these two imports first for navigation/gestures to work in Snack
import "react-native-gesture-handler";
import "react-native-reanimated";

import * as React from "react";
import { Platform, StyleSheet, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";

// --- Simple screen factory: shows the screen name as text
const makeScreen = (label) => () => (
  <SafeAreaView style={styles.screen}>
    <Text style={styles.title}>{label}</Text>
  </SafeAreaView>
);

const PlanetsScreen = makeScreen("Planets");
const FilmsScreen = makeScreen("Films");
const SpaceshipsScreen = makeScreen("Spaceships");

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function IOSTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Tab.Screen name="Planets" component={PlanetsScreen} />
      <Tab.Screen name="Films" component={FilmsScreen} />
      <Tab.Screen name="Spaceships" component={SpaceshipsScreen} />
    </Tab.Navigator>
  );
}

function AndroidDrawer() {
  return (
    <Drawer.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      <Drawer.Screen name="Planets" component={PlanetsScreen} />
      <Drawer.Screen name="Films" component={FilmsScreen} />
      <Drawer.Screen name="Spaceships" component={SpaceshipsScreen} />
    </Drawer.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {Platform.OS === "ios" ? <IOSTabs /> : <AndroidDrawer />}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: "700" },
});

