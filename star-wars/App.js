import "react-native-gesture-handler"; // must be first
import "react-native-reanimated";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

/* =====================================================
   Reusable SWAPI list hook — handles fetch, refresh, and pagination
   ===================================================== */
function useSwapiList(initialUrl, parsePage) {
  const [items, setItems] = useState([]);
  const [nextUrl, setNextUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchPage = useCallback(
    async (url, mode = "append") => {
      if (!url) return;
      setLoading(true);
      setError(null);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const { records, next } = parsePage(json);

        setItems((prev) => (mode === "replace" ? records : [...prev, ...records]));
        setNextUrl(next || null);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message || "Something went wrong");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [parsePage]
  );

  useEffect(() => {
    setItems([]);
    setNextUrl(initialUrl);
    fetchPage(initialUrl, "replace");
    return () => abortRef.current?.abort();
  }, [initialUrl, fetchPage]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setItems([]);
    fetchPage(initialUrl, "replace");
  }, [initialUrl, fetchPage]);

  const loadMore = useCallback(() => {
    if (!loading && nextUrl) fetchPage(nextUrl, "append");
  }, [loading, nextUrl, fetchPage]);

  return { items, loading, error, refresh, refreshing, loadMore, hasMore: !!nextUrl };
}

/* =====================================================
   Shared UI List Shell
   ===================================================== */
function ListShell({
  title,
  items,
  loading,
  error,
  refreshing,
  onRefresh,
  onEndReached,
  renderItem,
  keyExtractor,
}) {
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [submittedText, setSubmittedText] = useState("");

  const handleSubmit = () => {
    setSubmittedText(searchText);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0d10" }}>
      {/* Search box at top of each screen */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <TextInput
          placeholder="Type a search term..."
          placeholderTextColor="#6B7280"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          style={{
            backgroundColor: "#111827",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            color: "white",
            borderWidth: 1,
            borderColor: "#374151",
            marginBottom: 8,
          }}
        />
      </View>

      {/* Screen title */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>{title}</Text>
      </View>

      {error ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: "#ff6b6b" }}>Error: {error}</Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={{
              marginTop: 10,
              backgroundColor: "#1f2937",
              padding: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReachedThreshold={0.25}
        onEndReached={onEndReached}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 40 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={{ color: "white" }}>No data yet.</Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && items.length > 0 ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      />

      {/* Modal displaying submitted text */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#111827",
              padding: 20,
              borderRadius: 12,
              width: "80%",
            }}
          >
            <Text style={{ color: "white", fontSize: 16, marginBottom: 12 }}>
              You entered:
            </Text>
            <Text
              style={{
                color: "#38bdf8",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 20,
              }}
            >
              {submittedText || "(empty)"}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                alignSelf: "flex-end",
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: "#1f2937",
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =====================================================
   Planets Screen
   ===================================================== */
function PlanetsScreen() {
  const initialUrl = "https://www.swapi.tech/api/planets";
  const parsePage = useCallback((json) => {
    const records = (json.results || []).map((p) => ({
      id: String(p.uid),
      name: p.name,
      url: p.url,
    }));
    return { records, next: json.next || null };
  }, []);

  const { items, loading, error, refresh, refreshing, loadMore, hasMore } = useSwapiList(
    initialUrl,
    parsePage
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ backgroundColor: "#111827", padding: 14, borderRadius: 12, marginVertical: 6 }}>
        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
        <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{item.url}</Text>
      </View>
    ),
    []
  );

  return (
    <ListShell
      title={`Planets ${hasMore ? "" : "(all loaded)"}`}
      items={items}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      onEndReached={loadMore}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
  );
}

/* =====================================================
   Spaceships Screen
   ===================================================== */
function SpaceshipsScreen() {
  const initialUrl = "https://www.swapi.tech/api/starships";
  const parsePage = useCallback((json) => {
    const records = (json.results || []).map((s) => ({
      id: String(s.uid),
      name: s.name,
      url: s.url,
    }));
    return { records, next: json.next || null };
  }, []);

  const { items, loading, error, refresh, refreshing, loadMore, hasMore } = useSwapiList(
    initialUrl,
    parsePage
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ backgroundColor: "#111827", padding: 14, borderRadius: 12, marginVertical: 6 }}>
        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
        <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{item.url}</Text>
      </View>
    ),
    []
  );

  return (
    <ListShell
      title={`Spaceships ${hasMore ? "" : "(all loaded)"}`}
      items={items}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      onEndReached={loadMore}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
  );
}

/* =====================================================
   Films Screen
   ===================================================== */
function FilmsScreen() {
  const initialUrl = "https://www.swapi.tech/api/films";
  const parsePage = useCallback((json) => {
    const records = (json.result || []).map((f) => ({
      id: String(f.uid),
      title: f?.properties?.title ?? "Untitled",
      release_date: f?.properties?.release_date ?? "",
      director: f?.properties?.director ?? "",
    }));
    return { records, next: json.next || null };
  }, []);

  const { items, loading, error, refresh, refreshing } = useSwapiList(initialUrl, parsePage);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ backgroundColor: "#111827", padding: 14, borderRadius: 12, marginVertical: 6 }}>
        <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>{item.title}</Text>
        <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
          Release: {item.release_date} • Director: {item.director}
        </Text>
      </View>
    ),
    []
  );

  return (
    <ListShell
      title="Films"
      items={items}
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={refresh}
      onEndReached={() => {}}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
  );
}

/* =====================================================
   App & Navigation
   ===================================================== */
const Tab = createMaterialTopTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: "#0b0d10" },
          tabBarActiveTintColor: "white",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarIndicatorStyle: { backgroundColor: "white" },
        }}
      >
        <Tab.Screen name="Planets" component={PlanetsScreen} />
        <Tab.Screen name="Spaceships" component={SpaceshipsScreen} />
        <Tab.Screen name="Films" component={FilmsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
