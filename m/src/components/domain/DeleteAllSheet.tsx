import React, { useState } from "react";
import { TextInput } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { deleteMemoriesAndReset } from "@/lib/resetDevice";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { appStyles } from "@/components/ui/AppScreen";
import { useTheme } from "@/theme/ThemeProvider";
import { ConnectionBanner } from "./ConnectionBanner";

export function DeleteAllSheet({ onClose, onDeleted, everything = false }: { onClose: () => void; onDeleted?: () => void; everything?: boolean }) {
  const { colors } = useTheme();
  const [typed, setTyped] = useState("");
  const mutation = useMutation({ mutationFn: () => deleteMemoriesAndReset(everything), onSuccess: () => { onDeleted?.(); onClose(); } });
  return <BottomSheet visible title={everything ? "Delete everything?" : "Delete all memories?"} onClose={() => !mutation.isPending && onClose()}>
    <Text variant="body">{everything ? "All saved memories, frames, and reminders will be removed." : "All saved memories and frames will be removed."} Your device key will be cleared and you’ll return to setup.</Text>
    <Text variant="caption" color="mutedForeground">Type DELETE to confirm.</Text>
    <TextInput accessibilityLabel="Type DELETE to confirm" autoCapitalize="characters" autoCorrect={false} value={typed} onChangeText={setTyped} placeholder="DELETE" placeholderTextColor={colors.mutedForeground} style={[appStyles.input, { backgroundColor: colors.secondary, color: colors.foreground }]} />
    {mutation.error && <ConnectionBanner error={mutation.error} onRetry={() => mutation.mutate()} />}
    <Button label={everything ? "Delete everything" : "Delete all memories"} variant="danger" disabled={typed.trim() !== "DELETE"} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    <Button label="Keep my memories" variant="secondary" disabled={mutation.isPending} onPress={onClose} />
  </BottomSheet>;
}
