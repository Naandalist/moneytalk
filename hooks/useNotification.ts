import { useState, useCallback } from 'react';
import { NotificationData, NotificationType } from '@/components/CustomNotification';

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const showNotification = useCallback(
    (notificationData: NotificationData) => {
      setNotification(notificationData);
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showSuccess = useCallback(
    (title: string, message: string, duration?: number) => {
      showNotification({
        type: 'success',
        title,
        message,
        duration,
      });
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message: string, duration?: number) => {
      showNotification({
        type: 'error',
        title,
        message,
        duration,
      });
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string, duration?: number, actions?: NotificationData['actions']) => {
      showNotification({
        type: 'warning',
        title,
        message,
        duration,
        actions,
      });
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string, duration?: number) => {
      showNotification({
        type: 'info',
        title,
        message,
        duration,
      });
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