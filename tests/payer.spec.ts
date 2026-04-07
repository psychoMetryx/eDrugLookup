import { describe, expect, it } from 'vitest';

import { inferPatientPayer, inferPatientPayerInfo } from '../src/content/payer';

describe('payer inference', () => {
  it('detects bpjs from the patient penjamin row', () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td>Penjamin</td>
          <td>BPJS Kesehatan / 0002902208657</td>
        </tr>
      </table>
    `;

    expect(inferPatientPayer(document)).toBe('bpjs');
  });

  it('detects umum from the patient penjamin row', () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td>Penjamin</td>
          <td>UMUM</td>
        </tr>
      </table>
    `;

    expect(inferPatientPayer(document)).toBe('umum');
  });

  it('ignores modal penjamin columns and bpjs result rows outside the patient card', () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td>Penjamin</td>
          <td>Umum /</td>
        </tr>
      </table>
      <div class="modal" style="display:block;">
        <h4 class="modal-title">Cari Obat</h4>
        <table>
          <tr>
            <th>Penjamin Obat</th>
            <th>Nama Obat</th>
          </tr>
          <tr>
            <td>BPJS</td>
            <td>PACDIN SYR</td>
          </tr>
        </table>
      </div>
    `;

    expect(inferPatientPayer(document)).toBe('umum');
    expect(inferPatientPayerInfo(document)).toMatchObject({
      kind: 'umum',
      confidence: 'exact',
      source: 'patient-penjamin'
    });
  });

  it('returns unknown without a payer signal', () => {
    document.body.innerHTML = `
      <div>Poli Umum</div>
      <div>Nama Pasien</div>
    `;

    expect(inferPatientPayer(document)).toBe('unknown');
  });
});
