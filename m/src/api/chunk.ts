import { axiosInstance } from "@/axios";
import type { Chunk, CreateChunkSchema } from "@repo/types";
export type UploadChunkInput = CreateChunkSchema & {
    uri: string;
    mime?: string;
    name?: string;
};
export async function uploadChunk(captureId: string, input: UploadChunkInput): Promise<Chunk> {
    const form = new FormData();
    const name = input.name ?? `${input.idx}.mp4`;
    const type = input.mime ?? "video/mp4";
    form.append("file", {
        uri: input.uri,
        name,
        type,
    } as unknown as Blob);
    form.append("idx", String(input.idx));
    form.append("started_at", input.started_at instanceof Date
        ? input.started_at.toISOString()
        : String(input.started_at));
    if (input.duration_s !== undefined) {
        form.append("duration_s", String(input.duration_s));
    }
    if (input.lat !== undefined && input.lng !== undefined) {
        form.append("lat", String(input.lat));
        form.append("lng", String(input.lng));
        if (input.accuracy_m !== undefined) {
            form.append("accuracy_m", String(input.accuracy_m));
        }
    }
    const { data: chunk } = await axiosInstance.post<Chunk>(`/captures/${captureId}/chunks`, form, { timeout: 120000 });
    if (!chunk)
        throw new Error("Chunk upload returned no data");
    return chunk;
}
export async function listChunks(captureId: string): Promise<Chunk[]> {
    const { data: chunks } = await axiosInstance.get<Chunk[]>(`/captures/${captureId}/chunks`);
    return chunks ?? [];
}
export async function getChunk(captureId: string, idx: number): Promise<Chunk> {
    const { data: chunk } = await axiosInstance.get<Chunk>(`/captures/${captureId}/chunks/${idx}`);
    if (!chunk)
        throw new Error("Chunk not found");
    return chunk;
}
export async function deleteChunk(captureId: string, idx: number): Promise<void> {
    await axiosInstance.delete<null>(`/captures/${captureId}/chunks/${idx}`);
}
