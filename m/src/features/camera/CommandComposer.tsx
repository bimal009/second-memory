import React, { useState } from "react";
import { View } from "react-native";
import { Field } from "@/components/ui/Page";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useMemoryQuery } from "@/api/useMemoryQuery";
import { api } from "@/api/client";
import { captureCopy as c } from "@/constants/strings";
export function CommandComposer({ close, send }: { close: () => void; send: (text: string) => void }) {
  const [text, setText] = useState(""); const examples = useMemoryQuery(["command-examples"], () => api.getCommandExamples());
  return <BottomSheet visible title={c.commandLabel} onClose={close}><Text>{c.commandLabel}</Text><Field accessibilityLabel={c.commandLabel} placeholder={c.commandPlaceholder} value={text} onChangeText={setText} autoFocus returnKeyType="send" onSubmitEditing={() => { if (text.trim()) { send(text); close(); } }} /><Button label={c.send} disabled={!text.trim()} onPress={() => { send(text); close(); }} /><View style={{ gap: 8 }}>{examples.data?.map(example => <Button key={example} label={example} variant="secondary" onPress={() => { send(example); close(); }} />)}</View></BottomSheet>;
}
