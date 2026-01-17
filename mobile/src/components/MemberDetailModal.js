import React, { useState, useEffect, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
// import { theme } from '../config/theme';
import api from '../config/api';
import { X, User, Calendar, MapPin, Clock, Edit2, Trash2, Save } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function MemberDetailModal({ visible, member, onClose, onSuccess }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        if (member) {
            setName(member.name);
            setAddress(member.address || '');
            setIsEditing(false);
        }
    }, [member, visible]);

    if (!member) return null;

    const getStatusText = (status, expiryDate) => {
        if (status !== 'active') return 'EXPIRED';
        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) return 'EXPIRED';
        if (diffDays <= 7) return 'EXPIRING SOON';
        return 'ACTIVE';
    };

    const status = getStatusText(member.status, member.current_expiry_date);
    const isExpired = status === 'EXPIRED';

    const handleUpdate = async () => {
        if (!name) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        try {
            setLoading(true);
            await api.put(`/members/${member.id}`, {
                name,
                address
            });
            Alert.alert('Success', 'Member updated successfully');
            setIsEditing(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update member');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Member',
            'Are you sure you want to delete this member?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await api.delete(`/members/${member.id}`);
                            Alert.alert('Deleted', 'Member deleted successfully');
                            onClose();
                            if (onSuccess) onSuccess();
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to delete member');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="fade" transparent={true} supportedOrientations={['portrait', 'landscape']}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <X size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        {!isEditing && (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconBtn}>
                                    <Edit2 size={20} color={theme.colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                                    <Trash2 size={20} color={theme.colors.danger} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.headerProfile}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
                        </View>
                        {!isEditing ? (
                            <>
                                <Text style={styles.name}>{member.name}</Text>
                                <Text style={styles.code}>{member.member_code}</Text>
                            </>
                        ) : (
                            <Text style={styles.editTitle}>Edit Member</Text>
                        )}

                        <View style={[styles.statusBadge, isExpired ? styles.bgRed : styles.bgGreen]}>
                            <Text style={styles.statusText}>{status}</Text>
                        </View>
                    </View>

                    <ScrollView style={styles.detailsContainer}>
                        {isEditing ? (
                            <View style={styles.form}>
                                <Text style={styles.label}>Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Member Name"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />

                                <Text style={styles.label}>Address</Text>
                                <TextInput
                                    style={styles.input}
                                    value={address}
                                    onChangeText={setAddress}
                                    placeholder="Address"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />
                            </View>
                        ) : (
                            <>
                                <View style={styles.detailItem}>
                                    <MapPin size={20} color={theme.colors.primary} />
                                    <View>
                                        <Text style={styles.label}>Address</Text>
                                        <Text style={styles.value}>{member.address || 'No address provided'}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailItem}>
                                    <User size={20} color={theme.colors.primary} />
                                    <View>
                                        <Text style={styles.label}>Category</Text>
                                        <Text style={styles.value}>{member.category || 'N/A'}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailItem}>
                                    <Calendar size={20} color={theme.colors.primary} />
                                    <View>
                                        <Text style={styles.label}>Joined Date</Text>
                                        <Text style={styles.value}>{new Date(member.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailItem}>
                                    <Clock size={20} color={theme.colors.primary} />
                                    <View>
                                        <Text style={styles.label}>Expiry Date</Text>
                                        <Text style={styles.value}>{member.current_expiry_date || 'N/A'}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>

                    {isEditing ? (
                        <View style={styles.editActions}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.cancelBtn]}
                                onPress={() => setIsEditing(false)}
                                disabled={loading}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.saveBtn]}
                                onPress={handleUpdate}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.backButton} onPress={onClose}>
                            <Text style={styles.backButtonText}>BACK</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (theme) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    closeButton: {
        padding: 8
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8
    },
    iconBtn: {
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 8
    },
    headerProfile: {
        alignItems: 'center',
        marginBottom: 32
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        marginBottom: 16
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.primary
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 4
    },
    code: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 16
    },
    editTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16
    },
    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    bgRed: { backgroundColor: theme.colors.danger },
    bgGreen: { backgroundColor: theme.colors.success },
    statusText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12
    },
    detailsContainer: {
        marginBottom: 24
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        backgroundColor: theme.colors.background,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 4
    },
    value: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '500'
    },
    input: {
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    backButton: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    backButtonText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1
    },
    editActions: {
        flexDirection: 'row',
        gap: 12
    },
    actionBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cancelBtn: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    saveBtn: {
        backgroundColor: theme.colors.primary
    },
    cancelBtnText: {
        color: theme.colors.text,
        fontWeight: 'bold'
    },
    saveBtnText: {
        color: theme.colors.background,
        fontWeight: 'bold'
    }
});
