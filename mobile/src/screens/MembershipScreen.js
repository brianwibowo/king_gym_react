import React, { useEffect, useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { theme } from '../config/theme';
import api from '../config/api';
import { Search, Plus, User, SlidersHorizontal, FileSpreadsheet } from 'lucide-react-native';
import AddMemberModal from '../components/AddMemberModal';
import { ThemeContext } from '../context/ThemeContext';
import { MembershipSkeleton } from '../components/Skeleton'; // Import
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';

export default function MembershipScreen({ navigation }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [members, setMembers] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const response = await api.get('/members');
            setMembers(response.data);
            applyFilters(searchQuery, selectedCategory, response.data);
        } catch (error) {
            // Alert.alert('Error', 'Failed to fetch members'); // Suppress error for now in dev if empty
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const applyFilters = (query, category, sourceData) => {
        let result = sourceData || members;

        // Filter by Search
        if (query) {
            result = result.filter(member =>
                member.name.toLowerCase().includes(query.toLowerCase()) ||
                member.member_code.toLowerCase().includes(query.toLowerCase())
            );
        }

        // Filter by Category
        if (category !== 'All') {
            if (category === 'Expired') {
                const now = new Date();
                result = result.filter(member => {
                    if (member.status !== 'active') return true;
                    const expiry = new Date(member.current_expiry_date);
                    return expiry < now;
                });
            } else {
                result = result.filter(member => member.category === category);
            }
        }

        setFilteredMembers(result);
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        applyFilters(text, selectedCategory);
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        applyFilters(searchQuery, category);
    };

    const getStatusColor = (status, expiryDate) => {
        if (status !== 'active') return theme.colors.danger;

        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) return theme.colors.danger; // Expired
        if (diffDays <= 7) return '#FFA500'; // Expiring Soon (Orange)
        if (diffDays <= 7) return '#FFA500'; // Expiring Soon (Orange)
        return theme.colors.success; // Active
    };

    const getStatusText = (status, expiryDate) => {
        if (status !== 'active') return 'EXPIRED';
        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) return 'EXPIRED';
        if (diffDays <= 7) return 'EXP SOON';
        return 'ACTIVE';
    }

    const handleExport = async () => {
        try {
            setLoading(true);
            const userToken = await AsyncStorage.getItem('userToken');

            if (!userToken) {
                Alert.alert('Error', 'Unauthorized');
                return;
            }

            // Change extension to .xlsx
            const fileUri = FileSystem.documentDirectory + `members-${new Date().toISOString().split('T')[0]}.xlsx`;

            const downloadRes = await FileSystem.downloadAsync(
                `${BASE_URL}/members/export`,
                fileUri,
                {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                }
            );

            if (downloadRes.status !== 200) {
                Alert.alert('Error', 'Failed to download file');
                return;
            }

            // Success Popup
            Alert.alert(
                'Download Successful! ✅',
                `File saved to your device.\n\nPath: ${fileUri}`,
                [
                    { text: 'OK' },
                    {
                        text: 'Share/Open', isPreferred: true, onPress: async () => {
                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(downloadRes.uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                            } else {
                                Alert.alert('Info', 'Sharing not available');
                            }
                        }
                    }
                ]
            );

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Export failed');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        const color = getStatusColor(item.status, item.current_expiry_date);
        const statusText = getStatusText(item.status, item.current_expiry_date);

        return (
            <TouchableOpacity onPress={() => navigation.navigate('MemberDetail', { member: item })}>
                <View style={[styles.card, { position: 'relative', overflow: 'hidden' }]}>
                    {/* Status Pill in Top Right */}
                    <View style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        backgroundColor: color,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 12,
                        zIndex: 1
                    }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{statusText}</Text>
                    </View>

                    <View style={styles.cardContent}>
                        <View style={styles.row}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                            </View>
                            <View style={{ flex: 1, paddingRight: 60 }}>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.primary, marginBottom: 4 }}>{item.member_code}</Text>
                                <Text style={styles.memberName}>{item.name}</Text>
                                <Text style={styles.memberMeta}>
                                    {item.category || 'Umum'} • Ends {new Date(item.current_expiry_date).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topHeader}>
                <Text style={styles.pageTitle}>Membership</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={[styles.addButton, { backgroundColor: '#217346' }]} onPress={handleExport}>
                        <FileSpreadsheet size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Plus size={24} color={theme.colors.background} />
                    </TouchableOpacity>
                </View>
            </View>



            {
                loading ? (
                    <MembershipSkeleton />
                ) : (
                    <FlatList
                        data={filteredMembers}
                        renderItem={renderItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={
                            <View>
                                <View style={styles.searchSection}>
                                    <View style={styles.searchBar}>
                                        <Search size={20} color={theme.colors.textSecondary} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Search members..."
                                            placeholderTextColor={theme.colors.textSecondary}
                                            value={searchQuery}
                                            onChangeText={handleSearch}
                                        />
                                    </View>
                                </View>

                                <View style={styles.filterSection}>
                                    <FlatList
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        data={['All', 'Mahasiswa', 'Umum', 'Couple', 'Expired']}
                                        keyExtractor={i => i}
                                        contentContainerStyle={{ paddingHorizontal: theme.spacing.l, gap: 12 }}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[
                                                    styles.chip,
                                                    selectedCategory === item && styles.activeChip,
                                                    item === 'Expired' && selectedCategory !== 'Expired' && { borderColor: theme.colors.danger }
                                                ]}
                                                onPress={() => handleCategorySelect(item)}
                                            >
                                                <Text style={[
                                                    styles.chipText,
                                                    selectedCategory === item && styles.activeChipText,
                                                    item === 'Expired' && selectedCategory !== 'Expired' && { color: theme.colors.danger }
                                                ]}>{item}</Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                </View>

                                <View style={styles.listHeader}>
                                    <Text style={styles.sectionTitle}>MEMBERS ({filteredMembers.length})</Text>
                                </View>
                            </View>
                        }
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            fetchMembers();
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No members found</Text>
                            </View>
                        }
                    />
                )
            }

            <AddMemberModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={() => {
                    setRefreshing(true);
                    fetchMembers();
                }}
            />

        </SafeAreaView >
    );
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.m,
        paddingTop: theme.spacing.s,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchSection: {
        paddingHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.m,
    },
    searchBar: {
        backgroundColor: theme.colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 30, // Pill shape like design
        gap: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    input: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 16,
    },
    filterSection: {
        marginBottom: theme.spacing.l,
    },
    chip: {
        backgroundColor: theme.colors.card,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    activeChip: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    activeChipText: {
        color: theme.colors.background,
    },
    listHeader: {
        paddingHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.s,
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    card: {
        marginHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.m,
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 16,
    },
    cardLeftBorder: {
        width: 4,
        height: '100%',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
        paddingVertical: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    avatarText: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    memberName: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    memberMeta: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    statusSection: {
        justifyContent: 'center',
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: theme.colors.textSecondary,
    }
});
