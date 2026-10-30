import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useRefreshMemories } from "@/api/useMemoryQuery";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Field } from "@/components/ui/Page";
import { uiCopy as c } from "@/constants/strings";
export function DeleteMemoriesSheet({ close }: { close: () => void }) {
  const [typed, setTyped] = useState(""); const refresh = useRefreshMemories();
  const request = useMutation({ mutationFn: () => api.deleteAllMemories(), onSuccess: () => { refresh(); close(); } });
  return <BottomSheet visible title={c.deleteAll} onClose={() => { if (!request.isPending) close(); }}><Text>{c.deleteAllBody}</Text><Field accessibilityLabel={c.deletePlaceholder} placeholder={c.deletePlaceholder} value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />{request.error && <Text color="destructive">{c.error}</Text>}<Button label={c.deleteAll} variant="danger" disabled={typed !== c.deleteConfirm} loading={request.isPending} onPress={() => request.mutate()} /><Button label={c.keepMemories} variant="secondary" disabled={request.isPending} onPress={close} /></BottomSheet>;
}
