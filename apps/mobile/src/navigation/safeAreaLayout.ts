/** The app shell consumes the status bar and display cutout inset. */
export const appSafeAreaEdges = ['top'] as const;
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
