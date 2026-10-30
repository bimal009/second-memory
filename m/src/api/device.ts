import { axiosInstance } from "@/axios";
import type { CreateDeviceSchema, Device, UpdateDeviceSchema } from "@repo/types";

export async function createDevice(data: CreateDeviceSchema): Promise<Device> {
  const { data: device } = await axiosInstance.post<Device>("/devices", data);
  if (!device) throw new Error("Device create returned no data");
  return device;
}

export async function listDevices(): Promise<Device[]> {
  const { data: devices } = await axiosInstance.get<Device[]>("/devices");
  return devices ?? [];
}

export async function updateDevice(
  id: string,
  data: UpdateDeviceSchema,
): Promise<Device> {
  const { data: device } = await axiosInstance.patch<Device>(
    `/devices/${id}`,
    data,
  );
  if (!device) throw new Error("Device update returned no data");
  return device;
}

export async function deleteDevice(id: string): Promise<void> {
  await axiosInstance.delete<null>(`/devices/${id}`);
}
