import { useEffect } from 'react';
import { Platform } from 'react-native';

const links = [
  { rel: 'manifest', href: '/manifest.webmanifest' },
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'icon', href: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
  { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
  { rel: 'icon', href: '/favicon-48.png', type: 'image/png', sizes: '48x48' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' }
];

export function WebAppMetadata() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    for (const definition of links) {
      const element = document.createElement('link');
      Object.assign(element, definition);
      element.dataset.investoryBrand = 'true';
      document.head.appendChild(element);
    }
    let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      document.head.appendChild(themeColor);
    }
    themeColor.content = '#1769E0';
    return () => document.head.querySelectorAll('[data-investory-brand="true"]').forEach((element) => element.remove());
  }, []);
  return null;
}
