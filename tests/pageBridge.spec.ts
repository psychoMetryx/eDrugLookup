import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { BRIDGE_REQUEST_EVENT, BRIDGE_RESPONSE_EVENT, type BridgeAction, type BridgeRequestMap } from '../src/content/bridgeProtocol';
import { injectPageBridge } from '../src/content/pageBridge';

beforeAll(() => {
  injectPageBridge();
});

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('page bridge', () => {
  it('searches and selects inline inventory through the vue multiselect bridge', async () => {
    document.body.innerHTML = `
      <div role="tabpanel">
        <select>
          <option selected>Non Racik</option>
        </select>
        <div class="multiselect">
          <input id="getObats" />
        </div>
      </div>
    `;

    const input = document.querySelector('#getObats') as HTMLInputElement;
    const root = input.closest('.multiselect') as HTMLElement & { __vue__?: any };
    const clickResepObat = vi.fn();
    const parentVm = {
      resep: { status_obat: '0' },
      arrResep: [] as Array<Record<string, unknown>>,
      getCariResepByMultiselect(term: string) {
        this.arrResep = [
          {
            id: '20138',
            value: 'FASGO 500 MG',
            label: '20138 - FASGO 500 MG (1052)',
            komposisi: `Paracetamol ${term}`
          }
        ];
      },
      clickResepObat
    };
    root.__vue__ = {
      $parent: parentVm,
      activate: vi.fn(),
      updateSearch: vi.fn(),
      search: ''
    };

    const searchResponse = await sendBridgeRequest('searchInventory', { term: 'paracetamol' });
    expect(searchResponse.options).toHaveLength(1);

    const selectResponse = await sendBridgeRequest('selectInventory', {
      option: searchResponse.options[0]
    });
    expect(clickResepObat).toHaveBeenCalledTimes(1);
    expect(selectResponse.selectedLabel).toContain('FASGO 500 MG');
    expect(input.value).toContain('FASGO 500 MG');
  });

  it('searches and selects inventory through the native cari obat modal bridge', async () => {
    document.body.innerHTML = `
      <div id="item-search-modal" class="modal fade in" style="display:block;" role="dialog">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h4 class="modal-title">Cari Obat</h4>
            </div>
            <div class="modal-body">
              <select name="typeSearch">
                <option value="nama_obat">Nama Obat</option>
                <option value="kandungan">Kandungan</option>
              </select>
              <input type="text" placeholder="Cari Obat" class="form-control" />
              <table><tbody></tbody></table>
            </div>
          </div>
        </div>
      </div>
    `;

    const modal = document.querySelector('#item-search-modal') as HTMLElement & { __vue__?: any };
    const input = modal.querySelector('input') as HTMLInputElement;
    const inputEvents = vi.fn();
    input.addEventListener('input', inputEvents);
    const selectItem = vi.fn(function (this: any, option: Record<string, unknown>) {
      this.selected = option;
    });
    modal.__vue__ = {
      items: [] as Array<Record<string, unknown>>,
      search: '',
      search_type: 'nama_obat',
      page: 1,
      searchProcessDone: 'done',
      getDatas() {
        this.items = [
          {
            id: '20275',
            value: 'PACDIN SY',
            label: '20275 - PACDIN SY (39)',
            komposisi: 'Paracetamol 120 mg',
            penjamin: 'UMUM'
          }
        ];
        this.searchProcessDone = 'done';
      },
      selectItem
    };

    const probe = await sendBridgeRequest('probeModal', undefined);
    expect(probe.supported).toBe(true);

    const searchResponse = await sendBridgeRequest('searchModalInventory', {
      term: 'paracetamol',
      searchType: 'nama_obat'
    });
    expect(searchResponse.options).toHaveLength(1);
    expect(input.value).toBe('paracetamol');
    expect(inputEvents).not.toHaveBeenCalled();

    input.value = 'pacd';
    await sendBridgeRequest('searchModalInventory', {
      term: 'PACDIN SYR',
      searchType: 'nama_obat',
      syncInput: false
    });
    expect(input.value).toBe('pacd');

    const selectResponse = await sendBridgeRequest('selectModalInventory', {
      option: searchResponse.options[0]
    });
    expect(selectItem).toHaveBeenCalledTimes(1);
    expect(selectResponse.selectedLabel).toContain('PACDIN SY');
  });
});

function sendBridgeRequest<TAction extends BridgeAction>(
  action: TAction,
  payload: BridgeRequestMap[TAction]
): Promise<any> {
  const id = `test-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      if (!detail || detail.id !== id) {
        return;
      }

      window.removeEventListener(BRIDGE_RESPONSE_EVENT, handler);
      if (!detail.ok) {
        reject(new Error(detail.error ?? 'Bridge request failed.'));
        return;
      }
      resolve(detail.payload);
    };

    window.addEventListener(BRIDGE_RESPONSE_EVENT, handler);
    window.dispatchEvent(
      new CustomEvent(BRIDGE_REQUEST_EVENT, {
        detail: {
          id,
          action,
          payload
        }
      })
    );
  });
}
