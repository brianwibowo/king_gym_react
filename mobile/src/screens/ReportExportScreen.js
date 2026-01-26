import React, { useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { ChevronLeft, FileText, Calendar, CheckCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../config/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';

export default function ReportExportScreen({ navigation }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [exportType, setExportType] = useState('daily'); // daily, monthly, yearly
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // Helpers
    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const getFormattedDate = () => {
        if (exportType === 'daily') return date.toISOString().split('T')[0];
        if (exportType === 'monthly') return `${date.getFullYear()}-${date.getMonth() + 1}`; // Just purely logic
        return `${date.getFullYear()}`;
    };

    const handleDownload = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');

            let query = `type=${exportType}`;
            const y = date.getFullYear();
            const m = date.getMonth() + 1;
            const d = date.getDate();

            if (exportType === 'daily') {
                const dateStr = date.toISOString().split('T')[0];
                query += `&date=${dateStr}`;
            } else if (exportType === 'monthly') {
                query += `&month=${m}&year=${y}`;
            } else if (exportType === 'yearly') {
                query += `&year=${y}`;
            }

            const downloadUrl = `${BASE_URL}/export/excel?${query}`;
            const filename = `Laporan_${exportType}_${new Date().getTime()}.xlsx`;
            const fileUri = FileSystem.documentDirectory + filename;

            // Use createDownloadResumable for better compatibility
            const downloadResumable = FileSystem.createDownloadResumable(
                downloadUrl,
                fileUri,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const downloadRes = await downloadResumable.downloadAsync();

            if (downloadRes.status !== 200) {
                Alert.alert('Error', 'Download failed. Check server logs.');
                return;
            }

            Alert.alert(
                'Success ✅',
                'Report downloaded successfully.',
                [
                    { text: 'Okay' },
                    {
                        text: 'Open',
                        isPreferred: true,
                        onPress: async () => {
                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(downloadRes.uri);
                            }
                        }
                    }
                ]
            );

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Export failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Export Financial Report</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>1. Select Report Type</Text>
                <View style={styles.typeContainer}>
                    {['daily', 'monthly', 'yearly'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.typeCard,
                                exportType === type && styles.activeTypeCard
                            ]}
                            onPress={() => setExportType(type)}
                        >
                            {exportType === type && (
                                <View style={styles.checkIcon}>
                                    <CheckCircle size={16} color="#fff" />
                                </View>
                            )}
                            <FileText size={24} color={exportType === type ? '#fff' : theme.colors.textSecondary} />
                            <Text style={[
                                styles.typeText,
                                exportType === type && styles.activeTypeText
                            ]}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                            <Text style={[styles.typeDesc, exportType === type && { color: 'rgba(255,255,255,0.7)' }]}>
                                {type === 'daily' && 'Split Shift Tables'}
                                {type === 'monthly' && 'Multi-sheet (Per Day)'}
                                {type === 'yearly' && 'Monthly Summary'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>2. Select Period</Text>
                <View style={styles.dateContainer}>
                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                        <Calendar size={20} color={theme.colors.text} />
                        <Text style={styles.dateText}>
                            {exportType === 'daily' && date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            {exportType === 'monthly' && date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            {exportType === 'yearly' && date.getFullYear()}
                        </Text>
                    </TouchableOpacity>
                    <Text style={styles.helpText}>
                        Tap to change {exportType === 'yearly' ? 'Year' : (exportType === 'monthly' ? 'Month' : 'Date')}
                    </Text>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                    />
                )}

                <TouchableOpacity
                    style={[styles.downloadBtn, loading && { opacity: 0.7 }]}
                    onPress={handleDownload}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.downloadText}>Download Report</Text>}
                </TouchableOpacity>

            </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    content: {
        padding: theme.spacing.l,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
        marginTop: 8
    },
    typeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32
        // flexWrap: 'wrap' or just scroll? 3 items fit.
    },
    typeCard: {
        flex: 1,
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        position: 'relative'
    },
    activeTypeCard: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    checkIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    typeText: {
        marginTop: 8,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontSize: 14
    },
    activeTypeText: {
        color: '#fff'
    },
    typeDesc: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 4
    },
    dateContainer: {
        marginBottom: 40
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 12
    },
    dateText: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: 'bold'
    },
    helpText: {
        marginTop: 8,
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginLeft: 4
    },
    downloadBtn: {
        backgroundColor: theme.colors.success, // Green for excel
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20
    },
    downloadText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
