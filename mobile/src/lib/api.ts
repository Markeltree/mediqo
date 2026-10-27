import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const configuredUrl: string = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:4000/api';
// The Android emulator reaches the host machine via 10.0.2.2, not localhost
export const API_URL: string =
  Platform.OS === 'android' ? configuredUrl.replace(/\/\/(localhost|127\.0\.0\.1)/, '//10.0.2.2') : configuredUrl;
const TOKEN_KEY = 'mediqo_token';

export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);
