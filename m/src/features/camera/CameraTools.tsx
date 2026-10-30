import React from "react";
import { View } from "react-native";
import { SwitchCamera, Zap, ZapOff, MapPin, MapPinOff, Pause, Play } from "lucide-react-native";
import { IconButton } from "@/components/ui/IconButton";
import { darkColors, mediaColors } from "@/theme/tokens";
import { uiCopy as c } from "@/constants/strings";
export function CameraTools({ flip, flash, setFlash, location, setLocation, paused, togglePause, session }: { flip: () => void; flash: boolean; setFlash: () => void; location: boolean; setLocation: () => void; paused: boolean; togglePause: () => void; session: boolean }) {
  const controls = [{ label: c.flip, Icon: SwitchCamera, action: flip }, { label: flash ? c.flashOff : c.flashOn, Icon: flash ? Zap : ZapOff, action: setFlash }, { label: location ? c.locationOff : c.locationOn, Icon: location ? MapPin : MapPinOff, action: setLocation }, { label: paused ? c.resume : c.pause, Icon: paused ? Play : Pause, action: togglePause, disabled: session }];
  return <View style={{ gap: 8 }}>{controls.map(({ label, Icon, action, disabled }) => <IconButton key={label} accessibilityLabel={label} onPress={action} disabled={disabled} icon={<Icon size={24} color={darkColors.foreground} accessible={false} />} style={{ backgroundColor: mediaColors.strongScrim }} />)}</View>;
}
