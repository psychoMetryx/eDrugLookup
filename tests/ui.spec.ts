import { afterEach, describe, expect, it, vi } from 'vitest';

import { LookupPanel, computeModalPlacement, getPillTone } from '../src/content/ui';

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({})
  } as DOMRect;
}

afterEach(() => {
  document.querySelectorAll('[data-edrug-lookup="host"]').forEach((node) => node.remove());
  document.body.innerHTML = '';
});

describe('modal panel placement', () => {
  it('centers the panel under the modal dialog when there is space below', () => {
    const placement = computeModalPlacement(rect(140, 110, 1090, 220), 1366, 768);

    expect(placement.left).toBeGreaterThan(420);
    expect(placement.left).toBeLessThan(620);
    expect(placement.top).toBeGreaterThan(320);
    expect(placement.width).toBeLessThanOrEqual(380);
  });

  it('clamps the panel inside the viewport instead of hugging the right edge', () => {
    const placement = computeModalPlacement(rect(70, 90, 980, 230), 1024, 768);

    expect(placement.left).toBeGreaterThanOrEqual(16);
    expect(placement.left + placement.width).toBeLessThanOrEqual(1024 - 16);
  });

  it('falls back inside the dialog bounds when there is not enough space below', () => {
    const placement = computeModalPlacement(rect(120, 360, 960, 280), 1280, 720);

    expect(placement.top).toBeLessThan(640);
    expect(placement.top).toBeGreaterThanOrEqual(16);
  });
});

describe('payer pill tones', () => {
  it('maps BPJS to red styling tone', () => {
    expect(getPillTone('BPJS')).toBe('bpjs');
  });

  it('maps Umum to blue styling tone', () => {
    expect(getPillTone('Umum')).toBe('umum');
  });
});

describe('suggestion badges', () => {
  it('shows the primary alias source badge even when there are no sibling aliases', () => {
    const panel = new LookupPanel({
      onSuggestionSelected: vi.fn(),
      onDisambiguationSelected: vi.fn(),
      onFallbackSearch: vi.fn()
    });

    panel.render({
      open: true,
      anchorRect: rect(140, 110, 1090, 220),
      query: 'cop',
      suggestions: [
        {
          id: 'alias-1',
          status: 'unresolved',
          result: {
            score: 800,
            matchedOn: 'brand-prefix',
            alias: {
              id: 'alias-1',
              parentEntryId: 'entry-1',
              name: 'COPARCETIN SYR',
              source: 'Umum',
              normalizedName: 'COPARCETIN SYR'
            },
            entry: {
              id: 'entry-1',
              kategori: 'ANTIMUKOLITIK KOMBINASI',
              kandungan: 'Paracetamol 500 mg',
              sediaan: 'sirup',
              aliases: [
                {
                  id: 'alias-1',
                  parentEntryId: 'entry-1',
                  name: 'COPARCETIN SYR',
                  source: 'Umum',
                  normalizedName: 'COPARCETIN SYR'
                }
              ],
              bpjsNames: [],
              umumNames: ['COPARCETIN SYR'],
              allNames: ['COPARCETIN SYR'],
              searchTokens: ['COPARCETIN SYR'],
              normalizedKandungan: 'PARACETAMOL 500 MG'
            }
          }
        }
      ],
      highlightedIndex: 0,
      message: null,
      disambiguation: null,
      layout: 'modal',
      payer: 'umum',
      showPayerBadge: true,
      nativeMode: false
    });

    const host = document.querySelector('[data-edrug-lookup="host"]') as HTMLElement & { shadowRoot: ShadowRoot };
    const pills = Array.from(host.shadowRoot.querySelectorAll('.pill')).map((pill) => pill.textContent?.trim());

    expect(pills).toContain('Umum');
    panel.destroy();
  });
});
