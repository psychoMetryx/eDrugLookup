import type { PayerInference, PayerKind } from '../lib/catalog/types';

export function inferPatientPayer(doc: Document = document): PayerKind {
  return inferPatientPayerInfo(doc).kind;
}

export function inferPatientPayerInfo(doc: Document = document): PayerInference {
  const payerCellText = findPatientPayerCellText(doc);
  if (!payerCellText) {
    return {
      kind: 'unknown',
      source: null,
      confidence: 'none',
      rawValue: null
    };
  }

  return {
    kind: classifyPayer(payerCellText),
    source: 'patient-penjamin',
    confidence: 'exact',
    rawValue: payerCellText
  };
}

function findPatientPayerCellText(doc: Document): string | null {
  const rows = Array.from(doc.querySelectorAll<HTMLTableRowElement>('tr'));

  for (const row of rows) {
    if (!isVisible(row)) {
      continue;
    }

    const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>('th, td'));
    if (cells.length < 2) {
      continue;
    }

    const label = normalizeCellText(cells[0].textContent ?? '');
    if (label !== 'PENJAMIN') {
      continue;
    }

    const value = (cells[1].textContent ?? '').trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function classifyPayer(rawText: string): PayerKind {
  const text = rawText.toUpperCase();
  if (text.includes('BPJS')) {
    return 'bpjs';
  }

  if (/\bUMUM\b/.test(text)) {
    return 'umum';
  }

  return 'unknown';
}

function normalizeCellText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toUpperCase();
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}
