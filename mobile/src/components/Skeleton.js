import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const Skeleton = ({ width: w, height, style, borderRadius = 8 }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width: w,
                    height: height,
                    opacity: opacity,
                    borderRadius: borderRadius,
                },
                style,
            ]}
        />
    );
};

const DashboardSkeleton = () => (
    <View style={styles.container}>
        {/* Header Profile */}
        <View style={styles.header}>
            <View>
                <Skeleton width={120} height={20} style={{ marginBottom: 8 }} />
                <Skeleton width={180} height={14} />
            </View>
            <Skeleton width={44} height={44} borderRadius={22} />
        </View>

        {/* Chart Card */}
        <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <Skeleton width={100} height={20} />
                <Skeleton width={30} height={30} borderRadius={8} />
            </View>
            <View style={{ alignItems: 'center' }}>
                <Skeleton width={180} height={180} borderRadius={90} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                <Skeleton width={80} height={40} />
                <Skeleton width={80} height={40} />
            </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
            <Skeleton width={150} height={16} />
            <Skeleton width={50} height={16} />
        </View>

        {/* List Items */}
        {[1, 2, 3].map((i) => (
            <View key={i} style={styles.listItem}>
                <Skeleton width={32} height={32} borderRadius={16} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                    <Skeleton width={120} height={14} style={{ marginBottom: 6 }} />
                    <Skeleton width={80} height={12} />
                </View>
            </View>
        ))}
    </View>
);

const MembershipSkeleton = () => (
    <View style={styles.container}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <Skeleton width={150} height={28} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <Skeleton width={44} height={44} borderRadius={22} />
                <Skeleton width={44} height={44} borderRadius={22} />
            </View>
        </View>

        {/* Search */}
        <Skeleton width={'100%'} height={50} borderRadius={25} style={{ marginBottom: 20 }} />

        {/* Filter Chips */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
            <Skeleton width={80} height={32} borderRadius={16} />
            <Skeleton width={80} height={32} borderRadius={16} />
            <Skeleton width={80} height={32} borderRadius={16} />
        </View>

        {/* List */}
        {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.listItem}>
                <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                    <Skeleton width={100} height={16} style={{ marginBottom: 6 }} />
                    <Skeleton width={80} height={12} style={{ marginBottom: 6 }} />
                    <Skeleton width={150} height={12} />
                </View>
            </View>
        ))}
    </View>
);

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#E0E0E0',
    },
    container: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        backgroundColor: '#F5F5F5',
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
    }
});

export { Skeleton, DashboardSkeleton, MembershipSkeleton };
export default Skeleton;
