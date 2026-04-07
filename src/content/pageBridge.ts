import { BRIDGE_REQUEST_EVENT } from './bridgeProtocol';

declare global {
  interface Window {
    __eDrugLookupBridgeReady__?: boolean;
  }
}

type InlineBridgeContext = {
  input: HTMLInputElement;
  root: Element & { __vue__?: any };
  multiselect: any;
  parent: any;
};

type ModalBridgeContext = {
  modal: Element & { __vue__?: any };
  vm: any;
  input: HTMLInputElement | null;
  searchTypeSelect: HTMLSelectElement | null;
};

export function injectPageBridge(): void {
  if (window.__eDrugLookupBridgeReady__) {
    return;
  }
  pageBridgeMain();
}

function pageBridgeMain() {
  const REQUEST_EVENT = 'edruglookup:bridge-request';
  const RESPONSE_EVENT = 'edruglookup:bridge-response';

  if (window.__eDrugLookupBridgeReady__) {
    return;
  }

  window.__eDrugLookupBridgeReady__ = true;

  window.addEventListener(REQUEST_EVENT, async (event: Event) => {
    const customEvent = event as CustomEvent;
    const detail = customEvent.detail as { id?: string; action?: string; payload?: unknown } | undefined;
    if (!detail || typeof detail.id !== 'string' || typeof detail.action !== 'string') {
      return;
    }

    try {
      const payload = await handleAction(detail.action, detail.payload);
      emitResponse({
        id: detail.id,
        action: detail.action,
        ok: true,
        payload
      });
    } catch (error) {
      emitResponse({
        id: detail.id,
        action: detail.action,
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown bridge error'
      });
    }
  });

  function emitResponse(payload: { id: string; action: string; ok: boolean; payload?: unknown; error?: string }) {
    window.dispatchEvent(new CustomEvent(RESPONSE_EVENT, { detail: payload }));
  }

  async function handleAction(action: string, payload: any) {
    switch (action) {
      case 'probe':
        return probe();
      case 'probeModal':
        return probeModal();
      case 'searchInventory':
        return searchInventory(payload?.term ?? '');
      case 'selectInventory':
        return selectInventory(payload?.option);
      case 'primeSearch':
        return primeSearch(payload?.term ?? '');
      case 'searchModalInventory':
        return searchModalInventory(payload?.term ?? '', payload?.searchType ?? 'nama_obat', payload?.syncInput !== false);
      case 'selectModalInventory':
        return selectModalInventory(payload?.option);
      case 'primeModalSearch':
        return primeModalSearch(payload?.term ?? '', payload?.searchType ?? 'nama_obat', payload?.syncInput !== false);
      default:
        throw new Error(`Unsupported bridge action: ${action}`);
    }
  }

  function getInlineBridgeContext(): InlineBridgeContext | null {
    const input = document.querySelector('#getObats');
    if (!(input instanceof HTMLInputElement)) {
      return null;
    }

    const root = input.closest('.multiselect') as (Element & { __vue__?: any }) | null;
    const multiselect = root && root.__vue__;
    const parent = multiselect && multiselect.$parent;
    if (!root) {
      return null;
    }

    return {
      input,
      root,
      multiselect,
      parent
    };
  }

  function getModalBridgeContext(): ModalBridgeContext | null {
    const modal = Array.from(document.querySelectorAll<Element & { __vue__?: any }>('[role="dialog"], .modal')).find((element) => {
      const title = element.querySelector('.modal-title, h4, h3, [role="heading"]');
      const style = window.getComputedStyle(element as HTMLElement);
      const visible = style.display !== 'none' && style.visibility !== 'hidden';
      return visible && title?.textContent?.trim() === 'Cari Obat';
    });
    if (!modal?.__vue__) {
      return null;
    }

    return {
      modal,
      vm: modal.__vue__,
      input: modal.querySelector<HTMLInputElement>('input[placeholder*="Cari Obat" i], .modal-body input[type="text"]'),
      searchTypeSelect: modal.querySelector<HTMLSelectElement>('select[name="typeSearch"], select')
    };
  }

  function probe() {
    const modalContext = getModalBridgeContext();
    if (modalContext?.vm) {
      return {
        supported: true,
        status: 'modal-open' as const,
        hasVueBridge: true,
        activeMode: 'modal-cari-obat' as const
      };
    }

    const context = getInlineBridgeContext();
    if (!context) {
      return {
        supported: false,
        status: 'missing-field' as const,
        hasVueBridge: false,
        activeMode: 'inactive' as const
      };
    }

    if (!context.multiselect || !context.parent) {
      return {
        supported: false,
        status: 'missing-vue' as const,
        hasVueBridge: false,
        activeMode: 'inactive' as const
      };
    }

    const status = context.parent.resep?.status_obat;
    const isNonRacik = status === '0' || status === 0;
    return {
      supported: isNonRacik,
      status: isNonRacik ? ('non-racik' as const) : ('inactive' as const),
      hasVueBridge: true,
      activeMode: isNonRacik ? ('inline-non-racik' as const) : ('inactive' as const)
    };
  }

  function probeModal() {
    const context = getModalBridgeContext();
    if (!context) {
      return {
        supported: false,
        status: 'missing-modal' as const,
        hasVueBridge: false
      };
    }

    return {
      supported: !!context.vm,
      status: context.vm ? ('modal-open' as const) : ('missing-vue' as const),
      hasVueBridge: !!context.vm
    };
  }

  async function searchInventory(term: string) {
    const context = getInlineBridgeContext();
    if (!context?.parent) {
      throw new Error('Vue prescription bridge is unavailable.');
    }

    if (!term.trim()) {
      return { options: [] };
    }

    context.parent.arrResep = [];
    context.parent.getCariResepByMultiselect(term);
    await waitForInventoryResults(context.parent);
    return {
      options: Array.isArray(context.parent.arrResep) ? context.parent.arrResep : []
    };
  }

  async function selectInventory(option: any) {
    const context = getInlineBridgeContext();
    if (!context?.parent || !option) {
      throw new Error('Unable to select inventory option.');
    }

    context.parent.clickResepObat(option);
    const selectedLabel = option.label ?? option.value ?? '';
    if (context.multiselect) {
      context.multiselect.search = selectedLabel;
    }
    setTextInputValue(context.input, selectedLabel, true);
    return {
      selectedLabel: selectedLabel || null
    };
  }

  async function primeSearch(term: string) {
    const context = getInlineBridgeContext();
    if (!context?.multiselect) {
      throw new Error('Unable to prime native search.');
    }

    context.multiselect.activate();
    context.multiselect.updateSearch(term);
    setTextInputValue(context.input, term, true);
    await sleep(50);

    return { ok: true };
  }

  async function searchModalInventory(term: string, searchType: string, syncInput: boolean) {
    const context = getModalBridgeContext();
    if (!context?.vm) {
      throw new Error('Modal drug search bridge is unavailable.');
    }

    if (!term.trim()) {
      return { options: [] };
    }

    const options = await runModalSearchWithFallback(context, term, searchType, syncInput);
    return { options };
  }

  async function selectModalInventory(option: any) {
    const context = getModalBridgeContext();
    if (!context?.vm || !option) {
      throw new Error('Unable to select modal inventory option.');
    }

    context.vm.selectItem(option);
    const selectedLabel = option.label ?? option.value ?? option.id ?? '';
    if (context.input) {
      setTextInputValue(context.input, option.value ?? selectedLabel, false);
    }
    return {
      selectedLabel: selectedLabel || null
    };
  }

  async function primeModalSearch(term: string, searchType: string, syncInput: boolean) {
    const context = getModalBridgeContext();
    if (!context?.vm) {
      throw new Error('Unable to prime modal search.');
    }

    await runModalSearchWithFallback(context, term, searchType, syncInput);
    return { ok: true };
  }

  async function runModalSearchWithFallback(
    context: ModalBridgeContext,
    term: string,
    searchType: string,
    syncInput: boolean
  ) {
    await runModalSearch(context, term, searchType, syncInput);
    let options = Array.isArray(context.vm.items) ? context.vm.items : [];
    if (options.length === 0 && searchType !== 'nama_obat') {
      await runModalSearch(context, term, 'nama_obat', syncInput);
      options = Array.isArray(context.vm.items) ? context.vm.items : [];
    }
    return options;
  }

  async function runModalSearch(context: ModalBridgeContext, term: string, searchType: string, syncInput: boolean) {
    const preservedInputValue = !syncInput && context.input ? context.input.value : null;
    if (context.searchTypeSelect) {
      context.searchTypeSelect.value = searchType;
      context.searchTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    context.vm.page = 1;
    context.vm.search_type = searchType;
    context.vm.search = term;
    context.vm.searchProcessDone = 'loading';
    if (syncInput && context.input) {
      setTextInputValue(context.input, term, false);
    }
    context.vm.getDatas();
    if (!syncInput && context.input && preservedInputValue !== null) {
      restoreModalInputValue(context.input, preservedInputValue);
    }
    await waitForModalResults(context.vm);
    if (!syncInput && context.input && preservedInputValue !== null) {
      restoreModalInputValue(context.input, preservedInputValue);
    }
  }

  async function waitForInventoryResults(parent: any) {
    const start = Date.now();
    while (Date.now() - start < 2_500) {
      if (Array.isArray(parent.arrResep) && parent.arrResep.length > 0) {
        return;
      }
      await sleep(100);
    }
  }

  async function waitForModalResults(vm: any) {
    const start = Date.now();
    while (Date.now() - start < 3_500) {
      const done = vm.searchProcessDone === 'done' || vm.searchProcessDone === true;
      if (done) {
        return;
      }
      await sleep(100);
    }
  }

  function setTextInputValue(input: HTMLInputElement, value: string, shouldDispatch: boolean) {
    input.value = value;
    if (shouldDispatch) {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function restoreModalInputValue(input: HTMLInputElement, value: string) {
    setTextInputValue(input, value, false);
    window.requestAnimationFrame(() => setTextInputValue(input, value, false));
    window.setTimeout(() => setTextInputValue(input, value, false), 50);
  }

  function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}

export const pageBridgeRequestEvent = BRIDGE_REQUEST_EVENT;
