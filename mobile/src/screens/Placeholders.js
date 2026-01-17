import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../config/theme';

const Placeholder = ({ title }) => (
    <View style={styles.container}>
        <Text style={styles.text}>{title}</Text>
        <Text style={styles.subtext}>Coming Soon</Text>
    </View>
);

export const MembershipScreen = () => <Placeholder title="Membership" />;
export const POSScreen = () => <Placeholder title="POS System" />;
export const AttendanceScreen = () => <Placeholder title="Attendance" />;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        color: theme.colors.primary,
        fontSize: 24,
        fontWeight: 'bold'
    },
    subtext: {
        color: theme.colors.textSecondary,
        marginTop: 8
    }
});
