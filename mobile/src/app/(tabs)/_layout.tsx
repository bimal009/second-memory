import React from "react";
import { Tabs } from "expo-router";
import { Camera, FolderOpen, CalendarDays, Settings, MessageCircle } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/theme/ThemeProvider";
import { limeDeep } from "@/theme/tokens";
import { strings } from "@/constants/strings";

const TAB_ICONS = {
  capture: Camera,
  ask: MessageCircle,
  memories: FolderOpen,
  today: CalendarDays,
  settings: Settings,
} as const;

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  const tabs = ["capture", "ask", "memories", "today", "settings"] as const;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: isDark ? colors.primary : limeDeep,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: {
            fontSize: 11,
          },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        {tabs.map((name) => {
          const Icon = TAB_ICONS[name];
          const label = strings.tabs[name];
          return (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                title: label,
                tabBarIcon: ({ color, size, focused }) => (
                  <Icon color={color} size={size} strokeWidth={focused ? 2.2 : 2} />
                ),
                tabBarAccessibilityLabel: label,
              }}
            />
          );
        })}
      </Tabs>
    </>
  );
}
