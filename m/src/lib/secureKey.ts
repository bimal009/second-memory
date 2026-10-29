import * as SecureStore from "expo-secure-store";
const KEY = "api_key";
export const readKey = () => SecureStore.getItemAsync(KEY);
export const saveKey = (key: string) => SecureStore.setItemAsync(KEY, key);
export const clearKey = () => SecureStore.deleteItemAsync(KEY);
