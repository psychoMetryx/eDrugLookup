# eDrugLookup

Extension Chromium Manifest V3 ini menambahkan drug lookup assistive ke halaman `https://emr.eclinic.id/pemeriksaanmedis/show/*`, khususnya untuk workflow resep `Non Racik`. Extension aman dipakai untuk mencari alias obat dari katalog internal, menampilkan prioritas payer pasien, dan membantu resolve ke inventory obat live di EMR. Extension ini sengaja tidak menekan `Tambahkan Obat`, tidak menekan `Simpan`, dan tidak melakukan submit resep otomatis.

## Fitur Saat Ini

- Lookup lokal dari [LIST OBAT 2026.csv](./LIST%20OBAT%202026.csv)
- Support dua flow:
  - field inline `Nama Obat` pada `Resep > Non Racik`
  - modal native `Cari Obat`
- Suggestion level alias:
  - alias utama tampil sebagai judul
  - sibling alias tampil sebagai pill tambahan
  - alias utama tetap punya badge sumber `BPJS` atau `Umum`
- Infer payer pasien dari `Data Pasien > Penjamin`
- Resolve ke inventory live EMR lewat bridge ke page context / Vue instance
- Modal behavior native-first:
  - tidak takeover `ArrowUp`, `ArrowDown`, atau `Enter`
  - tidak ganggu hasil pencarian native saat user sedang mengetik

## Struktur Proyek

- `src/content/`
  - content script, controller, UI shadow DOM, context detection, payer inference, dan page bridge
- `src/lib/catalog/`
  - normalisasi CSV, pencarian lokal, dan resolver inventory
- `src/generated/catalog.ts`
  - output generated dari CSV, tidak diedit manual
- `scripts/buildCatalog.ts`
  - build-time generator katalog TypeScript dari CSV
- `tests/`
  - unit/integration-style tests untuk catalog, controller, page bridge, payer, page state, dan UI
- `LIST OBAT 2026.csv`
  - source of truth manusia-editable untuk katalog obat

## Cara Menjalankan

### Setup

```bash
npm install
```

### Build production

```bash
npm run build
```

Hasil build akan tersedia di folder `dist/`.

### Load ke Chrome / Edge

1. Buka `chrome://extensions` atau `edge://extensions`
2. Aktifkan `Developer mode`
3. Klik `Load unpacked`
4. Pilih folder [`dist/`](./dist)

Kalau ada perubahan code, lakukan:

1. `npm run build`
2. klik `Reload` pada extension di halaman extensions
3. refresh halaman EMR

### Menjalankan test

```bash
npm test
```

### Development loop

```bash
npm run dev
```

Gunakan ini hanya bila memang butuh loop development. Karena content script dijalankan di `world: MAIN`, beberapa bagian tidak mendapat HMR penuh.

## Panduan Pengguna

Dokumentasi untuk user biasa tersedia di:

- [Panduan instalasi untuk user biasa](./docs/install-for-users.md)
- [Panduan update katalog dari PDF atau Excel](./docs/update-catalog-from-pdf-excel.md)
- [Panduan smoke test setelah update](./docs/smoke-test-after-update.md)
- [Panduan troubleshooting](./docs/troubleshooting.md)
- [FAQ singkat](./docs/faq.md)
- [Customize Your Drug List](./docs/customize-catalog.md)

## Alur Data

1. CSV katalog diedit di [LIST OBAT 2026.csv](./LIST%20OBAT%202026.csv)
2. `npm run build:catalog` menjalankan [buildCatalog.ts](./scripts/buildCatalog.ts)
3. Generator menghasilkan [catalog.ts](./src/generated/catalog.ts)
4. Content script bootstrap dari [index.ts](./src/content/index.ts)
5. Controller menjalankan pencarian lokal berbasis alias dan kandungan
6. Jika user memilih suggestion, resolver akan mencari inventory live lewat page bridge
7. Hanya field obat yang diisi; extension tidak menyimpan resep

## Guardrail dan Safety

- Tidak klik `Tambahkan Obat`
- Tidak klik `Simpan`
- Tidak submit form
- Tidak takeover keyboard modal native
- Payer pasien harus dibaca dari row `Penjamin` pada kartu `Data Pasien`
- Modal resolve tidak boleh menggabungkan alias utama dan sibling alias menjadi satu term concatenated

## Known Limitations

- Sangat bergantung pada DOM dan Vue internal eClinic
- Perubahan struktur modal, selector, atau Vue method dapat memutus integrasi
- Extension saat ini fokus pada `Resep > Non Racik`
- Beberapa error console seperti `$.notify is not a function` berasal dari situs EMR, bukan dari extension ini

## Testing dan Acceptance

Test yang ada saat ini mencakup:

- normalisasi CSV dan split alias
- ranking search lokal
- resolver inventory dan prioritas payer
- context detection inline vs modal
- bridge ke Vue / page context
- behavior controller untuk modal native-first
- layout dan badge UI

Smoke test manual minimum di EMR:

1. buka halaman `pemeriksaanmedis/show/*`
2. masuk ke `Resep`
3. pilih `Non Racik`
4. tes query `paracetamol`
5. tes query `pacd`
6. tes query `cop`
7. pastikan:
   - panel muncul
   - payer badge benar
   - alias gabungan tidak muncul lagi
   - extension tidak klik `Tambahkan Obat` atau `Simpan`

## Future Work

- support `Racik`
- support `Resep ke Luar`
- opsi update / replace catalog yang lebih aman
- dokumentasi admin flow untuk refresh katalog tanpa edit code inti
