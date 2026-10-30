import React, { useState } from "react";
import { View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Waveform } from "@/components/domain/Waveform";
import { ChunkStatus } from "@/components/domain/ChunkStatus";
import { useAppPager } from "@/features/pager/AppPagerProvider";
import { uiCopy as c } from "@/constants/strings";
import { darkColors, mediaColors } from "@/theme/tokens";
import { clock } from "./clock";
function KeepAwake() { useKeepAwake("second-memory-session"); return null; }
export function SessionControls({ dim, toggleDim }: { dim: boolean; toggleDim: () => void }) {
  const { session } = useAppPager(); const [confirm, setConfirm] = useState(false);
  return <View style={{ gap: 12, padding: 16, borderRadius: 10, backgroundColor: mediaColors.strongScrim }}>
    {session.active && <KeepAwake />}
    <Text variant="title" align="center" style={{ color: darkColors.foreground }}>{clock(session.seconds)}</Text><Waveform active={session.active} /><ChunkStatus uploaded={session.uploaded} waiting={session.waiting} />
    <Text variant="caption" align="center" style={{ color: darkColors.foreground }}>{c.keepAwake} · {c.sessionConsent}</Text>
    <Text variant="micro" align="center" style={{ color: darkColors.mutedForeground }}>{session.warning ? c.sessionWarning : c.quality}</Text>
    <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", flexWrap: "wrap" }}><Button label={dim ? c.preview : c.dim} variant="onMedia" onPress={toggleDim} /><Button label={c.sessionStop} variant="onMedia" onPress={() => session.seconds < 10 ? setConfirm(true) : void session.stop()} /></View>
    <BottomSheet visible={confirm} title={c.shortSession} onClose={() => setConfirm(false)}><Text>{c.shortBody}</Text><Button label={c.stop} onPress={() => { setConfirm(false); void session.stop(); }} /><Button label={c.cancel} variant="secondary" onPress={() => setConfirm(false)} /></BottomSheet>
  </View>;
}
