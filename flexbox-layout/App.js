import React from "react";
import { SafeAreaView, View, Text, StyleSheet, StatusBar } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Add margin to stay below Android status bar */}
      <View style={styles.container}>
        <View style={styles.column}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View style={styles.box} key={i}>
              <Text style={styles.text}>#{i + 1}</Text>
            </View>
          ))}
        </View>
        <View style={styles.column}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View style={styles.box} key={i}>
              <Text style={styles.text}>#{i + 7}</Text>
            </View>
          ))}
        </View>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingTop: StatusBar.currentHeight || 0,
  },
  column: {
    flexDirection: "column",
    justifyContent: "space-around",
  },
  box: {
    width: 80,
    height: 80,
    backgroundColor: "#ccc",
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "700",
  },
});
