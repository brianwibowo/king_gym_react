import React, { useState, useEffect, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
// import { theme } from '../config/theme';
import api from '../config/api';
import { X, Save, Check } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function AddMemberModal({ visible, onClose, onSuccess }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [formData, setFormData] = useState({
        member_code: '',
        name: '',
        address: '',
        phone: '',
        package_id: null,
        payment_method: 'cash'
    });
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchPackages();
        }
    }, [visible]);

    const fetchPackages = async () => {
        try {
            const response = await api.get('/packages');
            setPackages(response.data.filter(p => !p.name.toLowerCase().includes('harian')));
        } catch (error) {
            console.error('Failed to fetch packages', error);
        }
    };

    const handleSubmit = async () => {
        if (!formData.member_code || !formData.name || !formData.package_id || !formData.payment_method) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            await api.post('/members', formData);
            Alert.alert('Success', 'Member (and Transaction) saved successfully!');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                member_code: '',
                name: '',
                address: '',
                phone: '',
                package_id: null,
                payment_method: 'cash'
            });
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} supportedOrientations={['portrait', 'landscape']}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Add New Member</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form}>
                        {/* Member Code */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Member ID (Manual Input)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. KG-2023-001"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={formData.member_code}
                                onChangeText={(t) => setFormData({ ...formData, member_code: t })}
                            />
                        </View>

                        {/* Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Member's Full Name"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={formData.name}
                                onChangeText={(t) => setFormData({ ...formData, name: t })}
                            />
                        </View>

                        {/* Phone */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="08..."
                                keyboardType="phone-pad"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={formData.phone}
                                onChangeText={(t) => setFormData({ ...formData, phone: t })}
                            />
                        </View>

                        {/* Address */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Full Address"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={formData.address}
                                onChangeText={(t) => setFormData({ ...formData, address: t })}
                            />
                        </View>

                        {/* Package Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Select Package</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                                {packages.map((pkg) => (
                                    <TouchableOpacity
                                        key={pkg.id}
                                        style={[
                                            styles.packageCard,
                                            formData.package_id === pkg.id && styles.activePackageCard
                                        ]}
                                        onPress={() => setFormData({ ...formData, package_id: pkg.id })}
                                    >
                                        <Text style={[styles.packageTitle, formData.package_id === pkg.id && styles.activeText]}>
                                            {pkg.name}
                                        </Text>
                                        <Text style={[styles.packagePrice, formData.package_id === pkg.id && styles.activeText]}>
                                            Rp {pkg.price.toLocaleString()}
                                        </Text>
                                        <Text style={[styles.packageDuration, formData.package_id === pkg.id && styles.activeText]}>
                                            {pkg.duration_days} Days
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Payment Method */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Payment Method</Text>
                            <View style={styles.chipContainer}>
                                {['cash', 'qris', 'transfer'].map(method => (
                                    <TouchableOpacity
                                        key={method}
                                        style={[styles.chip, formData.payment_method === method && styles.activeChip]}
                                        onPress={() => setFormData({ ...formData, payment_method: method })}
                                    >
                                        <Text style={[styles.chipText, formData.payment_method === method && styles.activeChipText]}>
                                            {method.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.saButton}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <Text style={styles.saveText}>Saving...</Text>
                        ) : (
                            <>
                                <Save size={20} color={theme.colors.background} />
                                <Text style={styles.saveText}>SAVE MEMBER & PAY</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const createStyles = (theme) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '90%', // Taller for more fields
        padding: theme.spacing.l,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    title: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    form: {
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: theme.spacing.l,
    },
    label: {
        color: theme.colors.textSecondary,
        marginBottom: 8,
        fontSize: 14,
    },
    input: {
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        padding: 16,
        color: theme.colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    chipContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    activeChip: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        color: theme.colors.textSecondary,
        fontWeight: 'bold',
    },
    activeChipText: {
        color: theme.colors.background,
    },
    saButton: {
        backgroundColor: theme.colors.success, // Green for Payment
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
        marginBottom: 30
    },
    saveText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    packageCard: {
        backgroundColor: theme.colors.background,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: 140,
        height: 100,
        justifyContent: 'center',
    },
    activePackageCard: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    packageTitle: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    packagePrice: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '900',
    },
    packageDuration: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        marginTop: 4,
    },
    activeText: {
        color: theme.colors.background, // Black on yellow
    }
});
