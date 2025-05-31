import { useState, useCallback } from 'react';
import { NotificationData, NotificationType } from '@/components/CustomNotification';

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const showNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      duration: number = 3000
    ) => {
      setNotification({
        type,
        title,
        message,
        duration,
      });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showSuccess = useCallback(
    (title: string, message: string, duration?: number) => {
      showNotification('success', title, message, duration);
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message: string, duration?: number) => {
      showNotification('error', title, message, duration);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string, duration?: number) => {
      showNotification('warning', title, message, duration);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, duration?: number) => {
      showNotification('info', title, message, duration);
    },
    [showNotification]
  );

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};