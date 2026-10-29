type PlatformNavigator = Pick<Navigator, 'platform'> & {
  userAgentData?: { platform?: string };
};

export function shortcutModifier(
  browser: PlatformNavigator | undefined = typeof navigator === 'undefined' ? undefined : navigator
): '⌘' | 'Ctrl' {
  const platform = browser?.userAgentData?.platform || browser?.platform || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? '⌘' : 'Ctrl';
}
