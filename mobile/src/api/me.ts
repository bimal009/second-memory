import { axiosInstance } from "@/axios";
import type { MeOnboard, MeOnboardOut, MeOut } from "@/types/me";
import type { DeviceIn } from "@/types/device";

export async function onboard(data: MeOnboard): Promise<MeOnboardOut> {
  const response = await axiosInstance.post<MeOnboardOut>("/onboard", data);
  return response.data;
}

export async function getMe(): Promise<MeOut> {
  const response = await axiosInstance.get<MeOut>("/me");
  return response.data;
}

export async function createDevice(data: DeviceIn): Promise<void> {
  await axiosInstance.post("/devices", data);
}
