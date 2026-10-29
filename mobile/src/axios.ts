import { create, isAxiosError } from "axios";
import { clearKey, readKey } from "@/lib/secureKey";
import { restartBootstrap } from "@/features/bootstrap/events";
export const axiosInstance = create({ timeout: 10000 });
axiosInstance.interceptors.request.use(async config => {
  const baseURL = process.env.EXPO_PUBLIC_API_URL;
  if (!baseURL) throw new Error("EXPO_PUBLIC_API_URL is not configured.");
  config.baseURL = baseURL;
  config.headers.set("ngrok-skip-browser-warning", "true");
  const key = await readKey();
  if (key) config.headers.set("X-API-Key", key);
  return config;
});
axiosInstance.interceptors.response.use(response => response, async (error: unknown) => {
  if (isAxiosError(error) && error.response?.status === 401) {
    await clearKey();
    restartBootstrap();
  }
  return Promise.reject(error);
});
