import axios from 'axios';
import { API_TIMEOUT } from '../constants';

export const bay2gameApi = axios.create({
  timeout: API_TIMEOUT,
  headers: {
    Accept: 'application/json',
  },
});

export const bakongApi = axios.create({
  timeout: API_TIMEOUT,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});
