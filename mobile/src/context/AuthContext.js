import React, { createContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as loginService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userData, setUserData] = useState(null);

    const authContext = useMemo(() => ({
        login: async (email, password) => {
            try {
                const data = await loginService(email, password);
                // Save token & user
                // API returns 'access_token', not 'token'
                if (data.access_token) {
                    await AsyncStorage.setItem('userToken', data.access_token);
                    await AsyncStorage.setItem('userData', JSON.stringify(data.user));

                    setUserToken(data.access_token);
                    setUserData(data.user);
                } else {
                    throw { message: 'No access token received' };
                }
            } catch (e) {
                throw e;
            }
        },
        logout: async () => {
            try {
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('userData');
                setUserToken(null);
                setUserData(null);
                setUserData(null);
            } catch (e) {
                console.error(e);
            }
        },
        updateUser: async (newUser) => {
            // Merges new user data (e.g. photo_url)
            const updated = { ...userData, ...newUser };
            await AsyncStorage.setItem('userData', JSON.stringify(updated));
            setUserData(updated);
        },
        isLoading,
        userToken,
        userData
    }), [isLoading, userToken, userData]);

    useEffect(() => {
        const bootstrapAsync = async () => {
            let token = null;
            let user = null;
            try {
                token = await AsyncStorage.getItem('userToken');
                const userJson = await AsyncStorage.getItem('userData');
                if (userJson) user = JSON.parse(userJson);
            } catch (e) {
                // Restoring token failed
            }
            setUserToken(token);
            setUserData(user);
            setIsLoading(false);
        };

        bootstrapAsync();
    }, []);

    return (
        <AuthContext.Provider value={authContext}>
            {children}
        </AuthContext.Provider>
    );
};
