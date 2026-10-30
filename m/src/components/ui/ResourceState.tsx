import React from "react";
import { View } from "react-native";
import { CloudOff, Inbox } from "lucide-react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";
import { uiCopy as c } from "@/constants/strings";
import { useTheme } from "@/theme/ThemeProvider";
export function ResourceState({ loading, error, empty, retry }: { loading?: boolean; error?: unknown; empty?: boolean; retry?: () => void }) {
  const { colors } = useTheme();
  const offline = error instanceof Error && error.message === "offline";
  if (loading) return <View accessible accessibilityLabel={c.loading} accessibilityState={{ busy: true }} style={{ gap: 16 }}><Skeleton height={180} /><Skeleton height={24} /><Skeleton height={64} /></View>;
  if (!error && !empty) return null;
  return <View style={{ alignItems: "center", paddingVertical: 32, gap: 16 }}>{error ? <CloudOff accessible={false} color={colors.mutedForeground} size={32} /> : <Inbox accessible={false} color={colors.mutedForeground} size={32} />}<Text variant="heading" align="center">{error ? c.error : c.empty}</Text><Text align="center" color="mutedForeground">{error ? offline ? c.offline : c.retry : c.emptyBody}</Text>{!!error && retry && <Button label={c.retry} onPress={retry} variant="secondary" />}</View>;
}
