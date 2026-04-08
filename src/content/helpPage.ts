export const OPEN_HELP_PAGE_EVENT = 'edruglookup:open-help-page';
export const HELP_PAGE_PATH = 'help.html';

export function dispatchOpenHelpPageEvent(): void {
  window.dispatchEvent(new CustomEvent(OPEN_HELP_PAGE_EVENT, { detail: { path: HELP_PAGE_PATH } }));
}
