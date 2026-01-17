import React, { useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Modal, ScrollView, Alert, Dimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { theme } from '../config/theme';
import api from '../config/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ShoppingCart, Plus, Minus, Trash2, X, Search, Coffee, Users, Eye, PlusSquare, Calendar } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

// Helper to format date in local time YYYY-MM-DD HH:mm:ss
const formatLocalISO = (date) => {
    const pad = (n) => n < 10 ? '0' + n : n;
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        ' ' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds());
};

export default function POSScreen({ navigation }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [products, setProducts] = useState([]); // FNB
    const [packages, setPackages] = useState([]); // Memberships
    const [cart, setCart] = useState([]);
    const [activeTab, setActiveTab] = useState('items'); // 'items' or 'memberships'
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        try {
            const [prodRes, packRes] = await Promise.all([
                api.get('/products'),
                api.get('/packages')
            ]);

            setProducts(prodRes.data.map(i => ({ ...i, type: 'product' })));
            setPackages(packRes.data.map(i => ({ ...i, type: 'package' }))); // Package doesn't have stock, default unlimited
        } catch (error) {
            console.error('POS Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // ... addToCart, updateQty, calculateTotal ... (unchanged logic, I will skip replacing them to keep it clean if possible, but replace_file_content needs contiguous block. I'll include them if they fall in the range or just target specific blocks. 
    // Actually, I can target the imports and the component start, and then use another call for renderItem.

    // Strategy:
    // 1. imports + component definition + useFocusEffect
    // 2. renderItem
    // 3. header

    // Let's do imports + component start first.




    const addToCart = (item) => {
        // Check stock for products
        if (item.type === 'product' && item.stock <= 0) {
            Alert.alert('Out of Stock', 'This item is currently unavailable.');
            return;
        }

        setCart(prev => {
            const existing = prev.find(i => i.id === item.id && i.type === item.type);
            if (existing) {
                // Check stock limit for products
                if (item.type === 'product' && existing.qty >= item.stock) {
                    Alert.alert('Stock Limit', 'Cannot add more than available stock.');
                    return prev;
                }

                return prev.map(i =>
                    (i.id === item.id && i.type === item.type)
                        ? { ...i, qty: i.qty + 1 }
                        : i
                );
            }
            return [...prev, { ...item, qty: 1 }];
        });
    };

    const updateQty = (item, delta) => {
        setCart(prev => {
            return prev.map(i => {
                if (i.id === item.id && i.type === item.type) {
                    const newQty = i.qty + delta;
                    if (newQty <= 0) return null; // Remove if 0

                    // Stock check
                    if (item.type === 'product' && delta > 0 && newQty > item.stock) {
                        return i; // Do nothing if exceeds stock
                    }

                    return { ...i, qty: newQty };
                }
                return i;
            }).filter(Boolean);
        });
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    };

    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Custom Date State
    const [transactionDate, setTransactionDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setTransactionDate(selectedDate);
        }
    };

    const handleCheckout = async () => {
        if (!paymentMethod) {
            Alert.alert('Error', 'Please select payment method');
            return;
        }

        try {
            const payload = {
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    type: item.type,
                    qty: item.qty
                })),
                total_amount: calculateTotal(),
                payment_method: paymentMethod,
                customer_name: customerName,
                transaction_type: cart.some(i => i.type === 'package')
                    ? (cart.some(i => i.type === 'product') ? 'mix' : 'membership')
                    : 'product',
                user_id: 1, // Default
                created_at: formatLocalISO(transactionDate) // Send local time string
            };

            await api.post('/transactions', payload);
            Alert.alert('Success', 'Order completed successfully!');
            setCart([]);
            setCustomerName('');
            setPaymentMethod('cash');
            setModalVisible(false);
            fetchData();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || 'Transaction Failed';
            Alert.alert('Error', msg);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
            {/* View Detail Icon */}
            <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('ProductDetail', { product: item })}
            >
                <Eye size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.productIconPlaceholder, item.type === 'package' && styles.packageIcon, item.image_url ? { backgroundColor: 'transparent' } : null]}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.productThumb} resizeMode="cover" />
                ) : (
                    item.type === 'package' ? (
                        <Users size={24} color={theme.colors.background} />
                    ) : (
                        <Text style={styles.productIconText}>{item.name[0]}</Text>
                    )
                )}
            </View>
            <View style={{ flex: 1, alignItems: 'center', width: '100%' }}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>Rp {item.price.toLocaleString('id-ID')}</Text>

                {item.type === 'product' && (
                    <Text style={[styles.stockText, item.stock < 5 && { color: theme.colors.danger }]}>
                        Stock: {item.stock}
                    </Text>
                )}
                {item.type === 'package' && (
                    <Text style={styles.stockText}>{item.duration_days} Days</Text>
                )}
            </View>
            <View style={styles.addBtn}>
                <Plus size={18} color={theme.colors.background} />
            </View>
        </TouchableOpacity>
    );

    const activeList = activeTab === 'items' ? products : packages;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>POS System</Text>
                <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                    {/* Add Product Shortcut */}
                    <TouchableOpacity style={{ padding: 8 }} onPress={() => navigation.navigate('ProductDetail', { isNew: true })}>
                        <PlusSquare size={26} color={theme.colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cartButton} onPress={() => setModalVisible(true)}>
                        <ShoppingCart size={24} color={theme.colors.primary} />
                        {cart.length > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{cart.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'items' && styles.activeTab]}
                    onPress={() => setActiveTab('items')}
                >
                    <Coffee size={18} color={activeTab === 'items' ? theme.colors.background : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'items' && styles.activeTabText]}>FNB Items</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'memberships' && styles.activeTab]}
                    onPress={() => setActiveTab('memberships')}
                >
                    <Users size={18} color={activeTab === 'memberships' ? theme.colors.background : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'memberships' && styles.activeTabText]}>Memberships</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={activeList}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                contentContainerStyle={styles.gridContent}
                ListEmptyComponent={
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>No items found</Text>
                }
            />

            {/* Cart Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true} supportedOrientations={['portrait', 'landscape']}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Current Order</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.cartList}>
                            {/* Inputs Section */}
                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>Customer Name (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. John Doe / Guest"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={customerName}
                                    onChangeText={setCustomerName}
                                />

                                <Text style={styles.inputLabel}>Transaction Date</Text>
                                <TouchableOpacity
                                    style={[styles.input, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Calendar size={20} color={theme.colors.textSecondary} />
                                    <Text style={{ color: theme.colors.text }}>
                                        {transactionDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </Text>
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={transactionDate}
                                        mode="date"
                                        display="default"
                                        onChange={onDateChange}
                                    />
                                )}

                                <Text style={styles.inputLabel}>Payment Method</Text>
                                <View style={styles.paymentMethods}>
                                    {['cash', 'qris', 'transfer'].map(method => (
                                        <TouchableOpacity
                                            key={method}
                                            style={[styles.paymentChip, paymentMethod === method && styles.activePaymentChip]}
                                            onPress={() => setPaymentMethod(method)}
                                        >
                                            <Text style={[styles.paymentText, paymentMethod === method && styles.activePaymentText]}>
                                                {method.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {cart.length === 0 && (
                                <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>Cart is empty</Text>
                            )}
                            {cart.map((item, index) => (
                                <View key={index} style={styles.cartItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cartItemName}>{item.name}</Text>
                                        <Text style={styles.cartItemPrice}>
                                            {item.type === 'package' ? '(Membership) ' : ''}
                                            @ Rp {item.price.toLocaleString('id-ID')}
                                        </Text>
                                    </View>

                                    <View style={styles.qtyControls}>
                                        <TouchableOpacity onPress={() => updateQty(item, -1)} style={styles.qtyBtn}>
                                            <Minus size={16} color={theme.colors.text} />
                                        </TouchableOpacity>
                                        <Text style={styles.qtyText}>{item.qty}</Text>
                                        <TouchableOpacity onPress={() => updateQty(item, 1)} style={styles.qtyBtn}>
                                            <Plus size={16} color={theme.colors.text} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.checkoutSection}>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total</Text>
                                <Text style={styles.totalValue}>Rp {calculateTotal().toLocaleString('id-ID')}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.checkoutBtn, cart.length === 0 && { opacity: 0.5 }]}
                                onPress={handleCheckout}
                                disabled={cart.length === 0}
                            >
                                <Text style={styles.checkoutText}>CONFIRM & SAVE ORDER</Text>
                            </TouchableOpacity>
                        </View>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
    },
    title: {
        color: theme.colors.text,
        fontSize: 28,
        fontWeight: 'bold',
    },
    cartButton: {
        position: 'relative',
        padding: 8,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: theme.colors.danger,
        borderRadius: 10,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.s,
        gap: 12
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
        gap: 8
    },
    activeTab: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    tabText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    activeTabText: {
        color: theme.colors.background,
        fontWeight: 'bold'
    },
    gridContent: {
        padding: theme.spacing.l,
    },
    productCard: {
        flex: 1,
        backgroundColor: theme.colors.card,
        margin: theme.spacing.s,
        borderRadius: 16,
        padding: 16, // Increased padding
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center', // Center vertically as requested
        minHeight: 180,
        gap: 8, // Add gap for spacing
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 2,
    },
    productIconPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    packageIcon: {
        backgroundColor: theme.colors.primary,
    },
    productIconText: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    productThumb: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },
    productName: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        height: 40,
        textAlignVertical: 'center'
    },
    productPrice: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: 'bold',
    },
    detailBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        padding: 6,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12
    },
    stockText: {
        color: theme.colors.textSecondary,
        fontSize: 10,
    },
    addBtn: {
        backgroundColor: theme.colors.primary,
        width: '100%',
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        padding: theme.spacing.l,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    modalTitle: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    cartList: {
        flex: 1,
    },
    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: theme.spacing.m,
    },
    cartItemName: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    cartItemPrice: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.background,
        padding: 6,
        borderRadius: 8,
    },
    qtyBtn: {
        padding: 4,
    },
    qtyText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        minWidth: 20,
        textAlign: 'center'
    },
    inputSection: {
        marginBottom: 16
    },
    inputLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 8
    },
    input: {
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        padding: 12,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 16
    },
    paymentMethods: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8
    },
    paymentChip: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },
    activePaymentChip: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary
    },
    paymentText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.textSecondary
    },
    activePaymentText: {
        color: theme.colors.background
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 10
    },
    checkoutSection: {
        marginTop: theme.spacing.l,
        marginBottom: 20
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.m,
    },
    totalLabel: {
        color: theme.colors.textSecondary,
        fontSize: 18,
    },
    totalValue: {
        color: theme.colors.primary,
        fontSize: 24,
        fontWeight: 'bold',
    },
    checkoutBtn: {
        backgroundColor: theme.colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    checkoutText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    }
});
