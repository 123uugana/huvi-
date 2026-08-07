export interface RegisterPushTokenInput {
  token: string;
  platform: 'android' | 'ios' | 'web';
}

export interface PushTokenRegistration {
  token: string;
}

export type NotificationData = {
  livestockId?: unknown;
  url?: unknown;
};
