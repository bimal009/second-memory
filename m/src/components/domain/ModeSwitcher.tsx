import React from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text } from "@/components/ui/Text";
import { darkColors, mediaColors } from "@/theme/tokens";
import { uiCopy as c } from "@/constants/strings";
export function ModeSwitcher({ mode, onChange, disabled }: { mode: "moment" | "session"; onChange: (mode: "moment" | "session") => void; disabled?: boolean }) {
  const swipe = Gesture.Pan().enabled(!disabled).activeOffsetX([-24, 24]).failOffsetY([-12, 12]).runOnJS(true).onEnd(e => { if (Math.abs(e.translationX) > 40) onChange(e.translationX < 0 ? "session" : "moment"); });
  return <GestureDetector gesture={swipe}><View style={{ flexDirection: "row", gap: 8, backgroundColor: mediaColors.strongScrim, borderRadius: 10, padding: 4 }}>
    {(["moment", "session"] as const).map(key => <Pressable key={key} disabled={disabled} accessibilityRole="tab" accessibilityState={{ selected: key === mode, disabled }} onPress={() => onChange(key)} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, justifyContent: "center", borderRadius: 10, backgroundColor: key === mode ? darkColors.primary : "transparent", opacity: pressed || disabled ? 0.7 : 1 })}><Text variant="caption" maxFontSizeMultiplier={1.3} style={{ color: key === mode ? darkColors.primaryForeground : darkColors.foreground }}>{key === "moment" ? c.moment : c.sessionMode}</Text></Pressable>)}
  </View></GestureDetector>;
}
