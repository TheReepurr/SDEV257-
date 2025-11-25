import "react-native-gesture-handler"; // must be first
import "react-native-reanimated";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

/* =====================================================
   Header images (themed per screen)
   ===================================================== */
const HEADER_IMAGES = {
  // PLANETS — real planet in space
  planets: "https://images.pexels.com/photos/1257860/pexels-photo-1257860.jpeg?auto=compress&cs=tinysrgb&w=1200",

  // SPACESHIPS — sci-fi starship / futuristic spacecraft
  spaceships: "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?auto=format&w=1200&q=80",

  // FILMS — film reel / movie theme
  films: "https://images.pexels.com/photos/66134/pexels-photo-66134.jpeg?auto=compress&cs=tinysrgb&w=1200"
};

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

        setItems((prev) =>
          mode === "replace" ? records : [...prev, ...records]
        );
        setNextUrl(next || null);
      } catch (e) {
        if (e.name !== "AbortError") {
          setError(e.message || "Something went wrong");
        }
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
   Shared Shell: image, header, search box, search modal
   (List content is passed in as children)
   ===================================================== */
function ListShell({
  title,
  error,
  onRefresh,
  refreshing,
  loading,
  children,
  imageUrl,
}) {
  const [searchText, setSearchText] = useState("");
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [submittedText, setSubmittedText] = useState("");

  // Lazy-loading state for header image
  const [imageLoaded, setImageLoaded] = useState(false);

  /*
    ------------------------------------------------------------------
    ANIMATION IMPLEMENTED ACCORDING TO CHAPTER 25 (React Native Reanimated)

    - Uses React Native Reanimated hooks:
      - useSharedValue
      - useAnimatedStyle
      - withTiming

    - What it does:
      The screen title ("Planets", "Spaceships", "Films") fades in and
      slides up slightly when each screen is shown.

    - Why:
      This matches the chapter's idea of "animating styling components":
      we animate style properties (opacity and translateY) using shared
      values, to draw attention to the most important element on the
      screen (the current section title) and make the UI feel more alive.

    - How:
      * titleOpacity starts at 0 and animates to 1 with withTiming.
      * titleTranslateY starts at 10 and animates to 0 with withTiming.
      * useAnimatedStyle returns a style object driven by those values.
      * The Animated.View wrapping the title uses that animated style.
    ------------------------------------------------------------------
  */
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(10);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 600 });
    titleTranslateY.value = withTiming(0, { duration: 600 });
  }, [titleOpacity, titleTranslateY]);

  const animatedTitleStyle = useAnimatedStyle(() => {
    return {
      opacity: titleOpacity.value,
      transform: [{ translateY: titleTranslateY.value }],
    };
  });

  const handleSubmit = () => {
    setSubmittedText(searchText);
    setSearchModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0b0d10" }}>
      {/* Themed header image (lazy-loaded) */}
      <View
        style={{
          height: 150,
          marginHorizontal: 16,
          marginTop: 8,
          marginBottom: 8,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#020617",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {!imageLoaded && (
          <ActivityIndicator style={{ position: "absolute" }} />
        )}
        <Image
          source={{ uri: imageUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onLoadEnd={() => setImageLoaded(true)}
        />
      </View>

      {/* Search box at top of each screen */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
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

      {/* Animated Screen title using React Native Reanimated */}
      <Animated.View
        style={[
          {
            paddingHorizontal: 16,
            paddingBottom: 8,
          },
          animatedTitleStyle,
        ]}
      >
        <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>
          {title}
        </Text>
      </Animated.View>

      {/* Error area */}
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

      {/* Where each screen's ScrollView + Swipeables go */}
      <View style={{ flex: 1 }}>{children}</View>

      {/* Modal displaying submitted search text */}
      <Modal
        transparent
        visible={searchModalVisible}
        animationType="fade"
        onRequestClose={() => setSearchModalVisible(false)}
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
              onPress={() => setSearchModalVisible(false)}
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
    </View>
  );
}

/* Helper for swipe text */
function swipeTextForItem(item) {
  if (typeof item === "string") return item;
  if (item.name) return item.name;
  if (item.title) return item.title;
  return JSON.stringify(item);
}

/* Right swipe actions (visual only) */
function renderSwipeActions() {
  return (
    <View
      style={{
        justifyContent: "center",
        alignItems: "flex-end",
        marginVertical: 6,
      }}
    >
      <View
        style={{
          backgroundColor: "#1f2937",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fb923c", fontWeight: "600" }}>Show text</Text>
      </View>
    </View>
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

  const { items, loading, error, refresh, refreshing, loadMore, hasMore } =
    useSwapiList(initialUrl, parsePage);

  const [swipeModalVisible, setSwipeModalVisible] = useState(false);
  const [swipedItemText, setSwipedItemText] = useState("");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0d10" }}>
      <ListShell
        title={`Planets ${hasMore ? "" : "(all loaded)"}`}
        error={error}
        onRefresh={refresh}
        refreshing={refreshing}
        loading={loading}
        imageUrl={HEADER_IMAGES.planets}
      >
        {/* Requirement: On this screen, list of returned items is in a ScrollView */}
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
        >
          {items.length === 0 && !loading && !error ? (
            <Text style={{ color: "white" }}>No data yet.</Text>
          ) : null}

          {items.map((item) => (
            /* Requirement: Each item is Swipeable, swiping shows a modal with item text */
            <Swipeable
              key={item.id}
              renderRightActions={renderSwipeActions}
              onSwipeableOpen={() => {
                setSwipedItemText(swipeTextForItem(item));
                setSwipeModalVisible(true);
              }}
            >
              <View
                style={{
                  backgroundColor: "#111827",
                  padding: 14,
                  borderRadius: 12,
                  marginVertical: 6,
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 16, fontWeight: "600" }}
                >
                  {item.name}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                  {item.url}
                </Text>
              </View>
            </Swipeable>
          ))}

          {loading && (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          )}

          {hasMore && !loading && items.length > 0 && (
            <TouchableOpacity
              onPress={loadMore}
              style={{
                marginTop: 8,
                backgroundColor: "#1f2937",
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Load More
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </ListShell>

      {/* Modal for swiped item text */}
      <Modal
        transparent
        visible={swipeModalVisible}
        animationType="fade"
        onRequestClose={() => setSwipeModalVisible(false)}
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
              Swiped item:
            </Text>
            <Text
              style={{
                color: "#facc15",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 20,
              }}
            >
              {swipedItemText}
            </Text>
            <TouchableOpacity
              onPress={() => setSwipeModalVisible(false)}
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

  const { items, loading, error, refresh, refreshing, loadMore, hasMore } =
    useSwapiList(initialUrl, parsePage);

  const [swipeModalVisible, setSwipeModalVisible] = useState(false);
  const [swipedItemText, setSwipedItemText] = useState("");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0d10" }}>
      <ListShell
        title={`Spaceships ${hasMore ? "" : "(all loaded)"}`}
        error={error}
        onRefresh={refresh}
        refreshing={refreshing}
        loading={loading}
        imageUrl={HEADER_IMAGES.spaceships}
      >
        {/* Requirement: On this screen, list of returned items is in a ScrollView */}
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
        >
          {items.length === 0 && !loading && !error ? (
            <Text style={{ color: "white" }}>No data yet.</Text>
          ) : null}

          {items.map((item) => (
            /* Requirement: Each item is Swipeable, swiping shows a modal with item text */
            <Swipeable
              key={item.id}
              renderRightActions={renderSwipeActions}
              onSwipeableOpen={() => {
                setSwipedItemText(swipeTextForItem(item));
                setSwipeModalVisible(true);
              }}
            >
              <View
                style={{
                  backgroundColor: "#111827",
                  padding: 14,
                  borderRadius: 12,
                  marginVertical: 6,
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 16, fontWeight: "600" }}
                >
                  {item.name}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                  {item.url}
                </Text>
              </View>
            </Swipeable>
          ))}

          {loading && (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          )}

          {hasMore && !loading && items.length > 0 && (
            <TouchableOpacity
              onPress={loadMore}
              style={{
                marginTop: 8,
                backgroundColor: "#1f2937",
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Load More
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </ListShell>

      {/* Modal for swiped item text */}
      <Modal
        transparent
        visible={swipeModalVisible}
        animationType="fade"
        onRequestClose={() => setSwipeModalVisible(false)}
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
              Swiped item:
            </Text>
            <Text
              style={{
                color: "#facc15",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 20,
              }}
            >
              {swipedItemText}
            </Text>
            <TouchableOpacity
              onPress={() => setSwipeModalVisible(false)}
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

  const { items, loading, error, refresh, refreshing } = useSwapiList(
    initialUrl,
    parsePage
  );

  const [swipeModalVisible, setSwipeModalVisible] = useState(false);
  const [swipedItemText, setSwipedItemText] = useState("");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0d10" }}>
      <ListShell
        title="Films"
        error={error}
        onRefresh={refresh}
        refreshing={refreshing}
        loading={loading}
        imageUrl={HEADER_IMAGES.films}
      >
        {/* Requirement: On this screen, list of returned items is in a ScrollView */}
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
        >
          {items.length === 0 && !loading && !error ? (
            <Text style={{ color: "white" }}>No data yet.</Text>
          ) : null}

          {items.map((item) => (
            /* Requirement: Each item is Swipeable, swiping shows a modal with item text */
            <Swipeable
              key={item.id}
              renderRightActions={renderSwipeActions}
              onSwipeableOpen={() => {
                setSwipedItemText(swipeTextForItem(item));
                setSwipeModalVisible(true);
              }}
            >
              <View
                style={{
                  backgroundColor: "#111827",
                  padding: 14,
                  borderRadius: 12,
                  marginVertical: 6,
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 16, fontWeight: "700" }}
                >
                  {item.title}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                  Release: {item.release_date} • Director: {item.director}
                </Text>
              </View>
            </Swipeable>
          ))}

          {loading && (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          )}
        </ScrollView>
      </ListShell>

      {/* Modal for swiped item text */}
      <Modal
        transparent
        visible={swipeModalVisible}
        animationType="fade"
        onRequestClose={() => setSwipeModalVisible(false)}
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
              Swiped item:
            </Text>
            <Text
              style={{
                color: "#facc15",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 20,
              }}
            >
              {swipedItemText}
            </Text>
            <TouchableOpacity
              onPress={() => setSwipeModalVisible(false)}
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
   App & Navigation
   ===================================================== */
const Tab = createMaterialTopTabNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
