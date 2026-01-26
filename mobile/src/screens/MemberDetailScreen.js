import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Save, Trash2, Calendar, Clock, CreditCard, RotateCw, Phone, MapPin } from 'lucide-react-native';
import api from '../config/api';
import { ThemeContext } from '../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function MemberDetailScreen({ route, navigation }) {
    const { member: initialMember } = route.params;
    const { theme } = useContext(ThemeContext);

    const [member, setMember] = useState(initialMember);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // History State
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: initialMember.name,
        member_code: initialMember.member_code,
        status: initialMember.status,
        current_expiry_date: new Date(initialMember.current_expiry_date),
        address: initialMember.address,
        phone: initialMember.phone || ''
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Renew State
    const [renewModalVisible, setRenewModalVisible] = useState(false);
    const [packages, setPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [renewLoading, setRenewLoading] = useState(false);

    // Delete History State
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
    const [deleteHistoryLoading, setDeleteHistoryLoading] = useState(false);

    const toggleSelection = (id) => {
        if (selectedHistoryIds.includes(id)) {
            setSelectedHistoryIds(selectedHistoryIds.filter(itemId => itemId !== id));
        } else {
            setSelectedHistoryIds([...selectedHistoryIds, id]);
        }
    };

    const handleDeleteHistory = async () => {
        Alert.alert(
            'Delete Transactions',
            `Are you sure you want to delete ${selectedHistoryIds.length} items? This cannot be undone.`,
            [
                { text: 'Cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeleteHistoryLoading(true);
                            // Delete sequentially or parallel
                            const deletePromises = selectedHistoryIds.map(id => api.delete(`/transactions/${id}`));
                            await Promise.all(deletePromises);

                            Alert.alert('Success', 'Transactions deleted');
                            setIsDeleteMode(false);
                            setSelectedHistoryIds([]);
                            fetchHistory(); // Refresh list - critical!
                            fetchMemberData(); // Refresh member status potentially
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete some items');
                        } finally {
                            setDeleteHistoryLoading(false);
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        fetchHistory();
        fetchPackages();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchMemberData(),
                fetchHistory(),
                fetchPackages()
            ]);
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    }, [member.id]);

    const fetchMemberData = async () => {
        try {
            const response = await api.get(`/members/${member.id}`);
            const freshMember = response.data.data;
            setMember(freshMember);
            // Update form data in case we edit immediately after refresh
            setFormData({
                name: freshMember.name,
                member_code: freshMember.member_code,
                status: freshMember.status,
                current_expiry_date: new Date(freshMember.current_expiry_date),
                address: freshMember.address,
                phone: freshMember.phone || ''
            });
        } catch (error) {
            console.error("Failed to fetch fresh member data", error);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await api.get(`/members/${member.id}/history`);
            setHistory(response.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchPackages = async () => {
        try {
            const response = await api.get('/packages');
            setPackages(response.data.filter(p => !p.name.toLowerCase().includes('harian')));
        } catch (error) {
            console.error('Failed to fetch packages');
        }
    };

    const handleUpdate = async () => {
        try {
            setLoading(true);
            // Only send fields that allowed to be updated
            const payload = {
                member_code: formData.member_code, // Add this!
                name: formData.name,
                address: formData.address,
                phone: formData.phone,
                current_expiry_date: formData.current_expiry_date.toISOString().split('T')[0] // Send YYYY-MM-DD
            };

            const response = await api.put(`/members/${member.id}`, payload);
            setMember(response.data.data);
            Alert.alert('Success', 'Member data updated');
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update member');
        } finally {
            setLoading(false);
        }
    };

    const handleRenew = async () => {
        if (!selectedPackage) {
            Alert.alert('Error', 'Please select a package');
            return;
        }

        try {
            setRenewLoading(true);
            const response = await api.post(`/members/${member.id}/renew`, {
                package_id: selectedPackage.id,
                payment_method: paymentMethod
            });

            // Update local state
            setMember(response.data.data);
            setRenewModalVisible(false);
            Alert.alert('Success', 'Membership renewed successfully');

            // Refresh history
            fetchHistory();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to renew membership');
        } finally {
            setRenewLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert('Delete Member', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/members/${member.id}`);
                        navigation.goBack();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                }
            }
        ]);
    };

    const getStatusColor = (status, expiryDate) => {
        if (status === 'pending') return '#FF9800'; // Orange
        if (status !== 'active') return theme.colors.danger;
        const now = new Date();
        const expiry = new Date(expiryDate);
        if (expiry < now) return theme.colors.danger; // Expired
        const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
        if (diffDays <= 7) return '#FFA500'; // Warning
        return theme.colors.success;
    };

    const formatDateRange = (start, end) => {
        if (!start || !end) return null;
        const s = new Date(start);
        const e = new Date(end);
        return `${s.getDate()} ${s.toLocaleString('default', { month: 'short' })} - ${e.getDate()} ${e.toLocaleString('default', { month: 'short' })} ${e.getFullYear()}`;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.colors.text }]}>Member Details</Text>
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{isEditing ? 'Cancel' : 'Edit Data'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
                }
            >
                {/* ID Card Style Header */}
                <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            {isEditing ? (
                                <View>
                                    <TextInput
                                        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, marginBottom: 10 }]}
                                        value={formData.member_code}
                                        onChangeText={(text) => setFormData({ ...formData, member_code: text })}
                                        editable={member.status === 'pending'} // Only editable if Pending
                                        placeholder={member.status === 'pending' ? "Enter New Member ID" : ""}
                                    />
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                        <Text style={{ color: theme.colors.text, width: 100 }}>Name:</Text>
                                        <TextInput
                                            style={[styles.input, { flex: 1, color: theme.colors.text, borderColor: theme.colors.border, marginBottom: 0 }]}
                                            value={formData.name}
                                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                                        />
                                    </View>

                                    {/* Edit Expiry Date */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                        <Text style={{ color: theme.colors.text, width: 100 }}>Valid Until:</Text>
                                        <TouchableOpacity
                                            onPress={() => setShowDatePicker(true)}
                                            style={[styles.input, { flex: 1, paddingVertical: 8, borderColor: theme.colors.border }]}
                                        >
                                            <Text style={{ color: theme.colors.text }}>
                                                {formData.current_expiry_date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    {
                                        showDatePicker && (
                                            <DateTimePicker
                                                value={formData.current_expiry_date}
                                                mode="date"
                                                display="default"
                                                onChange={(event, selectedDate) => {
                                                    setShowDatePicker(false);
                                                    if (selectedDate) {
                                                        setFormData({ ...formData, current_expiry_date: selectedDate });
                                                    }
                                                }}
                                            />
                                        )
                                    }

                                </View >
                            ) : (
                                <View>
                                    <Text style={[styles.memberCode, { color: theme.colors.primary }]}>{member.member_code}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.status, member.current_expiry_date) }]}>
                                        <Text style={styles.statusText}>
                                            {member.status === 'active' && new Date(member.current_expiry_date) < new Date() ? 'EXPIRED' : member.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            )
                            }
                        </View >
                    </View >

                    {
                        isEditing ? (
                            <View style={styles.form} >
                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Address</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                                    value={formData.address}
                                    onChangeText={t => setFormData({ ...formData, address: t })}
                                />

                                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Phone Number</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                                    value={formData.phone}
                                    keyboardType="phone-pad"
                                    onChangeText={t => setFormData({ ...formData, phone: t })}
                                />

                                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleUpdate}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.infoContainer}>
                                <Text style={[styles.memberName, { color: theme.colors.text }]}>{member.name}</Text>
                                <Text style={[styles.memberCategory, { color: theme.colors.textSecondary }]}>{member.category} Member</Text>

                                <View style={styles.divider} />

                                <View style={styles.infoRow}>
                                    <MapPin size={18} color={theme.colors.textSecondary} />
                                    <Text style={[styles.infoText, { color: theme.colors.text }]}>
                                        {member.address || '-'}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Phone size={18} color={theme.colors.textSecondary} />
                                    <Text style={[styles.infoText, { color: theme.colors.text }]}>
                                        {member.phone || '-'}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Calendar size={18} color={theme.colors.textSecondary} />
                                    <Text style={[styles.infoText, { color: theme.colors.text }]}>
                                        Valid until: <Text style={{ fontWeight: 'bold' }}>{new Date(member.current_expiry_date).toLocaleDateString('id-ID', { dateStyle: 'full' })}</Text>
                                    </Text>
                                </View>
                            </View>
                        )}
                </View >

                {/* Function Buttons */}
                {
                    !isEditing && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary }]} onPress={() => setRenewModalVisible(true)}>
                                <RotateCw size={20} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>Renew Membership</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.colors.danger }]} onPress={handleDelete}>
                                <Trash2 size={20} color={theme.colors.danger} />
                                <Text style={{ color: theme.colors.danger, fontWeight: '600', marginLeft: 8 }}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    )
                }

                {/* History Section Header with Toggle Delete Mode */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16 }}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0, marginTop: 0 }]}>Subscription History</Text>
                    {history.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            if (isDeleteMode) {
                                // Cancel mode
                                setSelectedHistoryIds([]);
                                setIsDeleteMode(false);
                            } else {
                                setIsDeleteMode(true);
                            }
                        }}>
                            <Text style={{ color: isDeleteMode ? theme.colors.textSecondary : theme.colors.danger, fontWeight: 'bold' }}>
                                {isDeleteMode ? 'Cancel' : 'Delete Items'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {
                    historyLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : history.length === 0 ? (
                        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 20 }}>No history found</Text>
                    ) : (
                        <View style={styles.historyList}>
                            {history.map(item => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.historyItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                                    disabled={!isDeleteMode}
                                    onPress={() => toggleSelection(item.id)}
                                >
                                    {isDeleteMode && (
                                        <View style={{ marginRight: 12 }}>
                                            <View style={{
                                                width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                                                borderColor: selectedHistoryIds.includes(item.id) ? theme.colors.danger : theme.colors.border,
                                                backgroundColor: selectedHistoryIds.includes(item.id) ? theme.colors.danger : 'transparent',
                                                justifyContent: 'center', alignItems: 'center'
                                            }}>
                                                {selectedHistoryIds.includes(item.id) && <X size={14} color="#fff" />}
                                            </View>
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.historyLeft}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={[styles.historyAction, { color: theme.colors.text }]}>
                                                    {item.details[0]?.item_name || 'Membership'}
                                                </Text>

                                                {item.membership_start_date && (
                                                    <View style={{ backgroundColor: theme.colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: 'bold' }}>
                                                            {formatDateRange(item.membership_start_date, item.membership_end_date)}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>
                                                Trx Date: {new Date(item.created_at).toLocaleDateString('id-ID')}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )
                }

                {/* Confirm Delete Button (Floating or Bottom) */}
                {
                    isDeleteMode && selectedHistoryIds.length > 0 && (
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: theme.colors.danger, marginTop: 20 }]}
                            onPress={handleDeleteHistory}
                        >
                            {deleteHistoryLoading ? <ActivityIndicator color="#fff" /> : (
                                <Text style={styles.saveText}>Delete Selected ({selectedHistoryIds.length})</Text>
                            )}
                        </TouchableOpacity>
                    )
                }

                {/* Renewal Modal */}
                <Modal visible={renewModalVisible} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Renew Membership</Text>

                            <Text style={[styles.label, { color: theme.colors.textSecondary, marginBottom: 8 }]}>Select Package</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    {packages.map(pkg => (
                                        <TouchableOpacity
                                            key={pkg.id}
                                            style={[
                                                styles.packageCard,
                                                { borderColor: theme.colors.border },
                                                selectedPackage?.id === pkg.id && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '20' }
                                            ]}
                                            onPress={() => setSelectedPackage(pkg)}
                                        >
                                            <Text style={[styles.packageTitle, { color: theme.colors.text }]}>{pkg.name}</Text>
                                            <Text style={[styles.packagePrice, { color: theme.colors.primary }]}>Rp {pkg.price.toLocaleString()}</Text>
                                            <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>{pkg.duration_days} Days</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            <Text style={[styles.label, { color: theme.colors.textSecondary, marginBottom: 8 }]}>Payment Method</Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                {['cash', 'transfer', 'qris'].map(method => (
                                    <TouchableOpacity
                                        key={method}
                                        style={[
                                            styles.methodChip,
                                            { borderColor: theme.colors.border },
                                            paymentMethod === method && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                        ]}
                                        onPress={() => setPaymentMethod(method)}
                                    >
                                        <Text style={{ color: paymentMethod === method ? '#fff' : theme.colors.text, textTransform: 'capitalize' }}>{method}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                                onPress={handleRenew}
                                disabled={renewLoading}
                            >
                                {renewLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Confirm Renewal</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: 'transparent', marginTop: 8 }]}
                                onPress={() => setRenewModalVisible(false)}
                            >
                                <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

            </ScrollView >
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { padding: 4 },
    title: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20 },
    card: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 20 },
    cardHeader: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 20 },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    memberCode: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    infoContainer: { gap: 8 },
    memberName: { fontSize: 22, fontWeight: 'bold' },
    memberCategory: { fontSize: 16 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
    infoText: { fontSize: 14 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginTop: 10 },
    historyList: { gap: 12 },
    historyItem: { padding: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyAction: { fontWeight: 'bold', fontSize: 14 },
    historyDate: { fontSize: 12, marginTop: 4 },
    historyAmount: { fontWeight: 'bold' },
    form: { gap: 12 },
    label: { fontSize: 12, fontWeight: 'bold' },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, height: 48 },
    saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
    saveText: { color: '#fff', fontWeight: 'bold' },
    actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    actionBtn: { flex: 1, flexDirection: 'row', padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, minHeight: 300 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    packageCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginRight: 10, width: 120 },
    packageTitle: { fontSize: 14, fontWeight: 'bold' },
    packagePrice: { fontSize: 12, fontWeight: '600', marginVertical: 4 },
    methodChip: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }
});
