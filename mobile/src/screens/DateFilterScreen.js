import React, { useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemeContext } from '../context/ThemeContext';
import { X, Calendar } from 'lucide-react-native';

export default function DateFilterScreen({ route, navigation }) {
    const { onApply, currentRange } = route.params || {};
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Initialize with passed range or today
    const [startDate, setStartDate] = useState(currentRange?.start ? new Date(currentRange.start) : new Date());
    const [endDate, setEndDate] = useState(currentRange?.end ? new Date(currentRange.end) : new Date());
    const [selectedQuick, setSelectedQuick] = useState(null);

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Helper: Normalize Date to YYYY-MM-DD local
    const formatDate = (date) => {
        if (!date) return null;
        const pad = (n) => n < 10 ? '0' + n : n;
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    const handleApply = () => {
        const isAll = selectedQuick === 'All Time' || (!startDate && !endDate);

        // Single Day Logic for Custom Range
        let customLabel = selectedQuick || 'Custom';
        if (!selectedQuick && startDate && endDate) {
            const startStr = formatDate(startDate);
            const endStr = formatDate(endDate);
            if (startStr === endStr) {
                // Determine format based on day comparison? Just use easy read format
                // Requirement: "labelnya jangan sekedar Custom ya, tapi di tanggal itu"
                customLabel = startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            } else {
                customLabel = `${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
            }
        }

        const newRange = {
            start: isAll ? null : formatDate(startDate),
            end: isAll ? null : formatDate(endDate),
            label: customLabel
        };
        // Navigate back to Dashboard with params
        navigation.navigate('Main', {
            screen: 'Dashboard',
            params: { newDateFilter: newRange }
        });
    };

    const QuickRanges = [
        { label: 'All Time', type: 'all' },
        { label: 'Today', days: 0 },
        { label: 'Yesterday', days: -1 },
        { label: 'This Week', type: 'startOfWeek' },
        { label: 'Last Week', type: 'lastWeek' },
        { label: 'This Month', type: 'startOfMonth' },
        { label: 'Last Month', type: 'lastMonth' },
        { label: 'Last 7 Days', days: -6 }, // including today
        { label: 'Last 30 Days', days: -29 },
    ];

    const handleQuickSelect = (range) => {
        setSelectedQuick(range.label);
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (range.days !== undefined) {
            if (range.days === 0) { // Today
                // Start/End are already now
            } else if (range.days === -1) { // Yesterday
                start.setDate(now.getDate() - 1);
                end.setDate(now.getDate() - 1);
            } else { // Last N Days (Range ending today)
                start.setDate(now.getDate() + range.days); // Negative adds
            }
        } else if (range.type === 'startOfWeek') {
            // Basic implementation: Assuming Monday start
            const day = now.getDay() || 7; // Get current day number, converting Sun(0) to 7
            if (day !== 1) start.setHours(-24 * (day - 1));
            // End is today or end of week? Usually "This Week" implies up to now, 
            // but strictly it might mean the full week. Let's keep end as Today for "To Date" logic basically.
        } else if (range.type === 'startOfMonth') {
            start.setDate(1);
        } else if (range.type === 'lastMonth') {
            start.setMonth(now.getMonth() - 1);
            start.setDate(1);
            end.setDate(0); // Last day of previous month
        } else if (range.type === 'lastWeek') {
            // Simply -7 days start and end is startOfWeek?
            // Let's simplified logic: 7 days ago start
            start.setDate(now.getDate() - 7 - (now.getDay() || 7) + 1);
            end.setDate(start.getDate() + 6);
        } else if (range.type === 'all') {
            setStartDate(null);
            setEndDate(null);
            return; // Don't set Date objects
        }

        setStartDate(new Date(start));
        setEndDate(new Date(end));
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Date Range</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. Quick Ranges */}
                <Text style={styles.sectionTitle}>Quick Access</Text>
                <View style={styles.grid}>
                    {QuickRanges.map((range) => (
                        <TouchableOpacity
                            key={range.label}
                            style={[styles.chip, selectedQuick === range.label && styles.activeChip]}
                            onPress={() => handleQuickSelect(range)}
                        >
                            <Text style={[styles.chipText, selectedQuick === range.label && styles.activeChipText]}>
                                {range.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 2. Custom Range */}
                <Text style={styles.sectionTitle}>Custom Range</Text>
                <View style={styles.customRow}>
                    <View style={styles.dateBox}>
                        <Text style={styles.dateLabel}>Start Date</Text>
                        <TouchableOpacity style={styles.dateInput} onPress={() => { setShowStartPicker(true); }}>
                            <Calendar size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.dateValue}>{startDate ? formatDate(startDate) : '-'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dateBox}>
                        <Text style={styles.dateLabel}>End Date</Text>
                        <TouchableOpacity style={styles.dateInput} onPress={() => { setShowEndPicker(true); }}>
                            <Calendar size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.dateValue}>{endDate ? formatDate(endDate) : '-'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Date Pickers */}
                {showStartPicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                            setShowStartPicker(false);
                            if (date) {
                                setStartDate(date);
                                setSelectedQuick(null); // Clear quick select if custom modified
                            }
                        }}
                    />
                )}
                {showEndPicker && (
                    <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                            setShowEndPicker(false);
                            if (date) {
                                setEndDate(date);
                                setSelectedQuick(null);
                            }
                        }}
                    />
                )}

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                    <Text style={styles.applyText}>Apply Filter</Text>
                </TouchableOpacity>
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
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    content: {
        padding: 20
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginBottom: 12,
        marginTop: 8
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.card, // or slight grey
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: '48%',
        alignItems: 'center'
    },
    activeChip: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary
    },
    chipText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500'
    },
    activeChipText: {
        color: theme.colors.background, // Contrast
        fontWeight: 'bold'
    },
    customRow: {
        flexDirection: 'row',
        gap: 16
    },
    dateBox: {
        flex: 1
    },
    dateLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 8
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 8
    },
    dateValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border
    },
    applyBtn: {
        backgroundColor: theme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center'
    },
    applyText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 16
    }
});
