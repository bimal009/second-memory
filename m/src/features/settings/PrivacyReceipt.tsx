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
import { copy, uiCopy as c, captureCopy as r } from "@/constants/strings";
export function PrivacyReceipt() {
  const query = useMemoryQuery(["run-receipts"], () => api.getRunReceipts()); const { colors } = useTheme();
  return <Page title={c.receipt} trailing={<IconButton accessibilityLabel={c.back} onPress={() => router.back()} icon={<ArrowLeft accessible={false} size={24} color={colors.foreground} />} />}>
    <Text variant="caption" color="mutedForeground">{r.noRawUpload}</Text><ResourceState loading={query.isPending} error={query.error} empty={!query.isPending && !query.data?.length} retry={() => { void query.refetch(); }} />
    {query.data?.map(receipt => <View key={receipt.runId} style={layout.section}><Text variant="heading">{receipt.title}</Text>{!receipt.chunks.length && <Text color="mutedForeground">{r.receiptPending}</Text>}{receipt.chunks.map((chunk, index) => <View key={chunk.id} style={{ gap: 12, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}><Text>{copy(r.receiptChunk, { count: index + 1 })}</Text><Text variant="caption" color="mutedForeground">{copy(c.receiptStats, { files: chunk.files, size: chunk.sizeMb.toFixed(1), seconds: chunk.audioSec, frames: chunk.frames })}</Text><View style={layout.row}><ShieldCheck accessible={false} size={24} color={colors.foreground} /><Text variant="caption">{chunk.rawDeleted ? c.rawDeleted : r.waiting}</Text></View></View>)}</View>)}
  </Page>;
}
