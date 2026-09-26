export type NotificationSettingsLoadState = 'loading' | 'error' | 'ready';

export function notificationSettingsLoadState(loaded: boolean, loadError: boolean): NotificationSettingsLoadState {
  if (loadError) return 'error';
  return loaded ? 'ready' : 'loading';
}
