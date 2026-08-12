import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { colors } from '@/constants/theme';
import { registerPushToken } from '@/services/notification.api';
import { useAuthStore } from '@/store/auth.store';
import type { NotificationData } from '@/types/notification';

const NOTIFICATION_CHANNEL_ID = 'livestock-alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

function getPushTokenPlatform() {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return Platform.OS;
  }

  return 'web';
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Малын мэдэгдэл',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.primary,
  });
}

async function getPermissionStatus() {
  const existingPermission = await Notifications.getPermissionsAsync();

  if (existingPermission.status === 'granted') {
    return existingPermission.status;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();
  return requestedPermission.status;
}

function getNotificationData(
  notification: Notifications.Notification,
): NotificationData {
  return notification.request.content.data as NotificationData;
}

function navigateFromNotification(notification: Notifications.Notification) {
  const data = getNotificationData(notification);

  if (typeof data.livestockId === 'string' && data.livestockId.length > 0) {
    router.push({
      pathname: '/livestock/[id]',
      params: { id: data.livestockId },
    });
    return;
  }

  if (typeof data.url === 'string' && data.url.startsWith('/')) {
    router.push(data.url as Href);
  }
}

async function registerForPushNotifications() {
  await ensureAndroidNotificationChannel();

  const permissionStatus = await getPermissionStatus();

  if (permissionStatus !== 'granted') {
    return;
  }

  const projectId = getProjectId();

  if (!projectId) {
    console.warn(
      'Expo push token registration skipped: EAS projectId is not configured.',
    );
    return;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  await registerPushToken({
    token,
    platform: getPushTokenPlatform(),
  });
}

export function useNotifications() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isProfileComplete = useAuthStore((state) => state.isProfileComplete);

  useEffect(() => {
    if (Platform.OS === 'web' || !isAuthenticated || !isProfileComplete) {
      return undefined;
    }

    registerForPushNotifications().catch((error: unknown) => {
      console.warn('Push notification registration failed', error);
    });

    const receivedSubscription =
      Notifications.addNotificationReceivedListener(() => {
        // Foreground presentation is handled by setNotificationHandler above.
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        navigateFromNotification(response.notification);
      });

    const lastResponse = Notifications.getLastNotificationResponse();

    if (lastResponse?.notification) {
      navigateFromNotification(lastResponse.notification);
    }

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [isAuthenticated, isProfileComplete]);
}

export async function cleanupNotifications() {
  if (Platform.OS === 'web') {
    return;
  }

  await Promise.all([
    Notifications.dismissAllNotificationsAsync(),
    Notifications.setBadgeCountAsync(0),
  ]);
}
