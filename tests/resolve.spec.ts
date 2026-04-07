import { describe, expect, it } from 'vitest';

import { createCatalogEntries, parseCsv } from '../src/lib/catalog/normalize';
import { buildCandidateTerms, resolveInventoryMatch } from '../src/lib/catalog/resolve';

const [paracetamolEntry] = createCatalogEntries(
  parseCsv([
    'Kategori,Kandungan,Sediaan,Obat BPJS,Obat Umum',
    'ANALGETIK,Paracetamol 500 mg,Tablet,PARACETAMOL (PCT),FASGO 500; FASIDOL'
  ].join('\n'))
);

const [pacdinEntry] = createCatalogEntries(
  parseCsv([
    'Kategori,Kandungan,Sediaan,Obat BPJS,Obat Umum',
    'ANTIMUKOLITIK KOMBINASI,"PCT 120 mg, Guaifenesin 50 mg, CTM 1 mg, Ethanol 7.5&",Sirup,"PACDIN SYR,LIBEBI SYR",-'
  ].join('\n'))
);

describe('candidate terms', () => {
  it('prioritizes bpjs then umum names by default and falls back to kandungan', () => {
    expect(buildCandidateTerms(paracetamolEntry).slice(0, 3)).toEqual([
      'PARACETAMOL (PCT)',
      'FASGO 500',
      'FASIDOL'
    ]);
  });

  it('prioritizes umum names first for umum patients', () => {
    expect(buildCandidateTerms(paracetamolEntry, 'umum').slice(0, 3)).toEqual([
      'FASGO 500',
      'FASIDOL',
      'PARACETAMOL (PCT)'
    ]);
  });

  it('starts modal resolution from the clicked alias instead of the concatenated source cell', () => {
    const pacdinAlias = pacdinEntry.aliases.find((alias) => alias.name === 'PACDIN SYR');
    expect(buildCandidateTerms(pacdinEntry, 'bpjs', pacdinAlias).slice(0, 3)).toEqual([
      'PACDIN SYR',
      'LIBEBI SYR',
      'PCT 120 mg, Guaifenesin 50 mg, CTM 1 mg, Ethanol 7.5&'
    ]);
  });
});

describe('inventory resolution', () => {
  it('returns ready when one result clearly matches the mapped brand', () => {
    const resolution = resolveInventoryMatch(paracetamolEntry, [
      { id: '1', label: '20138 - FASGO 500 MG (1052)', value: 'FASGO 500 MG', komposisi: 'Paracetamol 500 mg' },
      { id: '2', label: '20091 - COLFIN SYR (39)', value: 'COLFIN SYR', komposisi: 'Paracetamol 120mg' }
    ]);

    expect(resolution.state).toBe('ready');
    expect(resolution.bestMatch?.id).toBe('1');
  });

  it('returns multiple when the best results are too close', () => {
    const resolution = resolveInventoryMatch(paracetamolEntry, [
      { id: '1', label: 'FASGO 500 MG', value: 'FASGO 500 MG' },
      { id: '2', label: 'FASIDOL TAB', value: 'FASIDOL TAB' }
    ]);

    expect(resolution.state).toBe('multiple');
    expect(resolution.rankedMatches).toHaveLength(2);
  });

  it('returns no-match when nothing lines up', () => {
    const resolution = resolveInventoryMatch(paracetamolEntry, [
      { id: '1', label: 'AMOXICILLIN TAB', value: 'AMOXICILLIN TAB', komposisi: 'Amoxicillin 500 mg' }
    ]);

    expect(resolution.state).toBe('no-match');
  });

  it('softly prefers penjamin that matches the inferred payer', () => {
    const resolution = resolveInventoryMatch(
      paracetamolEntry,
      [
        { id: '1', label: 'FASGO 500 MG', value: 'FASGO 500 MG', penjamin: 'UMUM' },
        { id: '2', label: 'FASGO 500 MG', value: 'FASGO 500 MG', penjamin: 'BPJS' }
      ],
      'bpjs'
    );

    expect(resolution.rankedMatches[0]?.id).toBe('2');
  });

  it('prefers the clicked alias when sibling aliases share the same kandungan', () => {
    const pacdinAlias = pacdinEntry.aliases.find((alias) => alias.name === 'PACDIN SYR') ?? null;
    const resolution = resolveInventoryMatch(
      pacdinEntry,
      [
        { id: '1', label: 'PACDIN SYR', value: 'PACDIN SYR', penjamin: 'BPJS' },
        { id: '2', label: 'LIBEBI SYR', value: 'LIBEBI SYR', penjamin: 'BPJS' }
      ],
      'bpjs',
      pacdinAlias
    );

    expect(resolution.state).toBe('ready');
    expect(resolution.bestMatch?.id).toBe('1');
  });
});
