import { axiosInstance } from "@/axios";
import type { Memory } from "@repo/types";

export async function listMemories(limit = 20, before?: string): Promise<Memory[]> {
    const { data: memories } = await axiosInstance.get<Memory[]>("/memories", {
        params: before ? { limit, before } : { limit },
    });
    return memories ?? [];
}

export async function getMemory(id: string): Promise<Memory> {
    const { data: memory } = await axiosInstance.get<Memory>(`/memories/${id}`);
    if (!memory)
        throw new Error("Memory not found");
    return memory;
}
