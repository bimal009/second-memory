import { axiosInstance } from "@/axios";
import type { Recap, TrackedObject } from "@repo/types";

export async function listTrackedObjects(): Promise<TrackedObject[]> {
    const { data: objects } = await axiosInstance.get<TrackedObject[]>("/tracked-objects");
    return objects ?? [];
}

export async function untrackObject(id: string): Promise<void> {
    await axiosInstance.delete<null>(`/tracked-objects/${id}`);
}

export async function getRecap(): Promise<Recap> {
    const { data: recap } = await axiosInstance.get<Recap>("/recap");
    if (!recap)
        throw new Error("No recap yet");
    return recap;
}
