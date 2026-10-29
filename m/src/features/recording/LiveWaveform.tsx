import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

/** Actual expo-audio microphone levels; a paused recorder produces a flat trace. */
export function LiveWaveform({ level, recording }: { level: number; recording: boolean }) {
  const { colors } = useTheme();
  const [levels, setLevels] = useState(() => Array<number>(28).fill(0));
  useEffect(() => {
    const timer = setInterval(() => {
      const amplitude = recording ? Math.max(0, Math.min(1, (level + 60) / 60)) : 0;
      setLevels(previous => [...previous.slice(1), amplitude]);
    }, 150);
    return () => clearInterval(timer);
  }, [level, recording]);
  return <View accessible accessibilityLabel={recording ? "Live microphone level" : "Microphone paused"} style={{ height: 64, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>{levels.map((amplitude, index) => <View key={index} style={{ width: 4, height: 4 + amplitude * 56, borderRadius: 2, backgroundColor: colors.foreground }} />)}</View>;
}
