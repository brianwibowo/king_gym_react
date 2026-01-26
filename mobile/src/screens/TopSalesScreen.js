import React, { useEffect, useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { theme } from '../config/theme';
import api from '../config/api';
import { ChevronLeft, ShoppingBag } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function TopSalesScreen({ navigation }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            // Fetch ALL items for 'day' period
            const response = await api.get('/dashboard/insights', {
                params: {
                    period: 'day',
                    limit: 'all'
                }
            });
            setSales(response.data.top); // 'top' contains the sorted list
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }) => (
        <View style={styles.card}>
            <View style={styles.leftSection}>
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <Text style={styles.itemMeta}>
                        Stock: {item.current_stock !== null ? item.current_stock : '-'}
                    </Text>
                </View>
            </View>
            <View style={styles.rightSection}>
                <View style={styles.soldBadge}>
                    <Text style={styles.soldLabel}>Sold</Text>
                    <Text style={styles.soldValue}>{item.total_qty}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Today's Sales</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={sales}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No sales recorded today.</Text>
                    }
                />
            )}
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
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    listContent: {
        padding: theme.spacing.l,
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    rankBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    rankText: {
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    itemMeta: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    rightSection: {
        alignItems: 'flex-end',
    },
    soldBadge: {
        alignItems: 'center',
        backgroundColor: theme.colors.primary + '15', // Low opacity
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    soldLabel: {
        fontSize: 10,
        color: theme.colors.primary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    soldValue: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.primary,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        marginTop: 40,
    }
});
