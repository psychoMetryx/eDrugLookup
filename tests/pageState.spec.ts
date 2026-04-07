import { describe, expect, it } from 'vitest';

import { findModalLookupContext, getLookupAvailability } from '../src/content/pageState';

describe('lookup page state', () => {
  it('finds the non-racik inline lookup context when the field is present', () => {
    document.body.innerHTML = `
      <div role="tabpanel">
        <select>
          <option>Racik</option>
          <option selected>Non Racik</option>
        </select>
        <div class="multiselect">
          <input id="getObats" />
        </div>
      </div>
    `;

    const availability = getLookupAvailability(document);
    expect(availability.active).toBe(true);
    expect(availability.mode).toBe('inline-non-racik');
    expect(availability.reason).toBe('ready');
  });

  it('prioritizes the cari obat modal when it is open', () => {
    document.body.innerHTML = `
      <div role="tabpanel">
        <select>
          <option selected>Non Racik</option>
        </select>
        <div class="multiselect">
          <input id="getObats" />
        </div>
      </div>
      <div class="modal fade in" style="display:block;" role="dialog">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h4 class="modal-title">Cari Obat</h4>
            </div>
            <div class="modal-body">
              <select name="typeSearch">
                <option value="nama_obat">Nama Obat</option>
              </select>
              <input type="text" placeholder="Cari Obat" />
              <table><tbody></tbody></table>
            </div>
          </div>
        </div>
      </div>
    `;

    const availability = getLookupAvailability(document);
    expect(availability.active).toBe(true);
    expect(availability.mode).toBe('modal-cari-obat');
    expect(availability.context?.mode).toBe('modal-cari-obat');
    expect(findModalLookupContext(document)?.input.placeholder).toBe('Cari Obat');
  });

  it('reports wrong-status when racik is selected and no modal is open', () => {
    document.body.innerHTML = `
      <div role="tabpanel">
        <select>
          <option selected>Racik</option>
          <option>Non Racik</option>
        </select>
        <div class="multiselect">
          <input id="getObats" />
        </div>
      </div>
    `;

    const availability = getLookupAvailability(document);
    expect(availability.active).toBe(false);
    expect(availability.mode).toBe('inactive');
    expect(availability.reason).toBe('wrong-status');
  });
});
