import React from "react";
import { View } from "react-native";
import { Check, CloudUpload } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { copy, uiCopy as c } from "@/constants/strings";
import { darkColors } from "@/theme/tokens";
export function ChunkStatus({ uploaded, waiting }: { uploaded: number; waiting: number }) {
  return <View accessibilityLiveRegion="polite" style={{ gap: 8, alignItems: "center" }}><View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Check accessible={false} color={darkColors.foreground} size={18} /><Text variant="caption" style={{ color: darkColors.foreground }}>{uploaded ? copy(c.chunkUploaded, { count: uploaded }) : c.noChunks}</Text></View>{waiting > 0 && <View style={{ flexDirection: "row", gap: 8 }}><CloudUpload accessible={false} size={18} color={darkColors.primary} /><Text variant="caption" style={{ color: darkColors.foreground }}>{copy(c.chunksWaiting, { count: waiting })}</Text></View>}</View>;
}
