import { router } from "expo-router";
import { Alert } from "react-native";
import { getMemory } from "@/api/memory";
import { findLocalClip } from "@/lib/media";
import { strings } from "@/constants/strings";

export async function playLocalClipForMemory(memoryId: string): Promise<boolean> {
    try {
        const memory = await getMemory(memoryId);
        if (memory.chunk_idx === null) {
            Alert.alert(strings.memories.detail.clipMissing);
            return false;
        }
        const uri = await findLocalClip(memory.capture_id, memory.chunk_idx);
        if (!uri) {
            Alert.alert(strings.memories.detail.clipMissing);
            return false;
        }
        const firstFrame = memory.media.find((frame) => frame.kind === "frame");
        router.push({
            pathname: "/clip",
            params: {
                uri,
                offset_ms: String(firstFrame?.offset_ms ?? 0),
                title: memory.note.slice(0, 80),
            },
        });
        return true;
    }
    catch {
        Alert.alert(strings.memories.detail.clipMissing);
        return false;
    }
}
