import axios from 'axios';

// Saat development fitur baru (Attendance & Dashboard) kita pakai Localhost
// Android Emulator gunakan 10.0.2.2 sebagai ganti localhost
// iOS Simulator gunakan localhost atau IP laptop Anda
export const BASE_URL = 'http://192.168.1.70:8000/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': 'KunciRahasiaKopeng123',
    },
});

import AsyncStorage from '@react-native-async-storage/async-storage';

api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
