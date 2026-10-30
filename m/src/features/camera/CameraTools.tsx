import React from "react";
import { View } from "react-native";
import { SwitchCamera, Zap, ZapOff, MapPin, MapPinOff, Pause, Play, Moon, Sun } from "lucide-react-native";
import { IconButton } from "@/components/ui/IconButton";
import { darkColors, mediaColors } from "@/theme/tokens";
import { uiCopy as c, captureCopy as r } from "@/constants/strings";
import { useCapture } from "@/features/run/CaptureProvider";
export function CameraTools() {
  const capture = useCapture(); const location = capture.settings.data?.locationEnabled ?? true; const paused = capture.status !== "capturing";
  const controls = [
    { label: c.flip, Icon: SwitchCamera, action: capture.flip },
    { label: capture.flash ? c.flashOff : c.flashOn, Icon: capture.flash ? Zap : ZapOff, action: capture.toggleFlash },
    { label: location ? c.locationOff : c.locationOn, Icon: location ? MapPin : MapPinOff, action: () => capture.settings.update({ locationEnabled: !location }) },
    { label: capture.dim ? r.showPreview : r.dimPreview, Icon: capture.dim ? Sun : Moon, action: capture.toggleDim },
    { label: paused ? r.resume : r.pause, Icon: paused ? Play : Pause, action: () => paused ? capture.resume() : capture.pause(), disabled: capture.status === "idle" },
  ];
  return <View style={{ gap: 8 }}>{controls.map(({ label, Icon, action, disabled }) => <IconButton key={label} accessibilityLabel={label} onPress={action} disabled={disabled} icon={<Icon size={24} color={darkColors.foreground} accessible={false} />} style={{ backgroundColor: mediaColors.strongScrim }} />)}</View>;
}
