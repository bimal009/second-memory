import React, { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getPrivacyReceipt, useSimulation } from "@/api";
import { AppScreen, ResponsiveColumns, appStyles } from "@/components/ui/AppScreen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { LoadingRows, CalmEmpty } from "@/components/domain/ListStates";
import { ConnectionBanner } from "@/components/domain/ConnectionBanner";
import { DeleteAllSheet } from "@/components/domain/DeleteAllSheet";
import { useTheme } from "@/theme/ThemeProvider";

export function PrivacyScreen() {
  const { colors } = useTheme();
  const simulation = useSimulation();
  const [deleting, setDeleting] = useState(false);
  const query = useQuery({ queryKey: ["demo", "privacy", simulation], queryFn: getPrivacyReceipt, retry: false });
  const receipt = query.data;
  return <AppScreen title="Privacy receipt" back subtitle="Nothing is uploaded until you trigger it.">
    {query.isPending ? <LoadingRows /> : query.error ? <ConnectionBanner error={query.error} onRetry={() => void query.refetch()} /> : receipt && <ResponsiveColumns>{[
      <View key="uploads" style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="heading">Left your phone</Text><Text variant="caption" color="mutedForeground">Uploads you triggered</Text>{!receipt.uploads.length ? <CalmEmpty title="Nothing sent" body="Uploads will appear here when you save a moment." /> : receipt.uploads.map(upload => <View key={upload.time} style={[appStyles.row, { minHeight: 56 }]}><Text variant="body" style={appStyles.flex}>{upload.time}</Text><Text variant="caption" color="mutedForeground">{upload.size}</Text></View>)}</View>,
      <View key="storage" style={appStyles.section}><View style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="heading">Deleted</Text><Text variant="display">{receipt.deletedRawFiles}</Text><Text variant="body" color="mutedForeground">Raw files removed after processing</Text></View><View style={[appStyles.panel, { backgroundColor: colors.secondary }]}><Text variant="heading">Still stored</Text><View style={appStyles.row}><Text variant="body" style={appStyles.flex}>Text memories</Text><Text variant="heading">{receipt.storedMemories}</Text></View><View style={appStyles.row}><Text variant="body" style={appStyles.flex}>Frames</Text><Text variant="heading">{receipt.storedFrames}</Text></View></View></View>,
    ]}</ResponsiveColumns>}
    <Button label="Delete everything" variant="danger" style={{ borderRadius: 28 }} onPress={() => setDeleting(true)} />
    {deleting && <DeleteAllSheet everything onClose={() => setDeleting(false)} />}
  </AppScreen>;
}
