import { normalizeText, tokenize } from './normalize';
import type { CatalogAlias, CatalogEntry, CatalogSearchResult } from './types';

export function searchCatalog(entries: CatalogEntry[], query: string, limit = 8): CatalogSearchResult[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  const queryTokens = tokenize(query);
  const results = entries
    .flatMap((entry) =>
      getSearchAliases(entry).map((alias) => rankCatalogEntry(entry, alias, normalizedQuery, queryTokens))
    )
    .filter((result): result is CatalogSearchResult => result !== null)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.alias.name.localeCompare(right.alias.name) ||
        left.entry.kandungan.localeCompare(right.entry.kandungan)
    );

  return results.slice(0, limit);
}

function rankCatalogEntry(
  entry: CatalogEntry,
  alias: CatalogAlias,
  normalizedQuery: string,
  queryTokens: string[]
): CatalogSearchResult | null {
  const brandNorm = alias.normalizedName;
  const kandunganNorm = entry.normalizedKandungan;

  if (brandNorm === normalizedQuery) {
    return { entry, alias, score: 1_000, matchedOn: 'brand-exact' };
  }

  if (kandunganNorm === normalizedQuery) {
    return { entry, alias, score: 940, matchedOn: 'kandungan-exact' };
  }

  if (brandNorm.startsWith(normalizedQuery)) {
    return { entry, alias, score: 800, matchedOn: 'brand-prefix' };
  }

  if (kandunganNorm.startsWith(normalizedQuery)) {
    return { entry, alias, score: 760, matchedOn: 'kandungan-prefix' };
  }

  const brandTokenScore = scoreTokenMatch([brandNorm], normalizedQuery, queryTokens);
  const kandunganTokenScore = scoreTokenMatch([kandunganNorm], normalizedQuery, queryTokens);

  if (brandTokenScore > 0) {
    return { entry, alias, score: 520 + brandTokenScore, matchedOn: 'brand-token' };
  }

  if (kandunganTokenScore > 0) {
    return { entry, alias, score: 420 + kandunganTokenScore, matchedOn: 'kandungan-token' };
  }

  return null;
}

function getSearchAliases(entry: CatalogEntry): CatalogAlias[] {
  if (entry.aliases.length > 0) {
    return entry.aliases;
  }

  return [
    {
      id: `${entry.id}:kandungan`,
      parentEntryId: entry.id,
      name: entry.kandungan || entry.sediaan || entry.kategori,
      source: 'Kandungan',
      normalizedName: normalizeText(entry.kandungan || entry.sediaan || entry.kategori)
    }
  ];
}

function scoreTokenMatch(candidates: string[], normalizedQuery: string, queryTokens: string[]): number {
  let bestScore = 0;

  for (const candidate of candidates) {
    if (candidate.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 100);
    }

    const candidateTokens = tokenize(candidate);
    const matchingTokens = queryTokens.filter((token) => candidateTokens.some((candidateToken) => candidateToken.startsWith(token)));
    if (matchingTokens.length > 0) {
      bestScore = Math.max(bestScore, matchingTokens.length * 40);
    }
  }

  return bestScore;
}
