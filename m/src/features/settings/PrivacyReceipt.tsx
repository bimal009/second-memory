import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import { api } from "@/api/client";
import { useMemoryQuery } from "@/api/useMemoryQuery";
import { Page, layout } from "@/components/ui/Page";
import { Text } from "@/components/ui/Text";
import { IconButton } from "@/components/ui/IconButton";
import { ResourceState } from "@/components/ui/ResourceState";
import { useTheme } from "@/theme/ThemeProvider";
import { copy, uiCopy as c } from "@/constants/strings";
export function PrivacyReceipt() {
  const query = useMemoryQuery(["receipts"], () => api.getReceipts()); const { colors } = useTheme();
  return <Page eyebrow={c.receipt} title={c.receiptsTitle} subtitle={c.receiptsSubtitle} trailing={<IconButton accessibilityLabel={c.back} onPress={() => router.back()} icon={<ArrowLeft accessible={false} size={24} color={colors.foreground} />} />}><Text variant="caption" color="mutedForeground">{c.mockReceipt}</Text><ResourceState loading={query.isPending} error={query.error} empty={!query.isPending && !query.data?.length} retry={() => { void query.refetch(); }} />{query.data?.map(receipt => <View key={receipt.id} style={[layout.section, { padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }]}><Text variant="heading">{receipt.title}</Text><Text variant="caption" color="mutedForeground">{copy(c.receiptStats, { files: receipt.files, size: receipt.sizeMb.toFixed(1), seconds: receipt.audioSec, frames: receipt.frames })}</Text><View style={layout.row}><ShieldCheck accessible={false} size={24} color={colors.foreground} /><Text variant="caption">{c.rawDeleted}</Text></View></View>)}</Page>;
}
