import api from '../config/api';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export const login = async (email, password) => {
    try {
        const response = await api.post('/login', { email, password });

        if (response.data.access_token) {
            // We handle storage in AuthContext now to keep it centralized
            // await SecureStore.setItemAsync(TOKEN_KEY, response.data.access_token);
            // await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.data.user));
        }

        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : { message: 'Network Error' };
    }
};

export const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
};

export const getToken = async () => {
    return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const getUser = async () => {
    const user = await SecureStore.getItemAsync(USER_KEY);
    return user ? JSON.parse(user) : null;
};
