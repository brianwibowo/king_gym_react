import React, { useState, useEffect, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import { ChevronLeft, ChevronRight, FileText, Download, Calendar } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

// Helper for Manual Download (Bypassing downloadAsync if deprecated/buggy)
const downloadFile = async (url, filename, token) => {
    try {
        // 1. Fetch as Blob/ArrayBuffer
        // Note: axios in React Native usually needs responseType 'blob' or 'arraybuffer'
        // But FileSystem.writeAsStringAsync expects base64 for binary
        // It's easier to use FileSystem.downloadAsync if it works. 
        // User said it's deprecated. Let's try the modern "downloadAsync" (maybe it's just a warning?)
        // ERROR says: "Method downloadAsync imported from "expo-file-system" is deprecated.. migrate to... expo-file-system/legacy"

        // Strategy: Use the legacy import if possible, but we can't easily change package.json here.
        // We will try to rely on `FileSystem.downloadAsync` but if it fails, we catch.
        // Wait, if the error is from the *import*, then we need to change the import.
        // User's error log: [Error: Method downloadAsync imported from "expo-file-system" is deprecated.]
        // This suggests it's a runtime error when CALLING it, or when Importing?
        // Usually these are warnings. If it throws Error, it's blocked.

        // Let's try to use `FileSystem.createDownloadResumable` -> `downloadAsync`?

        const fileUri = FileSystem.documentDirectory + filename;
        const downloadResumable = FileSystem.createDownloadResumable(
            url,
            fileUri,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const { uri } = await downloadResumable.downloadAsync();
        return { status: 200, uri };

    } catch (e) {
        console.error("Download Error", e);
        throw e;
    }
}

export default function ShiftRecapScreen({ navigation }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Date State (Using Date object for easier picker integration)
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Data State
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Derived State
    const selectedMonth = currentDate.getMonth() + 1;
    const selectedYear = currentDate.getFullYear();

    useEffect(() => {
        fetchRecap();
    }, [selectedMonth, selectedYear]);

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setCurrentDate(selectedDate);
        }
    };

    const changeMonth = (increment) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setCurrentDate(newDate);
    };

    const fetchRecap = async () => {
        try {
            setLoading(true);
            const response = await api.get('/attendance/rekap-shift', {
                params: { month: selectedMonth, year: selectedYear }
            });
            setData(response.data);
        } catch (error) {
            console.error('Fetch Recap Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const userToken = await AsyncStorage.getItem('userToken');
            const BASE_URL = api.defaults.baseURL;
            const filename = `rekap-shift-${selectedMonth}-${selectedYear}.xlsx`;
            const downloadUrl = `${BASE_URL}/attendance/export-shift?month=${selectedMonth}&year=${selectedYear}`;

            // Use createDownloadResumable to avoid direct downloadAsync deprecation if that's the issue
            const fileUri = FileSystem.documentDirectory + filename;
            const downloadResumable = FileSystem.createDownloadResumable(
                downloadUrl,
                fileUri,
                { headers: { Authorization: `Bearer ${userToken}` } }
            );

            const { uri } = await downloadResumable.downloadAsync();

            Alert.alert(
                'Download Successful! ✅',
                `File saved.`,
                [
                    {
                        text: 'Open/Share', onPress: async () => {
                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                            }
                        }
                    }
                ]
            );

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Download failed. ' + error.message);
        } finally {
            setExporting(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { flex: 2, textAlign: 'left' }]}>Name</Text>
            <Text style={styles.columnHeader}>Pagi</Text>
            <Text style={styles.columnHeader}>Sore</Text>
            <Text style={styles.columnHeader}>Total</Text>
        </View>
    );

    const renderItem = ({ item, index }) => (
        <View style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
            <Text style={[styles.cell, { flex: 2, textAlign: 'left', fontWeight: 'bold' }]}>{item.name}</Text>
            <Text style={styles.cell}>{item.pagi}</Text>
            <Text style={styles.cell}>{item.sore}</Text>
            <Text style={[styles.cell, { color: theme.colors.primary, fontWeight: 'bold' }]}>{item.total}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Rekap Shift</Text>

                <TouchableOpacity onPress={handleExport} disabled={exporting}>
                    {exporting ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Download size={24} color={theme.colors.primary} />}
                </TouchableOpacity>
            </View>

            {/* Date Picker */}
            <View style={styles.dateControl}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                    <ChevronLeft size={20} color={theme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.dateText}>
                        {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                    <ChevronRight size={20} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={currentDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* Content */}
            <View style={styles.content}>
                {renderHeader()}
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={data}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => index.toString()}
                        ListEmptyComponent={<Text style={styles.emptyText}>No data for this month.</Text>}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    dateControl: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.colors.card,
        margin: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    dateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    navBtn: {
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 8
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.border,
        marginBottom: 8
    },
    columnHeader: {
        flex: 1,
        textAlign: 'center',
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        fontSize: 12
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border + '50' // Light border
    },
    rowAlt: {
        backgroundColor: theme.colors.card + '50'
    },
    cell: {
        flex: 1,
        textAlign: 'center',
        color: theme.colors.text,
        fontSize: 14
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        marginTop: 20
    }
});
