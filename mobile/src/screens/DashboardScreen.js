import React, { useCallback, useState, useContext, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { theme } from '../config/theme'; // Removed
import api from '../config/api';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingUp, Users, User, ChevronRight, Calendar, Award, AlertCircle } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { BarChart } from 'react-native-chart-kit';
import IncomeSummary from '../components/IncomeSummary';
import { DashboardSkeleton } from '../components/Skeleton'; // Import Skeleton

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation, route }) {
    const { userData } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [summary, setSummary] = useState({
        total_revenue: 0,
        revenue_this_month: 0,
        revenue_this_year: 0,
        count: 0,
        // Income Breakdown
        membership_income: 0,
        product_income: 0,
        membership_percentage: 0,
        product_percentage: 0,
        income_breakdown: {} // Nested object from backend
    });
    const [analytics, setAnalytics] = useState({ daily: [], weekly: [], yearly: [] });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters: 'daily' (Today/WeekView), 'weekly' (MonthView), 'yearly' (YearView)
    const [chartFilter, setChartFilter] = useState('daily');

    // Global Date Filter
    // Default: Today (Local Time)
    const [dateFilter, setDateFilter] = useState(() => {
        const now = new Date();
        const pad = n => n < 10 ? '0' + n : n;
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        return {
            start: todayStr,
            end: todayStr,
            label: 'Today'
        };
    });

    // Listen for DateFilter updates from Modal
    useEffect(() => {
        if (route.params?.newDateFilter) {
            setDateFilter(route.params.newDateFilter);
        }
    }, [route.params?.newDateFilter]);

    // Insights State
    const [insights, setInsights] = useState({ top: [], bottom: [] });
    const [insightFilter, setInsightFilter] = useState('month'); // day, week, month, all
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [topSalesToday, setTopSalesToday] = useState([]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Analytics & Summary with DATE FILTER
            const dashboardRes = await api.get('/dashboard', {
                params: {
                    start_date: dateFilter.start,
                    end_date: dateFilter.end
                }
            });
            const data = dashboardRes.data.data;

            setSummary({ ...data.summary, ...data.income_breakdown }); // Merge breakdown into summary state
            setAnalytics(data.analytics);

            // 2. Fetch Recent Transactions (Today or Filter Range?)
            // Requirement says "Pie chart dan keterangan reload sesuai tanggal".
            // It makes sense recent transactions also follow this filter, or at least default to today.
            // Let's use filter range.
            const trxRes = await api.get('/transactions', {
                params: {
                    start_date: dateFilter.start,
                    end_date: dateFilter.end
                }
            });
            setRecentTransactions(trxRes.data.data.slice(0, 3));
        } catch (error) {
            console.error('Dashboard Fetch Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchTopSalesToday = async () => {
        try {
            const response = await api.get('/dashboard/insights', {
                params: { period: 'day' }
            });
            setTopSalesToday(response.data.top.slice(0, 3));
        } catch (error) {
            console.error('Top Sales Fetch Error:', error);
        }
    };

    const fetchInsights = async () => {
        try {
            setLoadingInsights(true);
            const response = await api.get('/dashboard/insights', {
                params: { period: insightFilter }
            });
            setInsights(response.data);
        } catch (error) {
            console.error('Insights Fetch Error:', error);
        } finally {
            setLoadingInsights(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
            fetchInsights();
            fetchTopSalesToday();
        }, [dateFilter]) // Re-fetch on filter change
    );

    useEffect(() => {
        fetchInsights();
    }, [insightFilter]);

    // ... (rest of code) ...

    const renderTopSaleItem = (item, index) => (
        <View key={index} style={styles.trxCard}>
            <View style={styles.trxLeft}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.iconText, { color: theme.colors.primary }]}>
                        {index + 1}
                    </Text>
                </View>
                <View>
                    <Text style={styles.trxTitle}>{item.item_name}</Text>
                    <Text style={styles.trxSubtitle}>
                        Sold: {item.total_qty} {item.current_stock !== null ? `| Stock: ${item.current_stock}` : ''}
                    </Text>
                </View>
            </View>
            {/* Removed Revenue as requested */}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {loading ? (
                <DashboardSkeleton />
            ) : (
                <>
                    {/* Header ... */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.greeting}>Dashboard</Text>
                            <Text style={styles.subGreeting}>Welcome back, {userData?.name || 'Admin'}!</Text>
                        </View>
                        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
                            {userData?.photo_url ? (
                                <Image source={{ uri: userData.photo_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                            ) : (
                                <User size={24} color={theme.colors.text} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.content}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); fetchInsights(); fetchTopSalesToday(); }} />}
                    >
                        {/* Income Summary (Superadmin) */}
                        {userData?.role === 'superadmin' && (
                            <IncomeSummary
                                data={{
                                    total: summary.total || summary.total_revenue || 0,
                                    membership: summary.membership || 0,
                                    product: summary.product || 0,
                                    membership_percentage: summary.membership_percentage || 0,
                                    product_percentage: summary.product_percentage || 0
                                }}
                                dateLabel={dateFilter.label}
                                onFilterPress={() => navigation.navigate('DateFilter', {
                                    currentRange: dateFilter
                                })}
                            />
                        )}

                        {/* TODAY'S TOP SALES (Replaces Recent Transactions) */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>TODAY'S TOP SALES</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('TopSales')}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {topSalesToday.length === 0 ? (
                            <Text style={styles.emptyText}>No sales yet today.</Text>
                        ) : (
                            topSalesToday.map((item, index) => renderTopSaleItem(item, index))
                        )}

                        {/* Insights Section (Product Insights - Charts/Stats) */}
                        <View style={[styles.chartContainer, { marginTop: 24, marginBottom: 24 }]}>
                            <View style={styles.chartHeader}>
                                <Text style={styles.chartTitle}>Stats Insights</Text>
                                <View style={styles.filterContainer}>
                                    {['day', 'week', 'month', 'all'].map((f) => (
                                        <TouchableOpacity
                                            key={f}
                                            style={[styles.filterChip, insightFilter === f && styles.activeFilter]}
                                            onPress={() => setInsightFilter(f)}
                                        >
                                            <Text style={[styles.filterText, insightFilter === f && styles.activeFilterText]}>
                                                {f.charAt(0).toUpperCase() + f.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Top Selling Stats */}
                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                                    <Award size={16} color="#FFD700" />
                                    <Text style={styles.insightSectionTitle}>Best Selling (Rank)</Text>
                                </View>
                                {insights.top.length === 0 ? (
                                    <Text style={styles.emptyText}>No data available.</Text>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                                        {insights.top.map((item, index) => (
                                            <View key={index} style={[styles.insightCard, { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
                                                <Text style={styles.insightRank}>#{index + 1}</Text>
                                                <Text style={styles.insightName} numberOfLines={1}>{item.item_name}</Text>
                                                <Text style={styles.insightValue}>{item.total_qty} Sold</Text>
                                                {userData?.role === 'superadmin' && (
                                                    <Text style={styles.insightSubValue}>Rp {parseInt(item.total_revenue).toLocaleString('id-ID')}</Text>
                                                )}
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>

                            {/* Least Selling Stats */}
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                                    <AlertCircle size={16} color={theme.colors.textSecondary} />
                                    <Text style={styles.insightSectionTitle}>Least Selling</Text>
                                </View>
                                {insights.bottom.length === 0 ? (
                                    <Text style={styles.emptyText}>No data available.</Text>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
                                        {insights.bottom.map((item, index) => (
                                            <View key={index} style={[styles.insightCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                                                <Text style={[styles.insightRank, { color: theme.colors.textSecondary }]}>↓</Text>
                                                <Text style={styles.insightName} numberOfLines={1}>{item.item_name}</Text>
                                                <Text style={styles.insightValue}>{item.total_qty} Sold</Text>
                                                {userData?.role === 'superadmin' && (
                                                    <Text style={styles.insightSubValue}>Rp {parseInt(item.total_revenue).toLocaleString('id-ID')}</Text>
                                                )}
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        </View>

                    </ScrollView>
                </>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
    },
    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    subGreeting: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    profileBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    content: {
        paddingBottom: 20
    },
    chartContainer: {
        marginHorizontal: theme.spacing.l,
        backgroundColor: theme.colors.card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 24
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    chartTitle: {
        fontWeight: 'bold',
        color: theme.colors.text,
        fontSize: 16
    },
    filterContainer: {
        flexDirection: 'row',
        gap: 8
    },
    filterChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: theme.colors.background
    },
    activeFilter: {
        backgroundColor: theme.colors.primary
    },
    filterText: {
        fontSize: 10,
        color: theme.colors.textSecondary
    },
    activeFilterText: {
        color: theme.colors.background,
        fontWeight: 'bold'
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        marginBottom: 12
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    seeAllText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold'
    },
    trxCard: {
        backgroundColor: theme.colors.card,
        marginBottom: 12,
        marginHorizontal: theme.spacing.l,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    trxLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontWeight: 'bold',
        fontSize: 14
    },
    trxTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 14,
        maxWidth: 180
    },
    trxSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2
    },
    trxRight: {
        alignItems: 'flex-end'
    },
    trxAmount: {
        color: theme.colors.success,
        fontWeight: 'bold',
        fontSize: 14
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        marginTop: 20
    },
    insightSectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    insightCard: {
        width: 140,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 12
    },
    insightRank: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4
    },
    insightName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4
    },
    insightValue: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: 'bold'
    },
    insightSubValue: {
        fontSize: 10,
        color: theme.colors.textSecondary
    }
});
