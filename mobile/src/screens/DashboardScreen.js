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

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
            fetchInsights();
        }, [dateFilter]) // Re-fetch on filter change
    );

    useEffect(() => {
        fetchInsights();
    }, [insightFilter]);

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

    const processChartData = () => {
        let labels = [];
        let data = [];

        if (chartFilter === 'daily') {
            // Show Mon-Sun
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            if (analytics.daily && analytics.daily.length > 0) {
                labels = analytics.daily.map(d => {
                    const date = new Date(d.date);
                    return date.toLocaleDateString('en-US', { weekday: 'short' });
                });
                data = analytics.daily.map(d => parseInt(d.total));
            } else {
                labels = days;
                data = [0, 0, 0, 0, 0, 0, 0];
            }
        } else if (chartFilter === 'weekly') {
            if (analytics.weekly && analytics.weekly.length > 0) {
                labels = analytics.weekly.map(w => w.week); // "Week 1", etc.
                data = analytics.weekly.map(w => parseInt(w.total));
            } else {
                labels = ['W1', 'W2', 'W3', 'W4'];
                data = [0, 0, 0, 0];
            }
        } else { // Yearly
            if (analytics.yearly && analytics.yearly.length > 0) {
                labels = analytics.yearly.map(m => m.month_name);
                data = analytics.yearly.map(m => parseInt(m.total));
            } else {
                labels = ['Jan', 'Feb', 'Mar'];
                data = [0, 0, 0];
            }
        }

        return {
            labels: labels,
            datasets: [{ data: data }]
        };
    };

    const renderTransactionItem = (item) => (
        <View key={item.id} style={styles.trxCard}>
            <View style={styles.trxLeft}>
                <View style={[styles.iconBox, item.transaction_type === 'membership' ? styles.bgBlue : styles.bgOrange]}>
                    <Text style={styles.iconText}>
                        {item.transaction_type === 'membership' ? 'M' : (item.transaction_type === 'mix' ? 'X' : 'P')}
                    </Text>
                </View>
                <View>
                    <Text style={styles.trxTitle}>{item.customer_name || 'Guest'}</Text>
                    <Text style={styles.trxSubtitle}>
                        {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {item.payment_method.toUpperCase()}
                    </Text>
                </View>
            </View>
            <View style={styles.trxRight}>
                <Text style={styles.trxAmount}>+Rp {item.total_amount.toLocaleString('id-ID')}</Text>
            </View>
        </View>
    );

    const chartConfig = {
        backgroundGradientFrom: theme.colors.card,
        backgroundGradientTo: theme.colors.card,
        color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`, // Primary color
        labelColor: (opacity = 1) => theme.colors.textSecondary,
        strokeWidth: 2,
        barPercentage: 0.7,
        decimalPlaces: 0,
    };

    return (
        <SafeAreaView style={styles.container}>
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} />}
            >
                {/* Income Summary Component - Superadmin Only */}
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

                {/* Revenue Chart Removed as requested - Replaced by IncomeSummary & Insights */}

                {/* Insights Section */}
                <View style={[styles.chartContainer, { marginBottom: 24 }]}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>Product Insights</Text>
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

                    {/* Top Selling */}
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                            <Award size={16} color="#FFD700" />
                            <Text style={styles.insightSectionTitle}>Top 3 Best Selling</Text>
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


                    {/* Least Selling */}
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

                {/* Recent Transactions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>RECENT TRANSACTIONS (Today)</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Rekap')}>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                {recentTransactions.length === 0 ? (
                    <Text style={styles.emptyText}>No transactions today.</Text>
                ) : (
                    recentTransactions.map(item => renderTransactionItem(item))
                )}

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
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: theme.spacing.l,
        marginBottom: 24
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 4
    },
    statValue: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: 'bold'
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
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bgBlue: { backgroundColor: 'rgba(33, 150, 243, 0.2)' },
    bgOrange: { backgroundColor: 'rgba(255, 152, 0, 0.2)' },
    iconText: {
        fontWeight: 'bold',
        color: theme.colors.text
    },
    trxTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 14
    },
    trxSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 12
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
