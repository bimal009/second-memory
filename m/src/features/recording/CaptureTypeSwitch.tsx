import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import type { CaptureMode } from "./types";

export function CaptureTypeSwitch({ mode, onChange, disabled, cameraDenied }: { mode: CaptureMode; onChange: (mode: CaptureMode) => void; disabled?: boolean; cameraDenied?: boolean }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
    {([{ value: "audio", label: "Audio only" }, { value: "video", label: "Audio + Video" }] as const).map(choice => {
      const unavailable = disabled || choice.value === "video" && cameraDenied;
      const selected = mode === choice.value;
      return <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label} accessibilityState={{ checked: selected, disabled: unavailable }} disabled={unavailable} onPress={() => onChange(choice.value)} style={({ pressed }) => ({ flexGrow: 1, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.foreground : colors.secondary, opacity: unavailable ? .4 : pressed ? .7 : 1 })}><Text variant="caption" style={{ color: selected ? colors.background : colors.foreground }}>{choice.label}</Text></Pressable>;
    })}
  </View>;
}
