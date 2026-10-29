import { create, isAxiosError } from "axios";
import { clearKey, readKey } from "@/lib/secureKey";
import { restartBootstrap } from "@/lib/queryClient";

export const axiosInstance = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { "ngrok-skip-browser-warning": "true" },
});

axiosInstance.interceptors.request.use(async (config) => {
  const key = await readKey();
  if (key) config.headers.set("X-API-Key", key);
  return config;
});

axiosInstance.interceptors.response.use(undefined, async (error: unknown) => {
  if (isAxiosError(error) && error.response?.status === 401) {
    await clearKey();
    void restartBootstrap();
  }
  throw error;
});
