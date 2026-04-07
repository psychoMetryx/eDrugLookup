export type LookupMode = 'inline-non-racik' | 'modal-cari-obat' | 'inactive';

export interface InlineLookupContext {
  mode: 'inline-non-racik';
  input: HTMLInputElement;
  root: HTMLElement;
  tabPanel: HTMLElement | null;
  statusSelect: HTMLSelectElement | null;
}

export interface ModalLookupContext {
  mode: 'modal-cari-obat';
  input: HTMLInputElement;
  root: HTMLElement;
  modal: HTMLElement;
  dialog: HTMLElement | null;
  searchTypeSelect: HTMLSelectElement | null;
  resultsTable: HTMLTableElement | null;
}

export type LookupContext = InlineLookupContext | ModalLookupContext;

export interface LookupAvailability {
  active: boolean;
  mode: LookupMode;
  context: LookupContext | null;
  reason:
    | 'ready'
    | 'missing-field'
    | 'missing-root'
    | 'wrong-status'
    | 'missing-modal'
    | 'missing-modal-input';
}

export function getLookupAvailability(doc: Document = document): LookupAvailability {
  const modalContext = findModalLookupContext(doc);
  if (modalContext) {
    return {
      active: true,
      mode: modalContext.mode,
      context: modalContext,
      reason: 'ready'
    };
  }

  const inlineContext = findInlineLookupContext(doc);
  if (inlineContext) {
    return {
      active: true,
      mode: inlineContext.mode,
      context: inlineContext,
      reason: 'ready'
    };
  }

  const modalRoot = findCariObatModal(doc);
  if (modalRoot) {
    return {
      active: false,
      mode: 'inactive',
      context: null,
      reason: 'missing-modal-input'
    };
  }

  const input = doc.querySelector<HTMLInputElement>('#getObats');
  if (!input) {
    return {
      active: false,
      mode: 'inactive',
      context: null,
      reason: 'missing-field'
    };
  }

  const root = input.closest<HTMLElement>('.multiselect');
  if (!root) {
    return {
      active: false,
      mode: 'inactive',
      context: null,
      reason: 'missing-root'
    };
  }

  return {
    active: false,
    mode: 'inactive',
    context: null,
    reason: 'wrong-status'
  };
}

export function isLookupKeyboardTarget(target: EventTarget | null, context: LookupContext | null): boolean {
  return target instanceof Node && !!context && context.root.contains(target);
}

export function findInlineLookupContext(doc: Document = document): InlineLookupContext | null {
  const input = doc.querySelector<HTMLInputElement>('#getObats');
  if (!input) {
    return null;
  }

  const root = input.closest<HTMLElement>('.multiselect');
  if (!root) {
    return null;
  }

  const tabPanel = root.closest<HTMLElement>('[role="tabpanel"]');
  const statusSelect = findStatusSelect(root);
  const selectedStatus = statusSelect?.selectedOptions?.[0]?.textContent?.trim() ?? '';
  if (selectedStatus && selectedStatus.toUpperCase() !== 'NON RACIK') {
    return null;
  }

  return {
    mode: 'inline-non-racik',
    input,
    root,
    tabPanel,
    statusSelect
  };
}

export function findModalLookupContext(doc: Document = document): ModalLookupContext | null {
  const modal = findCariObatModal(doc);
  if (!modal) {
    return null;
  }

  const input =
    modal.querySelector<HTMLInputElement>('input[placeholder*="Cari Obat" i]') ??
    modal.querySelector<HTMLInputElement>('.modal-body input[type="text"]');
  if (!input) {
    return null;
  }

  return {
    mode: 'modal-cari-obat',
    input,
    root: modal,
    modal,
    dialog: modal.querySelector<HTMLElement>('.modal-dialog, .modal-content'),
    searchTypeSelect: modal.querySelector<HTMLSelectElement>('select[name="typeSearch"], select'),
    resultsTable: modal.querySelector<HTMLTableElement>('table')
  };
}

function findCariObatModal(doc: Document): HTMLElement | null {
  const modalCandidates = Array.from(doc.querySelectorAll<HTMLElement>('[role="dialog"], .modal'));
  return (
    modalCandidates.find((element) => {
      if (!isElementVisible(element)) {
        return false;
      }

      const title = element.querySelector<HTMLElement>('.modal-title, h4, h3, [role="heading"]');
      if (title?.textContent?.trim() === 'Cari Obat') {
        return true;
      }

      const text = element.textContent?.trim() ?? '';
      return text.includes('Cari Obat') && !!element.querySelector('table') && !!element.querySelector('select');
    }) ?? null
  );
}

function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  return element.getClientRects().length > 0 || style.position === 'fixed' || style.display === 'block' || /\bin\b/.test(element.className);
}

function findStatusSelect(root: HTMLElement): HTMLSelectElement | null {
  const panel = root.closest<HTMLElement>('[role="tabpanel"]') ?? root.parentElement;
  if (!panel) {
    return null;
  }

  return (
    Array.from(panel.querySelectorAll('select')).find((select) =>
      Array.from(select.options).some((option) => option.textContent?.trim().toUpperCase() === 'NON RACIK')
    ) ?? null
  );
}
