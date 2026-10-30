import React from "react";
import { useOptionalCapture } from "@/features/run/CaptureProvider";
import { RecordingPill } from "./RecordingPill";
import { clock } from "@/features/session/clock";
export function CaptureIndicator() { const capture = useOptionalCapture(); return capture?.status === "capturing" ? <RecordingPill timer={clock(capture.elapsed)} /> : null; }
