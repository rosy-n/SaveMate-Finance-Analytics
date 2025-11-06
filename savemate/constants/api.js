// app/constants/api.js  또는 프로젝트 루트의 /constants/api.js
import Constants from 'expo-constants';

export const API_BASE_URL =
  (Constants.expoConfig?.extra && Constants.expoConfig.extra.API_BASE_URL) ||
  'http://localhost:8080';
