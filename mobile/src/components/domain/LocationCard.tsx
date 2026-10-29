import React from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import type { MemoryLocation } from "@/types";
import { limeDeep, radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";

export type LocationCardProps = {
  location: MemoryLocation;
  compact?: boolean;
};

function mapsUrl(lat: number, lng: number, label: string) {
  const scheme = `geo:${lat},${lng}?q=${encodeURIComponent(label)}`;
  return scheme;
}

/** Styled coordinate card (no map SDK). "Open in Maps" via Linking. */
export function LocationCard({ location, compact }: LocationCardProps) {
  const { colors } = useTheme();

  const open = () => {
    const url = mapsUrl(location.lat, location.lng, location.label);
    Linking.canOpenURL("geo:0,0")
      .then((ok) => {
        try {
          void Linking.openURL(ok ? url : `https://maps.google.com/?q=${location.lat},${location.lng}`);
        } catch {
          /* noop */
        }
      })
      .catch(() => {
        /* noop */
      });
  };

  return (
    <View
      style={[
        styles.card,
        compact && styles.compact,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <MapPin size={20} color={colors.isDark ? colors.primary : limeDeep} />
        <View style={styles.textBlock}>
          <Text variant="bodyMedium">{location.label}</Text>
          {!compact ? (
            <Text variant="caption" color="mutedForeground">
              {location.lat}, {location.lng}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${location.label} in Maps`}
          onPress={open}
          style={({ pressed }) => [
            styles.action,
            { borderColor: colors.isDark ? colors.primary : limeDeep },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            variant="micro"
            style={{ color: colors.isDark ? colors.primary : limeDeep }}
          >
            Open in Maps
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.base,
    borderWidth: 1,
    padding: spacing.md,
    borderCurve: "continuous",
  },
  compact: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  action: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
});
