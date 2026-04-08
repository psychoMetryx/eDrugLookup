import { afterEach, describe, expect, it, vi } from 'vitest';

import { HELP_PAGE_PATH, OPEN_HELP_PAGE_EVENT } from '../src/content/helpPage';
import { buildHelpPageUrl, registerHelpPageLauncher } from '../src/content/helpLauncher';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('help page launcher', () => {
  it('builds the internal help page url from chrome runtime', () => {
    const runtimeGetUrl = vi.fn((path: string) => `chrome-extension://test/${path}`);
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: runtimeGetUrl
      }
    });

    expect(buildHelpPageUrl()).toBe('chrome-extension://test/help.html');
    expect(runtimeGetUrl).toHaveBeenCalledWith(HELP_PAGE_PATH);
  });

  it('opens the help page when the custom event is dispatched', () => {
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`)
      }
    });

    const openHelpPage = vi.fn();
    const unregister = registerHelpPageLauncher(openHelpPage);

    window.dispatchEvent(new CustomEvent(OPEN_HELP_PAGE_EVENT));

    expect(openHelpPage).toHaveBeenCalledWith('chrome-extension://test/help.html');
    unregister();
  });

  it('supports an explicit help path from the event payload', () => {
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`)
      }
    });

    const openHelpPage = vi.fn();
    const unregister = registerHelpPageLauncher(openHelpPage);

    window.dispatchEvent(new CustomEvent(OPEN_HELP_PAGE_EVENT, { detail: { path: 'alt-help.html' } }));

    expect(openHelpPage).toHaveBeenCalledWith('chrome-extension://test/alt-help.html');
    unregister();
  });
});
