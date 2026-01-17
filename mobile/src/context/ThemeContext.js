import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const lightTheme = {
    colors: {
        primary: '#C7C400', // Darker Yellow for visibility on white
        background: '#FFFFFF', // White
        card: '#F5F5F5', // Light Grey Enc
        text: '#000000',
        textSecondary: '#666666',
        danger: '#FF4D4D',
        success: '#4CD964',
        border: '#E0E0E0'
    },
    spacing: { s: 8, m: 16, l: 24, xl: 32 }
};

export const darkTheme = {
    colors: {
        primary: '#E6E31A', // Vibrant Yellow
        background: '#0B0B0B', // Deep Black
        card: '#1A1A1A', // Dark Grey Card
        text: '#FFFFFF',
        textSecondary: '#A0A0A0',
        danger: '#FF4D4D',
        success: '#4CD964',
        border: '#333333'
    },
    spacing: { s: 8, m: 16, l: 24, xl: 32 }
};

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(true); // Default to Dark

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const storedTheme = await AsyncStorage.getItem('theme');
            if (storedTheme) {
                setIsDarkMode(storedTheme === 'dark');
            }
        } catch (e) {
            console.log(e);
        }
    };

    const toggleTheme = async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        try {
            await AsyncStorage.setItem('theme', newMode ? 'dark' : 'light');
        } catch (e) {
            console.log(e);
        }
    };

    const theme = isDarkMode ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
            {children}
        </ThemeContext.Provider>
    );
};
