export const TAB_BAR_CONTENT_HEIGHT = 82;

export function getTabBarLayout(bottomInset: number) {
  const safeBottomInset = Math.max(0, bottomInset);
  return {
    height: TAB_BAR_CONTENT_HEIGHT + safeBottomInset,
    paddingTop: 10,
    paddingBottom: 12 + safeBottomInset
  };
}
