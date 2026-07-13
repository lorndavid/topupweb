import axios from 'axios';
import { API_TIMEOUT } from '../constants';
import { config } from '../config';

export const bay2gameApi = axios.create({
  timeout: API_TIMEOUT,
  baseURL: config.bay2game.apiUrl,
  headers: {
    Accept: 'application/json',
  },
});

export const bakongApi = axios.create({
  timeout: API_TIMEOUT,
  baseURL: config.bakong.apiUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(config.bakong.apiToken ? { Authorization: `Bearer ${config.bakong.apiToken}` } : {}),
  },
});

// Update Bakong auth header if token changes (at runtime)
bakongApi.interceptors.request.use((reqConfig) => {
  if (config.bakong.apiToken) {
    reqConfig.headers.Authorization = `Bearer ${config.bakong.apiToken}`;
  }
  return reqConfig;
});
