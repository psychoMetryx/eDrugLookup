export interface CatalogCsvRow {
  Kategori: string;
  Kandungan: string;
  Sediaan: string;
  'Obat BPJS': string;
  'Obat Umum': string;
}

export interface CatalogEntry {
  id: string;
  kategori: string;
  kandungan: string;
  sediaan: string;
  aliases: CatalogAlias[];
  bpjsNames: string[];
  umumNames: string[];
  allNames: string[];
  searchTokens: string[];
  normalizedKandungan: string;
}

export type CatalogAliasSource = 'BPJS' | 'Umum' | 'Kandungan';

export interface CatalogAlias {
  id: string;
  parentEntryId: string;
  name: string;
  source: CatalogAliasSource;
  normalizedName: string;
}

export interface CatalogSearchResult {
  entry: CatalogEntry;
  alias: CatalogAlias;
  score: number;
  matchedOn: 'brand-exact' | 'kandungan-exact' | 'brand-prefix' | 'kandungan-prefix' | 'brand-token' | 'kandungan-token';
}

export interface InventoryOption {
  id: string;
  value?: string;
  label?: string;
  komposisi?: string;
  penjamin?: string;
  satuan?: string;
  indikasi?: string;
  stok?: number;
  harga?: number;
  [key: string]: unknown;
}

export type ResolutionState = 'ready' | 'multiple' | 'no-match';
export type PayerKind = 'bpjs' | 'umum' | 'unknown';

export interface PayerInference {
  kind: PayerKind;
  source: 'patient-penjamin' | null;
  confidence: 'exact' | 'none';
  rawValue: string | null;
}

export interface ResolutionResult {
  state: ResolutionState;
  bestMatch: InventoryOption | null;
  rankedMatches: InventoryOption[];
}
