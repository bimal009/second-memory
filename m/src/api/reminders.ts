import { axiosInstance } from "@/axios";
import type { Reminder } from "@repo/types";

export async function listReminders(): Promise<Reminder[]> {
    const { data: reminders } = await axiosInstance.get<Reminder[]>("/reminders");
    return reminders ?? [];
}

export async function setReminderStatus(id: string, status: "done" | "dismissed"): Promise<Reminder> {
    const { data: reminder } = await axiosInstance.patch<Reminder>(`/reminders/${id}`, { status });
    if (!reminder)
        throw new Error("Reminder not found");
    return reminder;
}
