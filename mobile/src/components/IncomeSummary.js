import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import PieChart from 'react-native-pie-chart';
import { ThemeContext } from '../context/ThemeContext';
import { Filter, Calendar } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

export default function IncomeSummary({ data, onFilterPress, dateLabel }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const chartSize = 180;
    // Data order: Membership, Product
    // If no data, show placeholder or grey? For now assume data or 0.
    // Library needs non-zero series or handle empty?
    // If total is 0, passing [0,0] might crash or show nothing. Let's handle it.

    // Colors: Membership (Primary), Product (Secondary/Accent or Info)
    // Primary: theme.colors.primary (Yellow)
    // Product: Blue or Green? User said "Warna sekunder (kontras tapi lembut)". 
    // Let's use a soft Blue: #4FC3F7 or theme.colors.card + border? No needs contrast.

    const membershipColor = theme.colors.primary;
    const productColor = '#2196F3';
    const emptyColor = theme.colors.border;

    const rawSeries = [
        { value: data.membership, color: membershipColor },
        { value: data.product, color: productColor }
    ];

    // Filter out zero values for the Chart ONLY
    const validData = rawSeries.filter(d => d.value > 0);

    let displaySeries;
    if (validData.length === 0) {
        displaySeries = [{ value: 1, color: emptyColor }];
    } else {
        displaySeries = validData.map(d => ({
            value: d.value,
            color: d.color
        }));
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Income Summary</Text>
                    <Text style={styles.subtitle}>{dateLabel || 'Today'}</Text>
                </View>
                <TouchableOpacity onPress={onFilterPress} style={styles.filterBtn}>
                    <Calendar size={20} color={theme.colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.chartRow}>
                <View style={styles.chartWrapper}>
                    <PieChart
                        widthAndHeight={chartSize}
                        series={displaySeries}
                        coverRadius={0.65} // Donut
                    />
                    <View style={styles.chartOverlay}>
                        <Text style={styles.totalLabel}>Total Income</Text>
                        <Text style={styles.totalValue}>Rp {data.total.toLocaleString('id-ID')}</Text>
                    </View>
                </View>
            </View>

            {/* Legend Breakdown */}
            <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                    <View style={styles.legendHeader}>
                        <View style={[styles.dot, { backgroundColor: membershipColor }]} />
                        <Text style={styles.categoryName}>Membership</Text>
                    </View>
                    <Text style={styles.categoryPercent}>{data.membership_percentage}%</Text>
                    <Text style={styles.categoryValue}>Rp {data.membership.toLocaleString('id-ID')}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.legendItem}>
                    <View style={styles.legendHeader}>
                        <View style={[styles.dot, { backgroundColor: productColor }]} />
                        <Text style={styles.categoryName}>Product (FnB)</Text>
                    </View>
                    <Text style={styles.categoryPercent}>{data.product_percentage}%</Text>
                    <Text style={styles.categoryValue}>Rp {data.product.toLocaleString('id-ID')}</Text>
                </View>
            </View>
        </View>
    );
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 20,
        marginHorizontal: theme.spacing.l,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4
    },
    subtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    filterBtn: {
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    chartRow: {
        alignItems: 'center',
        marginBottom: 24,
        position: 'relative'
    },
    chartWrapper: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center'
    },
    chartOverlay: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        width: 100, // Inner circle approx
    },
    totalLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginBottom: 4
    },
    totalValue: {
        fontSize: 14, // Small to fit? Or bold?
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center'
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: 16
    },
    legendItem: {
        flex: 1,
        alignItems: 'center'
    },
    legendHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text
    },
    categoryPercent: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4
    },
    categoryValue: {
        fontSize: 12,
        color: theme.colors.textSecondary
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: theme.colors.border
    }
});
