import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Camera, Images, MessageCircle, Sun } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { darkColors, limeDeep } from "@/theme/tokens";
import { uiCopy as c } from "@/constants/strings";
import { useAppPager } from "./AppPagerProvider";
export function PagerNav() {
  const pager = useAppPager(); const theme = useTheme(); const insets = useSafeAreaInsets();
  const colors = pager.pageIndex === 1 ? darkColors : theme.colors;
  const tabs = [{ label: c.ask, Icon: MessageCircle, action: () => pager.goTo(0), selected: pager.pageIndex === 0 }, { label: c.memories, Icon: Images, action: pager.openMemories, selected: false }, { label: c.today, Icon: Sun, action: () => pager.goTo(2), selected: pager.pageIndex === 2 }];
  return <View style={[styles.nav, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 12), borderColor: colors.border }]}>
    {pager.pageIndex !== 1 && <Pressable accessibilityRole="button" accessibilityLabel={c.camera} onPress={() => pager.goTo(1)} style={({ pressed }) => [styles.camera, { backgroundColor: colors.primary, opacity: pressed ? 0.65 : 1 }]}><Camera accessible={false} color={colors.primaryForeground} size={24} /></Pressable>}
    {tabs.map(({ label, Icon, action, selected }) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={action} style={({ pressed }) => [styles.item, { opacity: pressed ? 0.6 : 1 }]}><Icon accessible={false} color={selected ? (colors.isDark ? colors.primary : limeDeep) : colors.foreground} size={24} /><Text variant="caption" style={{ color: colors.foreground }}>{label}</Text></Pressable>)}
  </View>;
}
const styles = StyleSheet.create({ nav: { flexDirection: "row", borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16, gap: 8 }, item: { flex: 1, minHeight: 52, gap: 4, alignItems: "center", justifyContent: "center" }, camera: { minWidth: 48, minHeight: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" } });
