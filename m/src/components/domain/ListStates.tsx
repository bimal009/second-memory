import React from "react";
import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/theme/ThemeProvider";
import { appStyles } from "@/components/ui/AppScreen";

export function LoadingRows() {
  return <View style={appStyles.section} accessibilityLabel="Loading"><Skeleton width="45%" height={22} />{[0, 1, 2].map(i => <View key={i} style={appStyles.row}><Skeleton width={64} height={64} radius={12} /><View style={[appStyles.flex, { gap: 8 }]}><Skeleton width="85%" /><Skeleton width="60%" height={12} /></View></View>)}</View>;
}
export function CalmEmpty({ title, body }: { title: string; body: string }) {
  const { colors } = useTheme();
  return <View style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="heading">{title}</Text><Text variant="body" color="mutedForeground">{body}</Text></View>;
}
