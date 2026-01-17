import React, { useState, useContext, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { theme } from '../config/theme';
import api from '../config/api';
import { Save, Trash2, Edit2, ArrowLeft, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemeContext } from '../context/ThemeContext';

export default function ProductDetailScreen({ route, navigation }) {
    const { theme } = useContext(ThemeContext);
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { product, isNew } = route.params || {};
    const [isEditing, setIsEditing] = useState(isNew || false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState(product?.name || '');
    const [price, setPrice] = useState(product?.price?.toString() || '');
    const [stock, setStock] = useState(product?.stock?.toString() || '');
    const [image, setImage] = useState(product?.image_url || null);
    const [selectedImage, setSelectedImage] = useState(null); // URI for upload

    // Title based on mode
    React.useLayoutEffect(() => {
        navigation.setOptions({
            title: isNew ? 'Add New Product' : 'Product Detail'
        });
    }, [navigation, isNew]);

    // Image Picker
    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, // Restored cropping
                aspect: [1, 1], // Square crop for products
                quality: 0.5,
            });

            if (!result.canceled) {
                setSelectedImage(result.assets[0].uri);
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed: ' + (error.message || 'Unknown error'));
        }
    };

    // Create Handler
    const handleCreate = async () => {
        if (!name || !price || !stock) {
            Alert.alert('Validation Error', 'All fields are required');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('stock', stock);

            if (selectedImage) {
                const uriParts = selectedImage.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append('image', {
                    uri: selectedImage,
                    name: `product.${fileType}`,
                    type: `image/${fileType}`,
                });
            }

            await api.post('/products', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Alert.alert('Success', 'Product created successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Create Error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to create product');
        } finally {
            setLoading(false);
        }
    };

    // Update Handler
    const handleSave = async () => {
        if (!name || !price || !stock) {
            Alert.alert('Validation Error', 'All fields are required');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', price);
            formData.append('stock', stock);
            // formData.append('_method', 'PUT'); // Laravel sometimes needs this for multipart PUT

            if (selectedImage) {
                const uriParts = selectedImage.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append('image', {
                    uri: selectedImage,
                    name: `product.${fileType}`,
                    type: `image/${fileType}`,
                });
            }

            // Note: Axios PUT with FormData can be tricky in some environments. 
            // Often cleaner to use POST with _method=PUT for file uploads in Laravel.
            // Let's try direct POST to /products/{id}?method=PUT if simple PUT fails, 
            // but standard Resource controller expects PUT/PATCH at /{id}.
            // Laravel handles PUT with mulitpart if configured, but _method is safer.
            formData.append('_method', 'PUT');

            await api.post(`/products/${product.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Alert.alert('Success', 'Product updated successfully');
            setIsEditing(false);
            setSelectedImage(null);
        } catch (error) {
            console.error('Update Error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update product');
        } finally {
            setLoading(false);
        }
    };

    // Delete Handler
    const handleDelete = () => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await api.delete(`/products/${product.id}`);
                            Alert.alert('Deleted', 'Product deleted successfully', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } catch (error) {
                            console.error('Delete Error:', error);
                            Alert.alert('Error', 'Failed to delete product');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Header Info */}
                {!isNew && (
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.imageContainer} onPress={isEditing ? handlePickImage : null} disabled={!isEditing}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.productImage} />
                            ) : (
                                <View style={styles.iconBox}>
                                    <Text style={styles.iconText}>{name ? name[0] : '?'}</Text>
                                </View>
                            )}
                            {isEditing && (
                                <View style={styles.cameraBadge}>
                                    <Camera size={16} color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>

                        {!isEditing ? (
                            <>
                                <Text style={styles.title}>{name}</Text>
                                <Text style={styles.price}>Rp {parseInt(price || 0).toLocaleString('id-ID')}</Text>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>Stock: {stock}</Text>
                                </View>
                            </>
                        ) : null}
                    </View>
                )}

                {/* Form (Show if editing OR isNew) */}
                {(isEditing || isNew) && (
                    <View style={styles.card}>
                        {isNew && (
                            <TouchableOpacity style={[styles.imageContainer, { marginBottom: 20 }]} onPress={handlePickImage}>
                                {image ? (
                                    <Image source={{ uri: image }} style={styles.productImage} />
                                ) : (
                                    <View style={styles.iconBox}>
                                        <Text style={styles.iconText}>{name ? name[0] : '+'}</Text>
                                    </View>
                                )}
                                <View style={styles.cameraBadge}>
                                    <Camera size={16} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        )}
                        <View style={styles.form}>
                            <Text style={styles.label}>Product Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Product Name"
                                placeholderTextColor={theme.colors.textSecondary}
                            />

                            <Text style={styles.label}>Price (Rp)</Text>
                            <TextInput
                                style={styles.input}
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="numeric"
                                placeholder="Price"
                                placeholderTextColor={theme.colors.textSecondary}
                            />

                            <Text style={styles.label}>Stock</Text>
                            <TextInput
                                style={styles.input}
                                value={stock}
                                onChangeText={setStock}
                                keyboardType="numeric"
                                placeholder="Stock"
                                placeholderTextColor={theme.colors.textSecondary}
                            />
                        </View>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                    {!isNew && !isEditing && (
                        <>
                            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                                <Edit2 size={20} color={theme.colors.background} />
                                <Text style={styles.btnText}>Edit Product</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                                <Trash2 size={20} color={theme.colors.danger} />
                                <Text style={[styles.btnText, { color: theme.colors.danger }]}>Delete Product</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {(isEditing || isNew) && (
                        <>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={isNew ? handleCreate : handleSave}
                                disabled={loading}
                            >
                                <Save size={20} color={theme.colors.background} />
                                <Text style={styles.btnText}>{loading ? 'Saving...' : (isNew ? 'Create Product' : 'Save Changes')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => {
                                    if (isNew) navigation.goBack();
                                    else setIsEditing(false);
                                }}
                                disabled={loading}
                            >
                                <Text style={[styles.btnText, { color: theme.colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

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
        flexGrow: 1, // Allow content to fill
        justifyContent: 'center', // Center vertically
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 24
    },
    imageContainer: {
        width: 120,
        height: 120,
        borderRadius: 16,
        marginBottom: 16,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center'
    },
    productImage: {
        width: 120,
        height: 120,
        borderRadius: 16,
    },
    cameraBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff'
    },
    iconBox: {
        width: 120,
        height: 120,
        borderRadius: 16,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center'
    },
    price: {
        fontSize: 20,
        color: theme.colors.primary,
        fontWeight: 'bold',
        marginBottom: 16
    },
    badge: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    badgeText: {
        color: theme.colors.textSecondary,
        fontWeight: 'bold'
    },
    form: {
        width: '100%'
    },
    label: {
        color: theme.colors.textSecondary,
        marginBottom: 4,
        fontSize: 12,
        alignSelf: 'flex-start', // Ensure left alignment
        marginLeft: 4
    },
    input: {
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    actions: {
        gap: 12
    },
    editBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8
    },
    deleteBtn: {
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12, // Fixed: was "radius"
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.danger
    },
    saveBtn: {
        backgroundColor: theme.colors.success,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8
    },
    cancelBtn: {
        backgroundColor: theme.colors.card,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    btnText: {
        color: theme.colors.background,
        fontWeight: 'bold',
        fontSize: 16
    }
});
