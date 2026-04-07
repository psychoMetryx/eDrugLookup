import { normalizeText, tokenize } from './normalize';
import type { CatalogAlias, CatalogEntry, InventoryOption, PayerKind, ResolutionResult } from './types';

const NON_DISTINCTIVE_TOKENS = new Set(['MG', 'ML', 'MCG', 'TAB', 'SYR', 'DROP', 'AMPUL', 'VIAL']);

export function buildCandidateTerms(
  entry: CatalogEntry,
  payer: PayerKind = 'unknown',
  preferredAlias: CatalogAlias | null = null
): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];
  const prioritizedAliases = getPrioritizedAliases(entry, payer, preferredAlias);

  for (const term of [...prioritizedAliases.map((alias) => alias.name), entry.kandungan, ...tokenize(entry.kandungan)]) {
    const normalized = normalizeText(term);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    candidates.push(term);
  }

  return candidates;
}

export function resolveInventoryMatch(
  entry: CatalogEntry,
  options: InventoryOption[],
  payer: PayerKind = 'unknown',
  preferredAlias: CatalogAlias | null = null
): ResolutionResult {
  if (!options.length) {
    return {
      state: 'no-match',
      bestMatch: null,
      rankedMatches: []
    };
  }

  const rankedMatches = [...options].sort(
    (left, right) =>
      scoreInventoryOption(entry, right, payer, preferredAlias) - scoreInventoryOption(entry, left, payer, preferredAlias)
  );
  const bestScore = scoreInventoryOption(entry, rankedMatches[0], payer, preferredAlias);
  const secondScore = rankedMatches[1] ? scoreInventoryOption(entry, rankedMatches[1], payer, preferredAlias) : -1;

  if (bestScore <= 0) {
    return {
      state: 'no-match',
      bestMatch: null,
      rankedMatches: []
    };
  }

  if (rankedMatches.length === 1 || bestScore - secondScore >= 120) {
    return {
      state: 'ready',
      bestMatch: rankedMatches[0],
      rankedMatches
    };
  }

  return {
    state: 'multiple',
    bestMatch: null,
    rankedMatches: rankedMatches.filter((option) => scoreInventoryOption(entry, option, payer, preferredAlias) > 0)
  };
}

export function scoreInventoryOption(
  entry: CatalogEntry,
  option: InventoryOption,
  payer: PayerKind = 'unknown',
  preferredAlias: CatalogAlias | null = null
): number {
  const optionHaystack = normalizeText([option.value ?? '', option.label ?? '', option.komposisi ?? ''].join(' '));

  if (!optionHaystack) {
    return 0;
  }

  const kandunganNorm = entry.normalizedKandungan;
  let score = 0;

  if (preferredAlias?.normalizedName && optionHaystack.includes(preferredAlias.normalizedName)) {
    score = Math.max(score, optionHaystack === preferredAlias.normalizedName ? 1_100 : 980);
  }

  for (const alias of entry.aliases) {
    if (preferredAlias && alias.id === preferredAlias.id) {
      continue;
    }

    if (optionHaystack.includes(alias.normalizedName)) {
      score = Math.max(score, optionHaystack === alias.normalizedName ? 880 : 760);
    }
  }

  if (!preferredAlias) {
    for (const brandNorm of entry.allNames.map((name) => normalizeText(name))) {
      if (optionHaystack.includes(brandNorm)) {
        score = Math.max(score, optionHaystack === brandNorm ? 1_000 : 860);
      }
    }
  }

  if (optionHaystack.includes(kandunganNorm)) {
    score = Math.max(score, optionHaystack === kandunganNorm ? 900 : 720);
  }

  const kandunganTokens = tokenize(entry.kandungan).filter(
    (token) => token.length > 2 && /[A-Z]/.test(token) && !NON_DISTINCTIVE_TOKENS.has(token)
  );
  const matchedTokens = kandunganTokens.filter((token) => optionHaystack.includes(token));
  if (matchedTokens.length > 0) {
    score = Math.max(score, matchedTokens.length * 80);
  }

  return score + getPayerBonus(option, payer);
}

function getPrioritizedAliases(entry: CatalogEntry, payer: PayerKind, preferredAlias: CatalogAlias | null): CatalogAlias[] {
  if (!entry.aliases.length) {
    return [];
  }

  if (preferredAlias) {
    const sameSourceSiblings = entry.aliases.filter(
      (alias) => alias.id !== preferredAlias.id && alias.source === preferredAlias.source
    );
    const oppositeSourceSiblings = entry.aliases.filter(
      (alias) => alias.id !== preferredAlias.id && alias.source !== preferredAlias.source
    );
    return [preferredAlias, ...sameSourceSiblings, ...oppositeSourceSiblings];
  }

  const prioritizedSources = payer === 'umum' ? ['Umum', 'BPJS'] : ['BPJS', 'Umum'];
  return prioritizedSources.flatMap((source) => entry.aliases.filter((alias) => alias.source === source));
}

function getPayerBonus(option: InventoryOption, payer: PayerKind): number {
  if (payer === 'unknown') {
    return 0;
  }

  const penjamin = normalizeText(String(option.penjamin ?? ''));
  if (!penjamin) {
    return 0;
  }

  if (payer === 'bpjs' && penjamin.includes('BPJS')) {
    return 70;
  }

  if (payer === 'umum' && penjamin.includes('UMUM')) {
    return 70;
  }

  return 0;
}
