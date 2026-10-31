import { axiosInstance } from "@/axios";
import type { Capture, CreateCaptureSchema } from "@repo/types";
export async function createCapture(data: CreateCaptureSchema = { source: "phone" }): Promise<Capture> {
    const { data: capture } = await axiosInstance.post<Capture>("/captures", data);
    if (!capture)
        throw new Error("Capture create returned no data");
    return capture;
}
export async function listCaptures(): Promise<Capture[]> {
    const { data: captures } = await axiosInstance.get<Capture[]>("/captures");
    return captures ?? [];
}
export async function getCapture(id: string): Promise<Capture> {
    const { data: capture } = await axiosInstance.get<Capture>(`/captures/${id}`);
    if (!capture)
        throw new Error("Capture not found");
    return capture;
}
export async function endCapture(id: string): Promise<Capture> {
    const { data: capture } = await axiosInstance.post<Capture>(`/captures/${id}/end`);
    if (!capture)
        throw new Error("Capture end returned no data");
    return capture;
}
export async function deleteCapture(id: string): Promise<void> {
    await axiosInstance.delete<null>(`/captures/${id}`);
}
