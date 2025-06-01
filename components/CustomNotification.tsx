import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react-native';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export interface NotificationData {
    type: NotificationType;
    title: string;
    message: string;
    duration?: number;
    actions?: {
        label: string;
        onPress: () => void;
        style?: 'default' | 'destructive' | 'cancel';
    }[];
}

interface CustomNotificationProps {
    notification: NotificationData | null;
    onClose: () => void;
}

export default function CustomNotification({ notification, onClose }: CustomNotificationProps) {
    const { colors, isDark } = useTheme();
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(-100));

    useEffect(() => {
        if (notification) {
            // Show animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-hide if duration is specified
            if (notification.duration && notification.duration > 0) {
                const timer = setTimeout(() => {
                    hideNotification();
                }, notification.duration);

                return () => clearTimeout(timer);
            }
        }
    }, [notification]);

    const hideNotification = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    const getIcon = (type: NotificationType) => {
        const iconSize = 24;
        switch (type) {
            case 'success':
                return <CheckCircle size={iconSize} color={colors.success} />;
            case 'error':
                return <XCircle size={iconSize} color={colors.error} />;
            case 'warning':
                return <AlertCircle size={iconSize} color={colors.warning} />;
            case 'info':
                return <AlertCircle size={iconSize} color={colors.primary} />;
            default:
                return <AlertCircle size={iconSize} color={colors.primary} />;
        }
    };

    const getBackgroundColor = (type: NotificationType) => {
        const opacity = isDark ? '30' : '15'; // More opacity in dark mode, less in light mode
        switch (type) {
            case 'success':
                return colors.success + opacity;
            case 'error':
                return colors.error + opacity;
            case 'warning':
                return colors.warning + opacity;
            case 'info':
                return colors.primary + opacity;
            default:
                return colors.primary + opacity;
        }
    };

    const getBorderColor = (type: NotificationType) => {
        const opacity = isDark ? '60' : '40'; // More opacity in dark mode
        switch (type) {
            case 'success':
                return colors.success + opacity;
            case 'error':
                return colors.error + opacity;
            case 'warning':
                return colors.warning + opacity;
            case 'info':
                return colors.primary + opacity;
            default:
                return colors.primary + opacity;
        }
    };

    const getTextColor = (type: NotificationType) => {
        // Use theme text colors for better readability
        return colors.text;
    };

    const getSecondaryTextColor = (type: NotificationType) => {
        // Use theme secondary text colors for better readability
        return colors.textSecondary;
    };

    if (!notification) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(notification.type),
                    borderColor: getBorderColor(notification.type),
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    {getIcon(notification.type)}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: getTextColor(notification.type) }]}>
                        {notification.title}
                    </Text>
                    <Text style={[styles.message, { color: getSecondaryTextColor(notification.type) }]}>
                        {notification.message}
                    </Text>
                </View>
                <TouchableOpacity onPress={hideNotification} style={styles.closeButton}>
                    <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
            {notification.actions && (
                <View style={styles.actionsContainer}>
                    {notification.actions.map((action, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.actionButton,
                                {
                                    backgroundColor: action.style === 'destructive' ? colors.error :
                                        action.style === 'cancel' ? colors.cardAlt : colors.primary,
                                },
                            ]}
                            onPress={() => {
                                action.onPress();
                                if (action.style === 'destructive') {
                                    // For delete actions, show success notification for 3 seconds
                                    setTimeout(() => {
                                        hideNotification();
                                    }, 3000);
                                } else if (action.style !== 'cancel') {
                                    hideNotification();
                                }
                            }}
                        >
                            <Text style={[
                                styles.actionButtonText,
                                { color: action.style === 'cancel' ? colors.text : colors.white }
                            ]}>
                                {action.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 60,
        left: 16,
        right: 16,
        borderRadius: 12,
        borderWidth: 1,
        zIndex: 1000,
        // Remove all shadow properties to eliminate boundary box
        // shadowColor: '#000',
        // shadowOffset: {
        //     width: 0,
        //     height: 2,
        // },
        // shadowOpacity: 0.08,
        // shadowRadius: 4,
        // elevation: 3,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
    },
    iconContainer: {
        marginRight: 12,
        marginTop: 2,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        marginBottom: 4,
        lineHeight: 20,
    },
    message: {
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        lineHeight: 18,
    },
    closeButton: {
        marginLeft: 12,
        marginTop: 2,
        padding: 4,
    },
    actionsContainer: {
        flexDirection: 'row',
        marginTop: 2,
        padding: 8,
        gap: 16,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
    },
    actionButtonText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        textAlign: 'center',
    },
});