import { describe, expect, it } from 'vitest';

import { createCatalogEntries, normalizeText, parseCsv, splitDrugNames } from '../src/lib/catalog/normalize';
import { searchCatalog } from '../src/lib/catalog/search';

describe('catalog normalization', () => {
  it('parses CSV rows and splits multi-brand cells', () => {
    const rows = parseCsv([
      'Kategori,Kandungan,Sediaan,Obat BPJS,Obat Umum',
      'ANALGETIK,Paracetamol 500 mg,Tablet,PARACETAMOL (PCT),FASGO 500; FASIDOL',
      'ANTIBIOTIK,Amoxicillin 500 mg,Tablet,AMOX TAB,YUSIMOX TAB',
      'ANTIMUKOLITIK,PCT 120 mg, Sirup,"PACDIN SYR,LIBEBI SYR",-'
    ].join('\n'));

    const entries = createCatalogEntries(rows);
    expect(entries).toHaveLength(3);
    expect(entries[0].umumNames).toEqual(['FASGO 500', 'FASIDOL']);
    expect(entries[2].bpjsNames).toEqual(['PACDIN SYR', 'LIBEBI SYR']);
    expect(entries[2].aliases.map((alias) => alias.name)).toEqual(['PACDIN SYR', 'LIBEBI SYR']);
    expect(entries[0].searchTokens).toContain('Paracetamol 500 mg');
    expect(splitDrugNames('A; B ; C*')).toEqual(['A', 'B', 'C*']);
  });

  it('keeps dosage-style comma variants as one alias', () => {
    expect(splitDrugNames('MILORIN 150,300')).toEqual(['MILORIN 150,300']);
    expect(splitDrugNames('SCABIMITE CR 10gr,30gr*')).toEqual(['SCABIMITE CR 10gr,30gr*']);
  });

  it('normalizes text for lookup scoring', () => {
    expect(normalizeText(' Meloxicam* 7.5 mg ')).toBe('MELOXICAM 7.5 MG');
  });
});

describe('catalog search', () => {
  const entries = createCatalogEntries(
    parseCsv([
      'Kategori,Kandungan,Sediaan,Obat BPJS,Obat Umum',
      'ANALGETIK,Paracetamol 500 mg,Tablet,PARACETAMOL (PCT),FASGO 500',
      'ANALGETIK,Ibuprofen 400 mg,Tablet,IBUPROFEN TAB,FARSIFEN 400'
    ].join('\n'))
  );

  it('prefers exact kandungan and brand matches', () => {
    const kandunganResults = searchCatalog(entries, 'paracetamol 500 mg');
    expect(kandunganResults[0].entry.kandungan).toBe('Paracetamol 500 mg');

    const brandResults = searchCatalog(entries, 'farsifen');
    expect(brandResults[0].entry.kandungan).toBe('Ibuprofen 400 mg');
    expect(brandResults[0].alias.name).toBe('FARSIFEN 400');
  });

  it('returns separate alias suggestions for the same kandungan entry', () => {
    const aliasEntries = createCatalogEntries(
      parseCsv([
        'Kategori,Kandungan,Sediaan,Obat BPJS,Obat Umum',
        'ANTIMUKOLITIK KOMBINASI,"PCT 120 mg, Guaifenesin 50 mg, CTM 1 mg, Ethanol 7.5&",Sirup,"PACDIN SYR,LIBEBI SYR",-'
      ].join('\n'))
    );

    const results = searchCatalog(aliasEntries, 'guaifenesin');
    expect(results).toHaveLength(2);
    expect(results.map((result) => result.alias.name)).toEqual(['LIBEBI SYR', 'PACDIN SYR']);
  });
});
