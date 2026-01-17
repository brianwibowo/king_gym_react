import React, { useContext, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, Dimensions, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, Calendar, User, ExternalLink, ChevronLeft } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import api from '../config/api';

const { width } = Dimensions.get('window');

// Helper to open Maps
const openMaps = (lat, long) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${long}`;
    const label = 'Attendance Location';
    const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
    });
    Linking.openURL(url);
};

export default function PresenceDetailScreen({ route, navigation }) {
    const { item, userName } = route.params; // Pass item and userName
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const baseURL = api.defaults.baseURL.replace('/api', ''); // Get base URL for images

    const renderDetailSection = (title, time, lat, long, photoPath, isOut) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={[styles.iconBox, isOut ? styles.bgRed : styles.bgGreen]}>
                    <Clock size={20} color={isOut ? theme.colors.error : theme.colors.success} />
                </View>
                <Text style={styles.sectionTitle}>{title}</Text>
                {time ? (
                    <Text style={styles.timeBadge}>{new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                ) : (
                    <Text style={styles.pendingText}>Pending</Text>
                )}
            </View>

            {time && (
                <View style={styles.contentGrid}>
                    {/* Photo */}
                    <View style={styles.photoContainer}>
                        {photoPath ? (
                            <Image
                                source={{ uri: `${baseURL}/storage/${photoPath}` }}
                                style={styles.evidencePhoto}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.noPhoto}>
                                <Text style={styles.noPhotoText}>No Photo</Text>
                            </View>
                        )}
                        <Text style={styles.photoLabel}>Selfie Evidence</Text>
                    </View>

                    {/* Location Info */}
                    <View style={styles.infoContainer}>
                        <View style={styles.infoRow}>
                            <MapPin size={16} color={theme.colors.textSecondary} />
                            <Text style={styles.infoLabel}>Location:</Text>
                        </View>
                        <Text style={styles.coordText}>{lat}, {long}</Text>

                        <TouchableOpacity style={styles.mapBtn} onPress={() => openMaps(lat, long)}>
                            <ExternalLink size={14} color="#FFF" />
                            <Text style={styles.mapBtnText}>Open Maps</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance Detail</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.userRow}>
                        <View style={styles.avatar}>
                            <User size={24} color="#FFF" />
                        </View>
                        <View>
                            <Text style={styles.userName}>{userName || 'Staff Member'}</Text>
                            <Text style={styles.userRole}>Employee</Text>
                        </View>
                    </View>
                    <View style={styles.dateRow}>
                        <Calendar size={16} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.dateText}>
                            {new Date(item.clock_in).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                    </View>
                    <View style={[styles.statusTag, item.clock_out ? styles.tagComplete : styles.tagActive]}>
                        <Text style={styles.tagText}>{item.clock_out ? 'COMPLETED' : 'ON DUTY'}</Text>
                    </View>
                </View>

                {/* Clock In Section */}
                {renderDetailSection('Clock In', item.clock_in, item.lat_in, item.long_in, item.photo_in, false)}

                {/* Clock Out Section */}
                {renderDetailSection('Clock Out', item.clock_out, item.lat_out, item.long_out, item.photo_out, true)}

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
        alignItems: 'center',
        padding: 16,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    backBtn: {
        padding: 4
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    scrollContent: {
        padding: 20,
        gap: 20
    },
    headerCard: {
        backgroundColor: theme.colors.primary,
        borderRadius: 20,
        padding: 20,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    userName: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold'
    },
    userRole: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.1)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    dateText: {
        color: '#FFF',
        fontWeight: '600'
    },
    statusTag: {
        position: 'absolute',
        top: 20,
        right: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    tagComplete: { backgroundColor: '#4CAF50' }, // Green
    tagActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
    tagText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    section: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    bgGreen: { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
    bgRed: { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
    sectionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    timeBadge: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    pendingText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic'
    },
    contentGrid: {
        gap: 16
    },
    photoContainer: {
        gap: 8
    },
    evidencePhoto: {
        width: '100%',
        height: 400, // Increased height to show more detail
        borderRadius: 12,
        backgroundColor: '#000', // Black background for contain mode
        resizeMode: 'contain' // Contain ensures full image is visible
    },
    noPhoto: {
        width: '100%',
        height: 100,
        borderRadius: 12,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed'
    },
    noPhotoText: { color: theme.colors.textSecondary },
    photoLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center'
    },
    infoContainer: {
        backgroundColor: theme.colors.background,
        padding: 12,
        borderRadius: 12,
        gap: 8
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    infoLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12
    },
    coordText: {
        color: theme.colors.text,
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 12
    },
    mapBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
        marginTop: 4
    },
    mapBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold'
    }
});
