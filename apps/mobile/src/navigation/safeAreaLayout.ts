/** The app shell consumes the status bar and display cutout inset. */
export const appSafeAreaEdges = ['top'] as const;
/** Use when bottom tabs are hidden and the app frame must own the bottom inset. */
export const appSafeAreaEdgesWithoutTabs = ['top', 'bottom'] as const;
export type BottomNavigationMode = 'visible-tabs' | 'hidden-tabs';
export function appEdgesForNavigation(mode: BottomNavigationMode = 'visible-tabs') {
  return mode === 'hidden-tabs' ? appSafeAreaEdgesWithoutTabs : appSafeAreaEdges;
}
/** Standalone screens have no app shell or tab bar to consume either inset. */
export const fallbackSafeAreaEdges = ['top', 'bottom'] as const;
/** Native modals are separate windows and must account for both system edges. */
export const modalSafeAreaEdges = ['top', 'bottom'] as const;

export const TAB_BAR_CONTENT_HEIGHT = 68;
export const TAB_BAR_MIN_BOTTOM_PADDING = 8;

export function getTabBarLayout(bottomInset: number) {
  const safeBottomInset = Math.max(0, bottomInset);
  return {
    height: TAB_BAR_CONTENT_HEIGHT + safeBottomInset,
    paddingTop: 4,
    paddingBottom: Math.max(TAB_BAR_MIN_BOTTOM_PADDING, safeBottomInset)
  };
}

export function getCenterActionFrame(tabBarHeight: number) {
  return { minHeight: 52, maxHeight: Math.max(52, tabBarHeight - 12) };
}
