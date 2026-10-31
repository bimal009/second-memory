import { fetch } from "expo/fetch";
import { File, Paths } from "expo-file-system";
import { listChunksForCapture } from "@/lib/chunkDb";
import { readKey } from "@/lib/secureKey";

const cacheDir = Paths.cache;

export async function cacheThumb(mediaId: string): Promise<string | null> {
    try {
        const target = new File(cacheDir, `${mediaId}.jpg`);
        if (target.exists && target.size > 0)
            return target.uri;
        const key = await readKey();
        if (!key)
            return null;
        const url = `${process.env.EXPO_PUBLIC_API_URL}/media/${mediaId}`;
        const response = await fetch(url, {
            headers: { "X-API-Key": key, "ngrok-skip-browser-warning": "true" },
        });
        if (!response.ok)
            return null;
        await target.write(await response.bytes());
        return target.uri;
    }
    catch {
        return null;
    }
}

export async function findLocalClip(captureId: string, chunkIdx: number): Promise<string | null> {
    try {
        const rows = await listChunksForCapture(captureId);
        const row = rows.find((r) => r.idx === chunkIdx);
        if (!row?.path)
            return null;
        const file = new File(row.path);
        if (!file.exists || file.size < 1024)
            return null;
        return file.uri;
    }
    catch {
        return null;
    }
}
