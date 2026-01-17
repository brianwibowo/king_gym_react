import React, { useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { theme } from '../config/theme'; // Removed - using Context
import api from '../config/api';
import { LogOut, User, Lock, Save, Camera, Edit2, Moon, Sun } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
    const { userData, logout, updateUser } = useContext(AuthContext);
    const { theme, toggleTheme, isDarkMode } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [loading, setLoading] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(userData?.name || '');

    // Photo State
    const [selectedImage, setSelectedImage] = useState(null);


    // Password State
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Add Admin State
    const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    const handleAddAdmin = async () => {
        if (!adminName || !adminEmail || !adminPassword) {
            Alert.alert('Error', 'All fields are required');
            return;
        }

        try {
            setLoading(true);
            await api.post('/users/add-admin', {
                name: adminName,
                email: adminEmail,
                password: adminPassword
            });
            Alert.alert('Success', 'New Admin account created!');
            setAdminName('');
            setAdminEmail('');
            setAdminPassword('');
            setIsAddAdminOpen(false);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create admin');
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, // Restored cropping
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled) {
                setSelectedImage(result.assets[0].uri);
                // Optional: Auto-save or show save button. 
                // We will rely on the UI showing a save button when selectedImage is present.
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed: ' + (error.message || 'Unknown error'));
        }
    };

    const updateProfile = async () => {
        if (!name) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('name', name);

            if (selectedImage) {
                const uriParts = selectedImage.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append('photo', {
                    uri: selectedImage,
                    name: `profile.${fileType}`,
                    type: `image/${fileType}`,
                });
            }

            await api.post('/profile/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update local context
            updateUser({ name, photo_url: selectedImage });

            Alert.alert('Success', 'Profile updated successfully');
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'All password fields are required');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New password confirmation does not match');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        try {
            setLoading(true);
            await api.post('/profile/password', {
                new_password: newPassword,
                new_password_confirmation: confirmPassword
            });

            Alert.alert('Success', 'Password changed successfully');
            setIsChangingPassword(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || 'Failed to change password';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: logout
            }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Profile Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={loading}>
                        {selectedImage ? (
                            <Image source={{ uri: selectedImage }} style={styles.avatar} />
                        ) : (
                            userData?.photo_url ? (
                                <Image source={{ uri: userData.photo_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{userData?.name ? userData.name[0].toUpperCase() : 'U'}</Text>
                                </View>
                            )
                        )}
                        <View style={styles.cameraBtn}>
                            <Camera size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    {/* Explicit Save Button for Photo */}
                    {selectedImage && !isEditing && (
                        <TouchableOpacity style={styles.savePhotoBtn} onPress={updateProfile} disabled={loading}>
                            <Save size={16} color="#fff" />
                            <Text style={styles.savePhotoText}>{loading ? 'Saving...' : 'Save Photo'}</Text>
                        </TouchableOpacity>
                    )}

                    {!isEditing ? (
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.name}>{userData?.name}</Text>
                            <Text style={styles.role}>{userData?.role ? userData.role.toUpperCase() : 'USER'}</Text>
                            <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditing(true)}>
                                <Edit2 size={14} color={theme.colors.primary} />
                                <Text style={styles.editProfileText}>Edit Name</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.editNameForm}>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your name"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity style={styles.saveBtn} onPress={() => updateProfile()} disabled={loading}>
                                    <Text style={styles.btnText}>{loading ? 'Saving...' : 'Save'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                                    setIsEditing(false);
                                    setName(userData?.name || '');
                                }}>
                                    <Text style={[styles.btnText, { color: theme.colors.text }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Appearance Card */}
                <View style={[styles.card, isAppearanceOpen && styles.cardActive]}>
                    <TouchableOpacity
                        style={styles.cardHeader}
                        onPress={() => setIsAppearanceOpen(!isAppearanceOpen)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(230, 227, 26, 0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                {isDarkMode ? <Moon size={20} color={theme.colors.primary} /> : <Sun size={20} color={theme.colors.text} />}
                            </View>
                            <Text style={styles.cardTitle}>Appearance</Text>
                        </View>
                        <Text style={styles.expandIcon}>{isAppearanceOpen ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {isAppearanceOpen && (
                        <View style={styles.cardBody}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.label}>Dark Mode</Text>
                                <Switch
                                    trackColor={{ false: '#767577', true: theme.colors.primary }}
                                    thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
                                    ios_backgroundColor="#3e3e3e"
                                    onValueChange={toggleTheme}
                                    value={isDarkMode}
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Change Password Section */}
                <View style={[styles.card, isChangingPassword && styles.cardActive]}>
                    <TouchableOpacity
                        style={styles.cardHeader}
                        onPress={() => setIsChangingPassword(!isChangingPassword)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                                <Lock size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.cardTitle}>Change Password</Text>
                        </View>
                        <Text style={styles.expandIcon}>{isChangingPassword ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {isChangingPassword && (
                        <View style={styles.cardBody}>
                            <Text style={styles.label}>New Password</Text>
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                placeholder="******"
                                placeholderTextColor={theme.colors.textSecondary}
                            />

                            <Text style={styles.label}>Confirm New Password</Text>
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                placeholder="******"
                                placeholderTextColor={theme.colors.textSecondary}
                            />

                            <TouchableOpacity style={styles.fullBtn} onPress={changePassword} disabled={loading}>
                                <Text style={styles.btnText}>{loading ? 'Updating...' : 'Update Password'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Add Admin Account (Superadmin Only) */}
                {userData?.role === 'superadmin' && (
                    <View style={[styles.card, isAddAdminOpen && styles.cardActive]}>
                        <TouchableOpacity
                            style={styles.cardHeader}
                            onPress={() => setIsAddAdminOpen(!isAddAdminOpen)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(156, 39, 176, 0.1)' }]}>
                                    <User size={20} color={theme.colors.secondary || '#9C27B0'} />
                                </View>
                                <Text style={styles.cardTitle}>Add Admin Account</Text>
                            </View>
                            <Text style={styles.expandIcon}>{isAddAdminOpen ? '▲' : '▼'}</Text>
                        </TouchableOpacity>

                        {isAddAdminOpen && (
                            <View style={styles.cardBody}>
                                <Text style={styles.label}>Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Admin Name"
                                    value={adminName}
                                    onChangeText={setAdminName}
                                    placeholderTextColor={theme.colors.textSecondary}
                                />

                                <Text style={styles.label}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="admin@kinggym.com"
                                    value={adminEmail}
                                    onChangeText={setAdminEmail}
                                    autoCapitalize="none"
                                    placeholderTextColor={theme.colors.textSecondary}
                                />

                                <Text style={styles.label}>Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="******"
                                    value={adminPassword}
                                    onChangeText={setAdminPassword}
                                    secureTextEntry
                                    placeholderTextColor={theme.colors.textSecondary}
                                />

                                <TouchableOpacity style={styles.fullBtn} onPress={handleAddAdmin} disabled={loading}>
                                    <Text style={styles.btnText}>{loading ? 'Creating...' : 'Create Account'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color={theme.colors.danger} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>v1.0.0 King Gym App</Text>

            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.l,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 10
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    cameraBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: theme.colors.background
    },
    savePhotoBtn: {
        backgroundColor: theme.colors.success,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 16,
        marginTop: -8, // Pull closer to avatar
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3
    },
    savePhotoText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4
    },
    role: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 12,
        letterSpacing: 1
    },
    editProfileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    editProfileText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold'
    },
    editNameForm: {
        width: '100%',
        alignItems: 'center',
        gap: 12
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden'
    },
    cardActive: {
        borderColor: theme.colors.primary
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16
    },
    cardTitle: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600'
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    expandIcon: {
        color: theme.colors.textSecondary,
        fontSize: 12
    },
    cardBody: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.card // 'rgba(0,0,0,0.2)' replaced for consistency
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginBottom: 6,
        marginTop: 6
    },
    input: {
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8
    },
    cancelBtn: {
        backgroundColor: theme.colors.card,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    fullBtn: {
        backgroundColor: theme.colors.primary,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20
    },
    btnText: {
        color: theme.colors.background,
        fontWeight: 'bold'
    },
    logoutBtn: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.danger
    },
    logoutText: {
        color: theme.colors.danger,
        fontWeight: 'bold',
        fontSize: 16
    },
    version: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 32,
        opacity: 0.5
    }
});
