// App.js
// - Show user location
// - Highlight ONE nearby restaurant (annotation)
// - Plot region overlays (IPA vs Stout)
// - Uses Expo-safe fallback for react-native-maps on Web

import React, { useEffect, useState } from "react";
import {
  View,
  StatusBar,
  StyleSheet,
  Text,
  Platform,
  TouchableOpacity,
} from "react-native";
import * as Location from "expo-location";

// --- SAFE react-native-maps IMPORT (prevents web crashes) ---
let MapView, Marker, Polygon;

if (Platform.OS === "ios" || Platform.OS === "android") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polygon = Maps.Polygon;
} else {
  // Web fallback
  MapView = ({ style, children }) => (
    <View
      style={[
        style,
        {
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#ddd",
        },
      ]}
    >
      <Text style={{ textAlign: "center", paddingHorizontal: 16 }}>
        MapView / react-native-maps is not supported on web preview.
        Please run this app on iOS or Android.
      </Text>
      {children}
    </View>
  );
  Marker = () => null;
  Polygon = () => null;
}

// Set StatusBar style like the book’s examples
StatusBar.setBarStyle("dark-content");

// --- REGION OVERLAY COORDINATES ---
const IPA_REGION = [
  { latitude: 43.8425, longitude: -79.0870 },
  { latitude: 43.8425, longitude: -79.0845 },
  { latitude: 43.8395, longitude: -79.0845 },
  { latitude: 43.8395, longitude: -79.0870 },
];

const STOUT_REGION = [
  { latitude: 43.8420, longitude: -79.0875 },
  { latitude: 43.8420, longitude: -79.0850 },
  { latitude: 43.8390, longitude: -79.0850 },
  { latitude: 43.8390, longitude: -79.0875 },
];

export default function App() {
  const [coords, setCoords] = useState(null);
  const [activeOverlay, setActiveOverlay] = useState("ipa");

  // Ask for location permission + get current coords
  useEffect(() => {
    (async () => {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.warn("Location permissions not granted");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords(current.coords);
    })();
  }, []);

  const isNative = Platform.OS === "ios" || Platform.OS === "android";

  if (!coords) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading location…</Text>
      </View>
    );
  }

  const region = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <Text style={styles.heading}>Geo-location App</Text>

        <Text style={styles.infoText}>
          Latitude:{" "}
          <Text style={styles.infoValue}>
            {coords.latitude.toFixed(6)}
          </Text>
        </Text>
        <Text style={styles.infoText}>
          Longitude:{" "}
          <Text style={styles.infoValue}>
            {coords.longitude.toFixed(6)}
          </Text>
        </Text>

        <Text style={[styles.infoText, { marginTop: 8 }]}>
          This map shows your location, one nearby restaurant, and regional overlays.
        </Text>

        {/* Overlay toggle */}
        {isNative && (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                activeOverlay === "ipa" && styles.toggleButtonActive,
              ]}
              onPress={() => setActiveOverlay("ipa")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  activeOverlay === "ipa" && styles.toggleButtonTextActive,
                ]}
              >
                IPA Fans
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                activeOverlay === "stout" && styles.toggleButtonActive,
              ]}
              onPress={() => setActiveOverlay("stout")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  activeOverlay === "stout" &&
                    styles.toggleButtonTextActive,
                ]}
              >
                Stout Fans
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Map */}
      <MapView
        style={styles.mapView}
        showsUserLocation
        followUserLocation
        showsPointsOfInterest={false}
        initialRegion={region}
        region={region}
      >
        {/* --- ONE NEARBY RESTAURANT MARKER (Assignment Requirement) --- */}
        <Marker
          title="Nearby Restaurant"
          description="A local restaurant near your location."
          coordinate={{
            latitude: coords.latitude + 0.0012, // small offset to display nearby
            longitude: coords.longitude + 0.0012,
          }}
        />

        {/* --- REGION OVERLAYS --- */}
        {activeOverlay === "ipa" && (
          <Polygon
            coordinates={IPA_REGION}
            strokeColor="rgba(255, 99, 71, 1)"
            fillColor="rgba(255, 99, 71, 0.25)"
            strokeWidth={2}
          />
        )}

        {activeOverlay === "stout" && (
          <Polygon
            coordinates={STOUT_REGION}
            strokeColor="rgba(30, 144, 255, 1)"
            fillColor="rgba(30, 144, 255, 0.25)"
            strokeWidth={2}
          />
        )}
      </MapView>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  loadingText: {
    fontSize: 16,
    color: "#4b5563",
  },
  infoPanel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#4b5563",
  },
  infoValue: {
    fontWeight: "500",
    color: "#111827",
  },
  toggleRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginRight: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  toggleButtonText: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
  },
  toggleButtonTextActive: {
    color: "#f9fafb",
  },
  mapView: {
    flex: 1,
  },
});
