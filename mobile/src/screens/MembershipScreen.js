import React, { useEffect, useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { theme } from '../config/theme';
import api from '../config/api';
import { Search, Plus, User, SlidersHorizontal } from 'lucide-react-native';
import AddMemberModal from '../components/AddMemberModal';
import MemberDetailModal from '../components/MemberDetailModal';
import { ThemeContext } from '../context/ThemeContext';

export default function MembershipScreen() {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [members, setMembers] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [modalVisible, setModalVisible] = useState(false);

    // Member Detail State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

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

    const handleMemberClick = (member) => {
        setSelectedMember(member);
        setDetailModalVisible(true);
    };

    const getStatusColor = (status, expiryDate) => {
        if (status !== 'active') return theme.colors.danger;

        const now = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);

        if (diffDays < 0) return theme.colors.danger; // Expired
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

    const renderItem = ({ item }) => {
        const color = getStatusColor(item.status, item.current_expiry_date);
        const statusText = getStatusText(item.status, item.current_expiry_date);

        return (
            <TouchableOpacity onPress={() => handleMemberClick(item)}>
                <View style={styles.card}>
                    <View style={[styles.cardLeftBorder, { backgroundColor: color }]} />
                    <View style={styles.cardContent}>
                        <View style={styles.row}>
                            <View style={styles.avatar}>
                                {/* Placeholder Avatar - real app would use item.photo_url */}
                                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.memberName}>{item.name}</Text>
                                <Text style={styles.memberMeta}>
                                    Since {new Date(item.created_at).toLocaleDateString()} • {item.category || 'Umum'}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.statusSection}>
                        <View style={[styles.statusPill, { backgroundColor: color }]}>
                            <Text style={styles.statusText}>{statusText}</Text>
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
                <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus size={24} color={theme.colors.background} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
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
                                <Text style={styles.sectionTitle}>MEMBERS LIST ({filteredMembers.length})</Text>
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
            )}

            <AddMemberModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={() => {
                    setRefreshing(true);
                    fetchMembers();
                }}
            />

            <MemberDetailModal
                visible={detailModalVisible}
                member={selectedMember}
                onClose={() => setDetailModalVisible(false)}
                onSuccess={() => {
                    setRefreshing(true);
                    fetchMembers();
                }}
            />
        </SafeAreaView>
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
