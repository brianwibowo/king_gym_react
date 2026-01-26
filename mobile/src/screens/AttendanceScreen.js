import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, FlatList, ActivityIndicator, Modal, Image, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
// Add BASE_URL from api config or env if needed, usually api base url is enough but for download we might need full url
// Assuming api.defaults.baseURL is available or we reconstruct it.
// Actually, better to use the same logic as MembershipScreen export.
import { MapPin, Camera, Clock, X, RotateCcw, ChevronLeft, ChevronRight, Calendar, FileText } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to get Base URL from api instance
const BASE_URL = api.defaults.baseURL;

const { width } = Dimensions.get('window');

export default function AttendanceScreen({ navigation }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { userData } = React.useContext(AuthContext);

    // Data State
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clocking, setClocking] = useState(false);

    // Camera & Location State
    const [permission, requestPermission] = useCameraPermissions();
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [location, setLocation] = useState(null);
    const [actionType, setActionType] = useState(null); // 'in' or 'out'
    const cameraRef = useRef(null);

    // Date State (Superadmin Only)
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Date Format Helpers
    const formattedDate = useMemo(() => {
        const d = currentDate;
        const pad = (n) => n < 10 ? '0' + n : n;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }, [currentDate]);

    const displayDate = currentDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    useEffect(() => {
        fetchHistory();
    }, [formattedDate]); // Refetch when date changes

    const fetchHistory = async () => {
        try {
            setLoading(true);
            // Pass date param (backend handles whether to use it or not based on role)
            const response = await api.get('/attendance/history', {
                params: { date: formattedDate }
            });
            setHistory(response.data);
        } catch (error) {
            console.error('Attendance Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const changeDate = (days) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + days);
        setCurrentDate(newDate);
    };

    const onChangeDate = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setCurrentDate(selectedDate);
        }
    };



    const handleActionPress = async (type) => {
        setActionType(type);
        setCapturedImage(null);
        setLocation(null);

        // Check Permissions
        const { status: cameraStatus } = await requestPermission();
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

        if (cameraStatus !== 'granted' || locationStatus !== 'granted') {
            Alert.alert('Permission Required', 'Camera and Location access is needed for attendance.');
            return;
        }

        // Get Location ASAP
        setClocking(true);
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(loc.coords);
            setShowCamera(true);
        } catch (e) {
            Alert.alert('Location Error', 'Failed to get current location.');
        } finally {
            setClocking(false);
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
                const manipulated = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [{ resize: { width: 600 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                setCapturedImage(manipulated);
                setShowCamera(false);
            } catch (error) {
                Alert.alert('Error', 'Failed to take photo');
            }
        }
    };

    const submitAttendance = async () => {
        if (!capturedImage || !location) {
            Alert.alert('Error', 'Missing photo or location data.');
            return;
        }

        setClocking(true);
        try {
            const formData = new FormData();
            formData.append('latitude', location.latitude.toString());
            formData.append('longitude', location.longitude.toString());

            const filename = capturedImage.uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            formData.append('photo', {
                uri: capturedImage.uri,
                name: filename,
                type: type,
            });

            if (actionType === 'in') {
                formData.append('work_description', 'On Site Presence');
                await api.post('/attendance/clock-in', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                Alert.alert('Success', 'Clock In Verified!');
            } else {
                await api.post('/attendance/clock-out', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                Alert.alert('Success', 'Clock Out Verified!');
            }

            setCapturedImage(null);
            setLocation(null);
            fetchHistory();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || 'Attendance Failed';
            Alert.alert('Error', msg);
        } finally {
            setClocking(false);
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.historyCard}
            onPress={() => navigation.navigate('PresenceDetail', { item, userName: userData?.name })}
        >
            <View style={styles.historyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.dateText}>{new Date(item.clock_in).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, item.clock_out ? styles.completeBadge : styles.activeBadge]}>
                    <Text style={styles.statusText}>{item.clock_out ? 'COMPLETE' : 'ON DUTY'}</Text>
                </View>
            </View>

            <Text style={{ fontSize: 12, color: theme.colors.primary, marginBottom: 8, fontWeight: 'bold' }}>
                {item.user?.name || userData?.name || 'User'}
            </Text>

            <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>CLOCK IN</Text>
                    <Text style={styles.timeValue}>
                        {new Date(item.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>CLOCK OUT</Text>
                    <Text style={styles.timeValue}>
                        {item.clock_out ? new Date(item.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (capturedImage) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={[styles.title, { marginBottom: 20 }]}>Confirm {actionType === 'in' ? 'Clock In' : 'Clock Out'}</Text>
                <Image source={{ uri: capturedImage.uri }} style={styles.previewImage} />

                <View style={styles.confirmActions}>
                    <TouchableOpacity style={styles.retakeBtn} onPress={() => { setCapturedImage(null); setShowCamera(true); }}>
                        <RotateCcw size={24} color={theme.colors.text} />
                        <Text style={styles.retakeText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.confirmBtn} onPress={submitAttendance} disabled={clocking}>
                        {clocking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>SUBMIT</Text>}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (showCamera) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <CameraView style={StyleSheet.absoluteFill} facing="front" ref={cameraRef} />
                <View style={styles.cameraOverlay}>
                    <TouchableOpacity style={styles.closeCamera} onPress={() => setShowCamera(false)}>
                        <X size={32} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                        <View style={styles.captureInner} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                <View>
                    <Text style={styles.title}>Attendance</Text>
                    <Text style={styles.subtitle}>Welcome, {userData?.name || 'Staff'}</Text>
                </View>
                {/* Recap Btn (Superadmin Only) */}
                {userData?.role === 'superadmin' && (
                    <TouchableOpacity style={styles.recapBtn} onPress={() => navigation.navigate('ShiftRecap')}>
                        <FileText size={24} color={theme.colors.primary} />
                        <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: 'bold' }}>Rekap Shift</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[styles.clockBtn, styles.inBtn]}
                    onPress={() => handleActionPress('in')}
                    disabled={clocking}
                >
                    <MapPin size={24} color="#000" />
                    <Text style={styles.btnText}>CLOCK IN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.clockBtn, styles.outBtn]}
                    onPress={() => handleActionPress('out')}
                    disabled={clocking}
                >
                    <Clock size={24} color="#FFF" />
                    <Text style={[styles.btnText, { color: '#FFF' }]}>CLOCK OUT</Text>
                </TouchableOpacity>
            </View>

            {/* Superadmin Date Filter */}
            {userData?.role === 'superadmin' && (
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
            )}

            <Text style={styles.sectionTitle}>
                {userData?.role === 'superadmin' ? `All Attendance` : 'History (Last 30 Days)'}
            </Text>

            {loading ? (
                <ActivityIndicator color={theme.colors.primary} />
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No attendance history found.</Text>
                    }
                />
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
        padding: theme.spacing.l,
    },
    title: {
        color: theme.colors.text,
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4
    },
    actionContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.l,
        gap: theme.spacing.m,
        marginBottom: theme.spacing.xl,
    },
    clockBtn: {
        flex: 1,
        height: 120,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    inBtn: {
        backgroundColor: theme.colors.primary,
    },
    outBtn: {
        backgroundColor: theme.colors.card,
        borderWidth: 2,
        borderColor: theme.colors.border,
    },
    btnText: {
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        paddingHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.m,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    listContent: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: 20,
    },
    historyCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.m,
        alignItems: 'center'
    },
    dateText: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    activeBadge: {
        backgroundColor: theme.colors.primary,
    },
    completeBadge: {
        backgroundColor: theme.colors.success,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeBlock: {
        flex: 1,
        alignItems: 'center',
    },
    timeLabel: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        marginBottom: 2,
    },
    timeValue: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: theme.colors.border,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 20,
    },
    // Updated overlay for Absolute Positioning
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: 50
    },
    captureBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center'
    },
    captureInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: 'black'
    },
    closeCamera: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10
    },
    previewImage: {
        width: width * 0.8,
        height: width * 1.2, // 3:4 aspect or similar
        borderRadius: 16,
        marginBottom: 30
    },
    confirmActions: {
        flexDirection: 'row',
        gap: 20,
        alignItems: 'center'
    },
    retakeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12
    },
    retakeText: {
        color: theme.colors.text,
        fontWeight: 'bold'
    },
    confirmBtn: {
        backgroundColor: theme.colors.success,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30
    },
    confirmText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16
    },
    // Date Nav Styles
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
        padding: 8,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    navBtn: {
        padding: 4,
    },
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // Modal Styles
    recapBtn: {
        alignItems: 'center',
        marginTop: 4
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        borderRadius: 16,
        padding: 20,
        elevation: 5
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    pickerBtn: {
        padding: 8,
        borderWidth: 1,
        borderColor: '#ccc', // Use theme logic ideally
        borderRadius: 8
    },
    monthDisplay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8
    },
    exportBtn: {
        backgroundColor: '#4CAF50', // Success green or primary
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 10
    },
    exportBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});
