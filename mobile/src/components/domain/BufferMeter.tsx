import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { radius } from "@/theme/tokens";
import { spacing } from "@/theme/spacing";
import { useTheme } from "@/theme/ThemeProvider";
import { strings } from "@/constants/strings";

export type BufferMeterProps = {
  /** Seconds currently retained by the rolling buffer (≤ capacity). */
  keptSec: number;
  /** Rolling buffer capacity in seconds. */
  capacitySec: number;
};

/** "Last 2:00 kept on this phone, not uploaded" + thin progress bar. */
export function BufferMeter({ keptSec, capacitySec }: BufferMeterProps) {
  const { colors } = useTheme();
  const ratio =
    capacitySec > 0 ? Math.min(1, keptSec / capacitySec) : 0;
  const keptLabel = interpolate(strings.capture.bufferMeterTitle, {
    minutes: format(capacitySec),
  });

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={keptLabel}
      accessibilityValue={{
        now: keptSec,
        min: 0,
        max: capacitySec,
      }}
    >
      <View style={[styles.track, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: colors.primary, width: `${Math.round(ratio * 100)}%` },
          ]}
        />
      </View>
      <Text variant="micro" color="mutedForeground">
        {keptLabel}
      </Text>
    </View>
  );
}

function format(sec: number) {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r === 0 ? `${m}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

/** Tiny {token} interpolation helper for strings.ts. */
export function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    width: "100%",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
