import React, { useState } from "react";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { MapPin, ArrowUpRight } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { appStyles } from "@/components/ui/AppScreen";
import type { DemoMemory } from "@/api";

export function PlaceMap({ memory }: { memory: DemoMemory }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(320);
  const [failed, setFailed] = useState(false);
  const { latitude, longitude } = memory.coordinates;
  const n = 2 ** 16;
  const x = (longitude + 180) / 360 * n;
  const lat = latitude * Math.PI / 180;
  const y = (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * n;
  const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
  return <View style={styles.container}>
    <Pressable accessibilityRole="link" accessibilityLabel={`Open map of ${memory.place}`} onPress={() => { void Linking.openURL(url).catch(() => setFailed(true)); }} style={[styles.map, { backgroundColor: colors.secondary }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {!failed && [-1, 0, 1].flatMap(dx => [-1, 0, 1].map(dy => <Image key={`${dx}-${dy}`} source={{ uri: `https://tile.openstreetmap.org/16/${Math.floor(x) + dx}/${Math.floor(y) + dy}.png`, headers: { "User-Agent": "SecondMemory/1.0 (mobile prototype)" } }} onError={() => setFailed(true)} style={{ position: "absolute", width: 256, height: 256, left: width / 2 + (Math.floor(x) + dx - x) * 256, top: 80 + (Math.floor(y) + dy - y) * 256 }} />))}
      <MapPin size={32} color={colors.primaryForeground} fill={colors.primary} style={{ position: "absolute", left: width / 2 - 16, top: 48 }} />
      {failed && <Text variant="caption" style={styles.unavailable}>Map preview unavailable</Text>}
    </Pressable>
    <View style={appStyles.row}><MapPin size={18} color={colors.foreground} /><Text variant="bodyMedium" style={appStyles.flex}>{memory.place}</Text><ArrowUpRight size={18} color={colors.mutedForeground} /></View>
    <Pressable accessibilityRole="link" accessibilityLabel="OpenStreetMap attribution" onPress={() => { void Linking.openURL("https://www.openstreetmap.org/copyright").catch(() => {}); }} style={styles.credit}><Text variant="micro" color="mutedForeground">Map data © OpenStreetMap contributors</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ container: { gap: 8 }, map: { height: 160, borderRadius: 16, overflow: "hidden" }, unavailable: { position: "absolute", bottom: 16, alignSelf: "center" }, credit: { minHeight: 48, justifyContent: "center" } });
