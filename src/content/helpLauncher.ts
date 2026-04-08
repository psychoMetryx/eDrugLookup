import { HELP_PAGE_PATH, OPEN_HELP_PAGE_EVENT } from './helpPage';

export type HelpPageOpener = (url: string) => void;

export function buildHelpPageUrl(path = HELP_PAGE_PATH): string {
  return chrome.runtime.getURL(path);
}

export function defaultOpenHelpPage(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function registerHelpPageLauncher(openHelpPage: HelpPageOpener = defaultOpenHelpPage): () => void {
  const handleOpenHelpPage = (event: Event) => {
    const customEvent = event as CustomEvent<{ path?: string }>;
    const path = customEvent.detail?.path ?? HELP_PAGE_PATH;
    openHelpPage(buildHelpPageUrl(path));
  };

  window.addEventListener(OPEN_HELP_PAGE_EVENT, handleOpenHelpPage as EventListener);

  return () => {
    window.removeEventListener(OPEN_HELP_PAGE_EVENT, handleOpenHelpPage as EventListener);
  };
}
