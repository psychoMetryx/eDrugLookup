import type { CatalogAlias, CatalogEntry, CatalogCsvRow } from './types';

export function parseCsv(raw: string): CatalogCsvRow[] {
  const rows = parseCsvRows(raw.replace(/^\uFEFF/, ''));
  if (rows.length < 2) {
    return [];
  }

  const [header, ...body] = rows;
  return body
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => ({
      Kategori: row[header.indexOf('Kategori')] ?? '',
      Kandungan: row[header.indexOf('Kandungan')] ?? '',
      Sediaan: row[header.indexOf('Sediaan')] ?? '',
      'Obat BPJS': row[header.indexOf('Obat BPJS')] ?? '',
      'Obat Umum': row[header.indexOf('Obat Umum')] ?? ''
    }));
}

export function createCatalogEntries(rows: CatalogCsvRow[]): CatalogEntry[] {
  return rows.map((row, index) => {
    const entryId = `catalog-${index + 1}`;
    const bpjsNames = splitDrugNames(row['Obat BPJS']);
    const umumNames = splitDrugNames(row['Obat Umum']);
    const aliases = createAliases(entryId, bpjsNames, umumNames);
    const allNames = dedupeNames([...bpjsNames, ...umumNames]);
    const searchTokens = dedupeNames([
      row.Kandungan,
      ...allNames,
      ...tokenize(row.Kandungan),
      ...allNames.flatMap((name) => tokenize(name))
    ]);

    return {
      id: entryId,
      kategori: cleanCell(row.Kategori),
      kandungan: cleanCell(row.Kandungan),
      sediaan: cleanCell(row.Sediaan),
      aliases,
      bpjsNames,
      umumNames,
      allNames,
      searchTokens,
      normalizedKandungan: normalizeText(row.Kandungan)
    };
  });
}

export function splitDrugNames(value: string): string[] {
  return dedupeNames(
    value
      .split(';')
      .map((part) => cleanCell(part))
      .filter((part) => part.length > 0 && part !== '-')
      .flatMap((part) => splitCommaSeparatedAliases(part))
  );
}

export function cleanCell(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeText(value: string): string {
  return cleanCell(value)
    .replace(/\*/g, '')
    .replace(/[()]/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[\s/+-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function dedupeNames(values: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const cleaned = cleanCell(value);
    if (!cleaned) {
      continue;
    }
    const key = normalizeText(cleaned);
    if (!key || key === '-') {
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      results.push(cleaned);
    }
  }

  return results;
}

function createAliases(entryId: string, bpjsNames: string[], umumNames: string[]): CatalogAlias[] {
  const aliases: CatalogAlias[] = [];
  const seen = new Set<string>();

  const appendAliases = (names: string[], source: CatalogAlias['source']) => {
    for (const name of names) {
      const normalizedName = normalizeText(name);
      if (!normalizedName || seen.has(normalizedName)) {
        continue;
      }

      seen.add(normalizedName);
      aliases.push({
        id: `${entryId}:${aliases.length + 1}`,
        parentEntryId: entryId,
        name,
        source,
        normalizedName
      });
    }
  };

  appendAliases(bpjsNames, 'BPJS');
  appendAliases(umumNames, 'Umum');
  return aliases;
}

function splitCommaSeparatedAliases(value: string): string[] {
  const parts = value
    .split(',')
    .map((part) => cleanCell(part))
    .filter((part) => part.length > 0);

  if (parts.length <= 1) {
    return [value];
  }

  if (parts.every((part) => looksLikeStandaloneAlias(part))) {
    return parts;
  }

  return [value];
}

function looksLikeStandaloneAlias(value: string): boolean {
  const normalized = normalizeText(value);
  if (!normalized) {
    return false;
  }

  if (!/[A-Z]/.test(normalized)) {
    return false;
  }

  const tokens = tokenize(value);
  if (!tokens.length) {
    return false;
  }

  return tokens.some((token) => !/^[A-Z]?\d+(?:[.,]\d+)?(?:MG|ML|GR|G|MCG|%)?$/.test(token));
}

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    const nextCharacter = raw[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}
