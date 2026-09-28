export const TAB_BAR_CONTENT_HEIGHT = 68;

export function getTabBarLayout(bottomInset: number) {
  const safeBottomInset = Math.max(0, bottomInset);
  return {
    height: TAB_BAR_CONTENT_HEIGHT + safeBottomInset,
    paddingTop: 4,
    paddingBottom: 8 + safeBottomInset
  };
}
