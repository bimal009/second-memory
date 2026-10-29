import { axiosInstance } from "@/axios";
import type { DeviceIn } from "@/types/device";

export async function createDevice(data: DeviceIn): Promise<void> {
  await axiosInstance.post("/devices", data);
}
