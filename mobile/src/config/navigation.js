import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { LayoutDashboard, Users, ShoppingCart, ClipboardList, CalendarCheck } from 'lucide-react-native';

import DashboardScreen from '../screens/DashboardScreen';
import MembershipScreen from '../screens/MembershipScreen';
import POSScreen from '../screens/POSScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import RekapScreen from '../screens/RekapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MemberDetailScreen from '../screens/MemberDetailScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import PresenceDetailScreen from '../screens/PresenceDetailScreen';
import DateFilterScreen from '../screens/DateFilterScreen'; // Import
import TopSalesScreen from '../screens/TopSalesScreen';
import ShiftRecapScreen from '../screens/ShiftRecapScreen';
import ReportExportScreen from '../screens/ReportExportScreen'; // Import
// import { theme } from '../config/theme';
import { ThemeContext } from '../context/ThemeContext';
import { useContext } from 'react';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    const { theme } = useContext(ThemeContext);
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.card,
                    borderTopColor: theme.colors.border,
                    height: 60,
                    paddingBottom: 5,
                    paddingTop: 5,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Dashboard') return <LayoutDashboard size={size} color={color} />;
                    if (route.name === 'POS') return <ShoppingCart size={size} color={color} />;
                    if (route.name === 'Membership') return <Users size={size} color={color} />;
                    if (route.name === 'Rekap') return <ClipboardList size={size} color={color} />;
                    if (route.name === 'Presensi') return <CalendarCheck size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="POS" component={POSScreen} />
            <Tab.Screen name="Membership" component={MembershipScreen} />
            <Tab.Screen name="Rekap" component={RekapScreen} />
            <Tab.Screen name="Presensi" component={AttendanceScreen} />
        </Tab.Navigator>
    );
}

import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';

export default function AppNavigator() {
    const { isLoading, userToken } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {userToken == null ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Main" component={MainTabs} />
                        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text, title: '' }} />
                        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
                        <Stack.Screen name="PresenceDetail" component={PresenceDetailScreen} options={{ title: 'Attendance Detail' }} />
                        <Stack.Screen name="DateFilter" component={DateFilterScreen} options={{ presentation: 'modal', headerShown: false }} />
                        <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="TopSales" component={TopSalesScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="ShiftRecap" component={ShiftRecapScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="ReportExport" component={ReportExportScreen} options={{ headerShown: false }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
