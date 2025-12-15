// App.js
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
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import NetInfo from "@react-native-community/netinfo";

/* =====================================================
   Header images (themed per screen)
   ===================================================== */
const HEADER_IMAGES = {
  planets:
    "https://images.pexels.com/photos/1257860/pexels-photo-1257860.jpeg?auto=compress&cs=tinysrgb&w=1200",
  spaceships:
    "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?auto=format&w=1200&q=80",
  films:
    "https://images.pexels.com/photos/66134/pexels-photo-66134.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

/* =====================================================
   Reusable SWAPI list hook — handles fetch, refresh, and pagination
   + Network detection
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
        const netState = await NetInfo.fetch();
        const online =
          netState.isConnected && netState.isInternetReachable !== false;

        if (!online) {
          throw new Error("NO_NETWORK");
        }

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const { records, next } = parsePage(json);

        setItems((prev) =>
          mode === "replace" ? records : [...prev, ...records]
        );
        setNextUrl(next || null);
      } catch (e) {
        if (e.name === "AbortError") {
          // ignore
        } else if (e.message === "NO_NETWORK") {
          setError(
            "No internet connection detected. Please check your network and pull to refresh once you're back online."
          );
        } else {
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

  return {
    items,
    loading,
    error,
    refresh,
    refreshing,
    loadMore,
    hasMore: !!nextUrl,
  };
}

/* =====================================================
   Shared Shell: header, search box, title, error, children
   (Search state is controlled by each screen)
   ===================================================== */
function ListShell({
  title,
  error,
  onRefresh,
  refreshing,
  loading,
  children,
  imageUrl,
  searchText,
  onSearchTextChange,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: "#0b0d10" }}>
      {/* Header image */}
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

      {/* Search box */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <TextInput
          placeholder="Type a search term..."
          placeholderTextColor="#6B7280"
          value={searchText}
          onChangeText={onSearchTextChange}
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

      {/* Animated title */}
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
            <Text style={{ color: "white", textAlign: "center" }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>{children}</View>
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
        <Text style={{ color: "#fb923c", fontWeight: "600" }}>Details</Text>
      </View>
    </View>
  );
}

/* =====================================================
   PLANETS LIST SCREEN (inside a Stack)
   Swipe LEFT -> navigate to PlanetDetail
   Search filters shown planets
   ===================================================== */
function PlanetsScreen({ navigation }) {
  const initialUrl = "https://www.swapi.tech/api/planets";
  const parsePage = useCallback((json) => {
    const records = (json.results || []).map((p) => ({
      id: String(p.uid),
      name: p.name,
      url: p.url, // detail endpoint
    }));
    return { records, next: json.next || null };
  }, []);

  const { items, loading, error, refresh, refreshing, loadMore, hasMore } =
    useSwapiList(initialUrl, parsePage);

  const [searchText, setSearchText] = useState("");

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredItems =
    normalizedSearch.length === 0
      ? items
      : items.filter((item) =>
          item.name.toLowerCase().includes(normalizedSearch)
        );

  const showNoMatches =
    !loading && !error && items.length > 0 && filteredItems.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0d10" }}>
      <ListShell
        title={`Planets ${hasMore ? "" : "(all loaded)"}`}
        error={error}
        onRefresh={refresh}
        refreshing={refreshing}
        loading={loading}
        imageUrl={HEADER_IMAGES.planets}
        searchText={searchText}
        onSearchTextChange={setSearchText}
      >
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

          {showNoMatches && (
            <Text style={{ color: "#9CA3AF", marginBottom: 8 }}>
              No planets match "{searchText}".
            </Text>
          )}

          {filteredItems.map((item) => (
            <Swipeable
              key={item.id}
              renderRightActions={renderSwipeActions}
              // Swipe LEFT (opening right actions) -> navigate to detail
              onSwipeableRightOpen={() =>
                navigation.navigate("PlanetDetail", {
                  url: item.url,
                  name: item.name,
                })
              }
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
    </SafeAreaView>
  );
}

/* =====================================================
   PLANET DETAIL SCREEN
   Fetches detail URL and shows bulk of data
   ===================================================== */
function PlanetDetailScreen({ route, navigation }) {
  const { url, name } = route.params;
  const [planet, setPlanet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const netState = await NetInfo.fetch();
        const online =
          netState.isConnected && netState.isInternetReachable !== false;
        if (!online) throw new Error("No internet connection");

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const props = json?.result?.properties || {};
        if (mounted) setPlanet(props);
      } catch (e) {
        if (mounted) setError(e.message || "Failed to load planet");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [url]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
      >
        {/* Page title + subtitle */}
        <Text
          style={{
            color: "white",
            fontSize: 28,
            fontWeight: "800",
            marginBottom: 4,
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            color: "#9CA3AF",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          Planet detail from swapi.tech
        </Text>

        {/* Loading / error states */}
        {loading && (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator />
          </View>
        )}

        {error && !loading && (
          <View
            style={{
              backgroundColor: "#7f1d1d",
              padding: 12,
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#fecaca" }}>Error: {error}</Text>
          </View>
        )}

        {/* Content */}
        {planet && !loading && (
          <>
            {/* Quick chips */}
            <View
              style={{
                backgroundColor: "#0f172a",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: "#F9FAFB",
                  fontSize: 16,
                  fontWeight: "700",
                  marginBottom: 10,
                }}
              >
                At a glance
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Tag label="Climate" value={planet.climate} />
                <Tag label="Terrain" value={planet.terrain} />
                <Tag label="Population" value={planet.population} />
                <Tag label="Gravity" value={planet.gravity} />
                <Tag label="Diameter" value={planet.diameter} />
              </View>

              <View style={{ marginTop: 8 }}>
                <DetailRow label="Rotation period" value={planet.rotation_period} />
                <DetailRow label="Orbital period" value={planet.orbital_period} />
                <DetailRow label="Surface water" value={planet.surface_water} />
              </View>
            </View>

            {/* Bulk properties (render everything) */}
            <View
              style={{
                backgroundColor: "#0f172a",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <SectionHeader title="All properties" />

              {Object.entries(planet).map(([key, value]) => {
                const display =
                  Array.isArray(value)
                    ? value.length === 0
                      ? ""
                      : value.join(", ")
                    : value;

                return (
                  <DetailRow
                    key={key}
                    label={prettyKey(key)}
                    value={String(display)}
                  />
                );
              })}
            </View>
          </>
        )}

        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            marginTop: 20,
            alignSelf: "center",
            minWidth: "60%",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 999,
            backgroundColor: "#1d4ed8",
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            Back to planets
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function prettyKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function DetailRow({ label, value }) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#111827",
      }}
    >
      <Text style={{ color: "#9CA3AF", fontSize: 14, maxWidth: "42%" }}>
        {label}
      </Text>
      <Text
        style={{
          color: "#E5E7EB",
          fontSize: 14,
          fontWeight: "600",
          maxWidth: "55%",
          textAlign: "right",
        }}
      >
        {trimmed}
      </Text>
    </View>
  );
}

function SectionHeader({ title }) {
  return (
    <Text
      style={{
        marginTop: 4,
        marginBottom: 10,
        color: "#F9FAFB",
        fontSize: 16,
        fontWeight: "700",
      }}
    >
      {title}
    </Text>
  );
}

function Tag({ label, value }) {
  if (!value) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 999,
        backgroundColor: "#111827",
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{label}: </Text>
      <Text style={{ color: "#E5E7EB", fontSize: 12, fontWeight: "600" }}>
        {String(value)}
      </Text>
    </View>
  );
}

/* =====================================================
   SPACESHIPS SCREEN (unchanged: swipe shows modal)
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

  const [searchText, setSearchText] = useState("");

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredItems =
    normalizedSearch.length === 0
      ? items
      : items.filter((item) =>
          item.name.toLowerCase().includes(normalizedSearch)
        );

  const showNoMatches =
    !loading && !error && items.length > 0 && filteredItems.length === 0;

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
        searchText={searchText}
        onSearchTextChange={setSearchText}
      >
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

          {showNoMatches && (
            <Text style={{ color: "#9CA3AF", marginBottom: 8 }}>
              No spaceships match "{searchText}".
            </Text>
          )}

          {filteredItems.map((item) => (
            <Swipeable
              key={item.id}
              renderRightActions={renderSwipeActions}
              onSwipeableRightOpen={() => {
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
   FILMS SCREEN (unchanged: swipe shows modal)
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

  const [searchText, setSearchText] = useState("");

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredItems =
    normalizedSearch.length === 0
      ? items
      : items.filter((item) =>
          item.title.toLowerCase().includes(normalizedSearch)
        );

  const showNoMatches =
    !loading && !error && items.length > 0 && filteredItems.length === 0;

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
        searchText={searchText}
        onSearchTextChange={setSearchText}
      >
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

          {showNoMatches && (
            <Text style={{ color: "#9CA3AF", marginBottom: 8 }}>
              No films match "{searchText}".
            </Text>
          )}

          {filteredItems.map((item) => (
            <Swipeable
              key={item.id}
              renderRightActions={renderSwipeActions}
              onSwipeableRightOpen={() => {
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
   NAVIGATION SETUP
   Planets = Stack (List + Detail)
   Tabs: PlanetsStack, Spaceships, Films
   ===================================================== */
const Tab = createMaterialTopTabNavigator();
const PlanetsStack = createNativeStackNavigator();

function PlanetsStackScreen() {
  return (
    <PlanetsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#020617" },
        headerTintColor: "white",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <PlanetsStack.Screen
        name="PlanetsList"
        component={PlanetsScreen}
        options={{ title: "Planets" }}
      />
      <PlanetsStack.Screen
        name="PlanetDetail"
        component={PlanetDetailScreen}
        options={({ route }) => ({
          title: route.params?.name || "Planet Detail",
        })}
      />
    </PlanetsStack.Navigator>
  );
}

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
          {/* Planets tab uses a Stack (list + detail) */}
          <Tab.Screen name="Planets" component={PlanetsStackScreen} />
          <Tab.Screen name="Spaceships" component={SpaceshipsScreen} />
          <Tab.Screen name="Films" component={FilmsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
