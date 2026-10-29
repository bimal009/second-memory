import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { HomeScreen } from "@/features/home/HomeScreen";
import { DevSimulation } from "@/features/settings/DevSimulation";
import { hydratePreferences } from "@/lib/preferences";
import { useTheme } from "@/theme/ThemeProvider";

export default function HomePreview() {
  const { colors } = useTheme();
  useEffect(() => { void hydratePreferences().catch(() => {}); }, []);
  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <HomeScreen preview />
    <ScrollView style={styles.tools} contentContainerStyle={styles.toolsContent}><DevSimulation /></ScrollView>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, tools: { maxHeight: 280, flexGrow: 0 }, toolsContent: { paddingHorizontal: 16 } });
