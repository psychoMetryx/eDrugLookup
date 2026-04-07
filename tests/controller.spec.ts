import { afterEach, describe, expect, it, vi } from 'vitest';

import { DrugLookupController } from '../src/content/controller';

describe('drug lookup controller', () => {
  afterEach(() => {
    document.querySelectorAll('[data-edrug-lookup="host"]').forEach((node) => node.remove());
    document.body.innerHTML = '';
  });

  it('does not run live modal search while the user types in the modal', async () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td>Penjamin</td>
          <td>BPJS Kesehatan</td>
        </tr>
      </table>
      <div id="item-search-modal" class="modal fade in" style="display:block;" role="dialog">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h4 class="modal-title">Cari Obat</h4>
            </div>
            <div class="modal-body">
              <select name="typeSearch">
                <option value="nama_obat">Nama Obat</option>
              </select>
              <input type="text" placeholder="Cari Obat" class="form-control" />
              <table><tbody></tbody></table>
            </div>
          </div>
        </div>
      </div>
    `;

    const request = vi.fn(async () => ({ options: [] }));
    const controller = new DrugLookupController({
      bridge: {
        request: request as never,
        dispose: vi.fn()
      },
      injectPageBridge: vi.fn()
    });

    controller.start();
    const input = document.querySelector('#item-search-modal input') as HTMLInputElement;
    input.value = 'paracetamol';
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    expect(request).not.toHaveBeenCalled();
    controller.stop();
  });

  it('still performs background resolution for the inline non-racik field', async () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td>Penjamin</td>
          <td>UMUM</td>
        </tr>
      </table>
      <div role="tabpanel">
        <select>
          <option selected>Non Racik</option>
        </select>
        <div class="multiselect">
          <input id="getObats" />
        </div>
      </div>
    `;

    const request = vi.fn(async (action: string) => {
      if (action === 'searchInventory') {
        return {
          options: [{ id: '20138', label: '20138 - FASGO 500 MG (1052)', value: 'FASGO 500 MG', komposisi: 'Paracetamol 500 mg' }]
        };
      }
      return { options: [] };
    });
    const controller = new DrugLookupController({
      bridge: {
        request: request as never,
        dispose: vi.fn()
      },
      injectPageBridge: vi.fn()
    });

    controller.start();
    const input = document.querySelector('#getObats') as HTMLInputElement;
    input.value = 'paracetamol';
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(request).toHaveBeenCalledWith('searchInventory', expect.objectContaining({ term: expect.any(String) }));
    controller.stop();
  });

  it('keeps native modal keyboard behavior for arrow keys and enter', async () => {
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
              </select>
              <input type="text" placeholder="Cari Obat" class="form-control" />
              <table><tbody></tbody></table>
            </div>
          </div>
        </div>
      </div>
    `;

    const controller = new DrugLookupController({
      bridge: {
        request: vi.fn(async () => ({ options: [] })) as never,
        dispose: vi.fn()
      },
      injectPageBridge: vi.fn()
    });

    controller.start();
    const input = document.querySelector('#item-search-modal input') as HTMLInputElement;
    input.value = 'paracetamol';
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const arrowDown = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    input.dispatchEvent(arrowDown);
    expect(arrowDown.defaultPrevented).toBe(false);

    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
    controller.stop();
  });

  it('shows umum priority from the patient row and resolves a clicked modal alias without concatenating sibling aliases', async () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td>Penjamin</td>
          <td>Umum /</td>
        </tr>
      </table>
      <div id="item-search-modal" class="modal fade in" style="display:block;" role="dialog">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h4 class="modal-title">Cari Obat</h4>
            </div>
            <div class="modal-body">
              <select name="typeSearch">
                <option value="nama_obat">Nama Obat</option>
              </select>
              <input type="text" placeholder="Cari Obat" class="form-control" />
              <table>
                <thead>
                  <tr><th>Penjamin Obat</th></tr>
                </thead>
                <tbody>
                  <tr><td>BPJS</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    const request = vi.fn(async (action: string, payload: Record<string, unknown>) => {
      if (action === 'searchModalInventory') {
        return { options: [] };
      }
      return { ok: true, options: [] };
    });
    const controller = new DrugLookupController({
      bridge: {
        request: request as never,
        dispose: vi.fn()
      },
      injectPageBridge: vi.fn()
    });

    controller.start();
    const input = document.querySelector('#item-search-modal input') as HTMLInputElement;
    input.value = 'pacd';
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    const host = document.querySelector('[data-edrug-lookup="host"]') as HTMLElement & { shadowRoot: ShadowRoot };
    const badge = host.shadowRoot.querySelector('.header-badge');
    expect(badge?.textContent).toBe('Umum priority');

    const firstItem = host.shadowRoot.querySelector('.item') as HTMLButtonElement;
    firstItem.click();
    await Promise.resolve();
    await Promise.resolve();

    const searchTerms = request.mock.calls
      .filter(([actionName]) => actionName === 'searchModalInventory')
      .map(([, payload]) => (payload as { term: string }).term);

    expect(searchTerms[0]).toBe('pacd');
    expect(searchTerms).not.toContain('PACDIN SYR,LIBEBI SYR');
    controller.stop();
  });
});
