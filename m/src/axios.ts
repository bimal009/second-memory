import { create } from "axios";
import { clearKey, readKey } from "@/lib/secureKey";
import { restartBootstrap } from "@/lib/queryClient";

export const axiosInstance = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10_000,
  headers: { "ngrok-skip-browser-warning": "true" },
});

axiosInstance.interceptors.request.use(async (config) => {
  const key = await readKey();
  if (key) config.headers.set("X-API-Key", key);
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => {
    res.data = res.data.data;
    return res;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await clearKey();
      void restartBootstrap();
    }
    throw error;
  },
);
