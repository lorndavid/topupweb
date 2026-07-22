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

/**
 * CutLuy API client for KHQR payment processing.
 *
 * CutLuy uses Bearer token authentication with the store's API key.
 * The API key identifies which store (and which ABA PayWay payment link)
 * the request acts on.
 */
export const cutluyApi = axios.create({
  timeout: API_TIMEOUT,
  baseURL: config.cutluy.apiUrl || 'https://cutluy.com/v1',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(config.cutluy.apiKey ? { Authorization: `Bearer ${config.cutluy.apiKey}` } : {}),
  },
});

// Keep the auth header in sync if config changes at runtime
cutluyApi.interceptors.request.use((reqConfig) => {
  if (config.cutluy.apiKey) {
    reqConfig.headers.Authorization = `Bearer ${config.cutluy.apiKey}`;
  }
  return reqConfig;
});
