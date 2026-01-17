import React, { useState, useContext, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../context/AuthContext';
import { Lock, Mail } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

export default function LoginScreen() {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = React.useContext(AuthContext);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
        } catch (error) {
            Alert.alert('Login Failed', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Logic
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirm, setResetConfirm] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!resetEmail || !resetPassword || !resetConfirm) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        if (resetPassword !== resetConfirm) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setResetLoading(true);
        // We will assume using the same 'api' instance but unauthenticated? 
        // Actually api.js might attach token if present. 
        // Since we are logged out, token is null, so it shouldn't attach invalid token.
        // But we need to import 'api' if not imported. 
        // Wait, AuthContext handles login. We might need a direct axios call or import api properly.
        // Let's import api in LoginScreen first.
        try {
            // We need to import api manually here or expose a reset function in context.
            // Easier to just import api.
            const api = require('../config/api').default;
            await api.post('/forgot-password', {
                email: resetEmail,
                new_password: resetPassword,
                new_password_confirmation: resetConfirm
            });
            Alert.alert('Success', 'Password has been reset. You can now login.');
            setShowForgot(false);
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to reset password';
            Alert.alert('Error', msg);
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <View style={styles.contentWrapper}>
                    <View style={styles.headerContainer}>
                        {/* Replace with actual logo if available, for now using icon.png or just text */}
                        <Image
                            source={require('../../assets/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>KING GYM</Text>
                        <Text style={styles.subtitle}>Management System</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="owner@example.com"
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>LOGIN</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.forgotBtn}
                            onPress={() => setShowForgot(true)}
                        >
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Forgot Password Modal */}
            {showForgot && (
                <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reset Password</Text>
                        <Text style={styles.modalSubtitle}>Enter your email and new password.</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Email"
                            placeholderTextColor="#999"
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="New Password"
                            placeholderTextColor="#999"
                            secureTextEntry
                            value={resetPassword}
                            onChangeText={setResetPassword}
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Confirm Password"
                            placeholderTextColor="#999"
                            secureTextEntry
                            value={resetConfirm}
                            onChangeText={setResetConfirm}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowForgot(false)}>
                                <Text style={{ color: '#666', fontWeight: 'bold' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmit} onPress={handleResetPassword} disabled={resetLoading}>
                                {resetLoading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Reset</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const createStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 16,
        borderRadius: 16
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.colors.text,
        letterSpacing: 1,
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontWeight: '500'
    },
    formContainer: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    inputIcon: {
        marginLeft: 16,
        marginRight: 8
    },
    input: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: theme.colors.text,
    },
    button: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: theme.colors.background,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    forgotBtn: {
        marginTop: 20,
        alignItems: 'center'
    },
    forgotText: {
        color: theme.colors.textSecondary,
    },
    // Modal Styles
    modalOverlay: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 1000
    },
    modalContent: {
        width: '100%',
        backgroundColor: theme.colors.card,
        padding: 24,
        borderRadius: 20,
        gap: 12
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center'
    },
    modalSubtitle: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 12
    },
    modalInput: {
        backgroundColor: theme.colors.background,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.text
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12
    },
    modalCancel: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center'
    },
    modalSubmit: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        backgroundColor: theme.colors.primary,
        alignItems: 'center'
    }
});
