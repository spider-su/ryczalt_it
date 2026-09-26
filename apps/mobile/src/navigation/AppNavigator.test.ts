import { describe, expect, it } from 'vitest';
import { getTabBarLayout, TAB_BAR_CONTENT_HEIGHT } from './tabBarLayout';

describe('bottom tab safe-area layout', () => {
  it('keeps the content height and adds the bottom inset to the tab bar', () => {
    expect(getTabBarLayout(0)).toEqual({ height: TAB_BAR_CONTENT_HEIGHT, paddingTop: 10, paddingBottom: 12 });
    expect(getTabBarLayout(24)).toEqual({ height: TAB_BAR_CONTENT_HEIGHT + 24, paddingTop: 10, paddingBottom: 36 });
  });

  it('does not produce invalid layout for a negative inset', () => {
    expect(getTabBarLayout(-1)).toEqual({ height: TAB_BAR_CONTENT_HEIGHT, paddingTop: 10, paddingBottom: 12 });
  });
});
