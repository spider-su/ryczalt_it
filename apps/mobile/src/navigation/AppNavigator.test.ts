import { describe, expect, it } from 'vitest';
import { getCenterActionFrame, getTabBarLayout, TAB_BAR_CONTENT_HEIGHT } from './tabBarLayout';

describe('bottom tab safe-area layout', () => {
  it('keeps the content height and adds the bottom inset to the tab bar', () => {
    expect(getTabBarLayout(0)).toEqual({ height: TAB_BAR_CONTENT_HEIGHT, paddingTop: 4, paddingBottom: 8 });
    expect(getTabBarLayout(24)).toEqual({ height: TAB_BAR_CONTENT_HEIGHT + 24, paddingTop: 4, paddingBottom: 24 });
    expect(getTabBarLayout(34)).toEqual({ height: TAB_BAR_CONTENT_HEIGHT + 34, paddingTop: 4, paddingBottom: 34 });
  });

  it('does not produce invalid layout for a negative inset', () => {
    expect(getTabBarLayout(-1)).toEqual({ height: TAB_BAR_CONTENT_HEIGHT, paddingTop: 4, paddingBottom: 8 });
  });

  it('keeps the center action inside the usable tab frame', () => {
    expect(getCenterActionFrame(getTabBarLayout(0).height)).toEqual({ minHeight: 52, maxHeight: 56 });
    expect(getCenterActionFrame(getTabBarLayout(34).height)).toEqual({ minHeight: 52, maxHeight: 90 });
  });
});
