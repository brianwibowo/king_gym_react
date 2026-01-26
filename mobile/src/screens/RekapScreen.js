import React, { useCallback, useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, TouchableOpacity, FlatList, Modal, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { theme } from '../config/theme';
import api from '../config/api';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingUp, Users, ChevronLeft, ChevronRight, Calendar, X, FileSpreadsheet } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

export default function RekapScreen({ navigation }) {
    const { userData } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false); // Add state
    const [stats, setStats] = useState({ total_income: 0, count: 0 });
    // ...

    // Date Change Handler
    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setCurrentDate(selectedDate);
        }
    };

    const [transactions, setTransactions] = useState([]);
    const [expenses, setExpenses] = useState([]); // Expense State
    const [activeTab, setActiveTab] = useState('income'); // 'income' or 'expense'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Detail Modal
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Add Expense Modal
    const [expenseModalVisible, setExpenseModalVisible] = useState(false);
    const [newExpense, setNewExpense] = useState({ amount: '', description: '' });
    const [expenseDate, setExpenseDate] = useState(new Date());
    const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);

    const onExpenseDateChange = (event, selectedDate) => {
        setShowExpenseDatePicker(false);
        if (selectedDate) setExpenseDate(selectedDate);
    };

    // Fix: Use local date formatting to prevent UTC shift (which causes previous day selection)
    const formattedDate = useMemo(() => {
        const d = currentDate;
        const pad = (n) => n < 10 ? '0' + n : n;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }, [currentDate]);

    const displayDate = currentDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
        }, [formattedDate]) // Depend on formattedDate string
    );

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch Transactions
            const response = await api.get('/transactions', {
                params: { date: formattedDate }
            });
            setTransactions(response.data.data);
            setStats(response.data.summary);

            // Fetch Expenses
            const expenseRes = await api.get('/expenses', {
                params: { date: formattedDate }
            });
            setExpenses(expenseRes.data.data);

        } catch (error) {
            console.error('Rekap Fetch Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.description) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        try {
            setLoading(true);
            await api.post('/expenses', {
                amount: newExpense.amount,
                description: newExpense.description,
                date: expenseDate.toISOString().split('T')[0] // Use specific expense date
            });
            setExpenseModalVisible(false);
            setNewExpense({ amount: '', description: '' });
            setExpenseDate(new Date()); // Reset date
            fetchDashboardData();
            Alert.alert('Success', 'Expense added');
        } catch (error) {
            Alert.alert('Error', 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExpense = async (id) => {
        Alert.alert('Delete', 'Delete this expense?', [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/expenses/${id}`);
                        fetchDashboardData();
                    } catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            }
        ]);
    };

    const changeDate = (days) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + days);
        setCurrentDate(newDate);
    };



    // ... inside component

    const handleExport = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                Alert.alert('Error', 'Unauthorized. Please login again.');
                return;
            }

            const fileUri = FileSystem.documentDirectory + `laporan-${formattedDate}.xlsx`;

            const downloadRes = await FileSystem.downloadAsync(
                `${BASE_URL}/export/excel`,
                fileUri,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (downloadRes.status !== 200) {
                Alert.alert('Error', 'Failed to download report.');
                return;
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(downloadRes.uri);
            } else {
                Alert.alert('Success', `File saved to ${downloadRes.uri}`);
            }

        } catch (error) {
            console.error('Export Error:', error);
            Alert.alert('Error', 'Failed to export Excel.');
        } finally {
            setLoading(false);
        }
    };

    const handleTransactionClick = (trx) => {
        setSelectedTransaction(trx);
        setModalVisible(true);
    };

    const renderTransactionItem = ({ item }) => (
        <TouchableOpacity style={styles.trxCard} onPress={() => handleTransactionClick(item)}>
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
                <Text style={styles.trxStatus}>Success</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Rekap Keuangan</Text>
                    <Text style={styles.subGreeting}>Daily Report</Text>
                </View>

                {userData?.role === 'superadmin' && activeTab === 'income' && (
                    <TouchableOpacity style={styles.exportBtn} onPress={() => navigation.navigate('ReportExport')}>
                        <FileSpreadsheet size={20} color={theme.colors.background} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Toggle Switch */}
            <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: theme.colors.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: theme.colors.border }}>
                <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: activeTab === 'income' ? theme.colors.primary : 'transparent' }}
                    onPress={() => setActiveTab('income')}
                >
                    <Text style={{ fontWeight: 'bold', color: activeTab === 'income' ? '#fff' : theme.colors.textSecondary }}>Pemasukan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: activeTab === 'expense' ? theme.colors.danger : 'transparent' }}
                    onPress={() => setActiveTab('expense')}
                >
                    <Text style={{ fontWeight: 'bold', color: activeTab === 'expense' ? '#fff' : theme.colors.textSecondary }}>Pengeluaran</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.dateNavContainer}>
                <View style={styles.dateNav}>
                    <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
                        <ChevronLeft size={20} color={theme.colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dateDisplay}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Calendar size={14} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.dateText}>{displayDate}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
                        <ChevronRight size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={currentDate}
                        mode="date"
                        display="default"
                        onChange={onChangeDate}
                    />
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} />}
            >
                {activeTab === 'income' ? (
                    <>
                        {/* Stats Cards */}
                        <View style={styles.statsRow}>
                            {userData?.role === 'superadmin' && (
                                <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                                    <View style={[styles.statIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                                        <TrendingUp size={24} color={theme.colors.success} />
                                    </View>
                                    <Text style={styles.statLabel}>Total Income</Text>
                                    <Text style={styles.statValue}>Rp {stats.total_income.toLocaleString('id-ID')}</Text>
                                </View>
                            )}
                            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                                <View style={[styles.statIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                                    <Users size={24} color="#2196F3" />
                                </View>
                                <Text style={styles.statLabel}>Transactions</Text>
                                <Text style={styles.statValue}>{stats.count}</Text>
                            </View>
                        </View>

                        {/* Transaction List */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>TRANSACTIONS</Text>
                        </View>

                        {transactions.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No transactions for this date.</Text>
                            </View>
                        ) : (
                            <View style={styles.listContainer}>
                                {transactions.map(item => (
                                    <View key={item.id}>
                                        {renderTransactionItem({ item })}
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    <>
                        {/* Expense List */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>EXPENSES LIST</Text>
                        </View>

                        {expenses.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No expenses recorded.</Text>
                            </View>
                        ) : (
                            <View style={styles.listContainer}>
                                {expenses.map(item => (
                                    <TouchableOpacity key={item.id} onLongPress={() => handleDeleteExpense(item.id)} style={styles.trxCard}>
                                        <View style={styles.trxLeft}>
                                            <View style={[styles.iconBox, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}>
                                                <Text style={[styles.iconText, { color: theme.colors.danger }]}>E</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.trxTitle}>{item.description}</Text>
                                                <Text style={styles.trxSubtitle}>{item.user?.name || 'Staff'}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.trxRight}>
                                            <Text style={[styles.trxAmount, { color: theme.colors.danger }]}>-Rp {parseFloat(item.amount).toLocaleString('id-ID')}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Add Expense Button */}
                        <TouchableOpacity
                            style={{ margin: 20, backgroundColor: theme.colors.danger, padding: 16, borderRadius: 12, alignItems: 'center' }}
                            onPress={() => setExpenseModalVisible(true)}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Add Expense</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            <Modal visible={expenseModalVisible} transparent animationType="fade">
                <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => {
                    setExpenseModalVisible(false);
                }}>
                    <TouchableOpacity activeOpacity={1} style={styles.modalContent} onPress={() => { }}>
                        {/* Stop propagation */}
                        <Text style={styles.modalTitle}>Add Expense</Text>
                        <TextInput
                            placeholder="Amount (Rp)"
                            keyboardType="numeric"
                            style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={newExpense.amount}
                            onChangeText={t => setNewExpense({ ...newExpense, amount: t })}
                        />
                        <TextInput
                            placeholder="Description (e.g., Listrik)"
                            style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: theme.colors.background, color: theme.colors.text }}
                            placeholderTextColor={theme.colors.textSecondary}
                            value={newExpense.description}
                            onChangeText={t => setNewExpense({ ...newExpense, description: t })}
                        />

                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 8 }}>Date</Text>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 20, backgroundColor: theme.colors.background }}
                            onPress={() => setShowExpenseDatePicker(true)}
                        >
                            <Calendar size={20} color={theme.colors.textSecondary} />
                            <Text style={{ color: theme.colors.text }}>
                                {expenseDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>

                        {showExpenseDatePicker && (
                            <DateTimePicker
                                value={expenseDate}
                                mode="date"
                                display="default"
                                onChange={onExpenseDateChange}
                            />
                        )}

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center' }} onPress={() => setExpenseModalVisible(false)}>
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={{ flex: 1, padding: 12, backgroundColor: theme.colors.danger, borderRadius: 8, alignItems: 'center' }} onPress={handleAddExpense}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Detail Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true} supportedOrientations={['portrait', 'landscape']}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Transaction Detail</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedTransaction && (
                            <ScrollView>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date</Text>
                                    <Text style={styles.detailValue}>{new Date(selectedTransaction.created_at).toLocaleString('id-ID')}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Cashier</Text>
                                    <Text style={styles.detailValue}>{selectedTransaction.user?.name || 'Unknown'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Customer</Text>
                                    <Text style={styles.detailValue}>{selectedTransaction.customer_name || 'Guest'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Payment</Text>
                                    <Text style={styles.detailValue}>{selectedTransaction.payment_method.toUpperCase()}</Text>
                                </View>

                                <View style={styles.divider} />
                                <Text style={styles.itemsTitle}>Items</Text>

                                {selectedTransaction.details.map((detail, index) => (
                                    <View key={index} style={styles.itemRow}>
                                        <Text style={styles.itemName}>{detail.item_name} x{detail.qty}</Text>
                                        <Text style={styles.itemPrice}>Rp {detail.subtotal.toLocaleString('id-ID')}</Text>
                                    </View>
                                ))}

                                <View style={styles.divider} />
                                <View style={[styles.detailRow, { marginTop: 10 }]}>
                                    <Text style={[styles.detailLabel, { fontSize: 18, fontWeight: 'bold' }]}>TOTAL</Text>
                                    <Text style={[styles.detailValue, { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary }]}>
                                        Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}
                                    </Text>
                                </View>

                                {/* Delete Button Only */}
                                <TouchableOpacity
                                    style={styles.deleteBtn}
                                    onPress={() => {
                                        Alert.alert(
                                            'Delete Transaction',
                                            'Are you sure you want to delete this transaction?',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Delete',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        try {
                                                            setLoading(true);
                                                            await api.delete(`/transactions/${selectedTransaction.id}`);
                                                            Alert.alert('Success', 'Transaction deleted');
                                                            setModalVisible(false);
                                                            fetchDashboardData();
                                                        } catch (error) {
                                                            console.error('Delete Error:', error);
                                                            Alert.alert('Error', 'Failed to delete transaction');
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <Text style={styles.deleteBtnText}>Delete Transaction</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
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
    exportBtn: {
        backgroundColor: theme.colors.success,
        padding: 10,
        borderRadius: 8
    },
    dateNavContainer: {
        paddingHorizontal: theme.spacing.l,
        marginBottom: 16
    },
    dateNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    navBtn: {
        padding: 8,
    },
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 14
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
        fontSize: 18,
        fontWeight: 'bold'
    },
    sectionHeader: {
        paddingHorizontal: theme.spacing.l,
        marginBottom: 12
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    listContainer: {
        paddingHorizontal: theme.spacing.l,
    },
    trxCard: {
        backgroundColor: theme.colors.card,
        marginBottom: 12,
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
    trxStatus: {
        color: theme.colors.textSecondary,
        fontSize: 10
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40
    },
    emptyText: {
        color: theme.colors.textSecondary
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '70%', // Force taller height
        padding: 30, // More padding
        width: '100%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    modalTitle: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: 'bold'
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    detailLabel: {
        color: theme.colors.textSecondary,
    },
    detailValue: {
        color: theme.colors.text,
        fontWeight: '500'
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 16
    },
    itemsTitle: {
        color: theme.colors.text,
        fontWeight: 'bold',
        marginBottom: 12
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    itemName: {
        color: theme.colors.textSecondary,
    },
    itemPrice: {
        color: theme.colors.text,
    },
    deleteBtn: {
        marginTop: 24,
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.danger
    },
    deleteBtnText: {
        color: theme.colors.danger,
        fontWeight: 'bold',
        fontSize: 16
    }
});
