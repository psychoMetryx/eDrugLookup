# Panduan Update Katalog dari Sumber Data Eksternal (PDF/Excel)

Panduan ini untuk pengguna yang ingin memakai daftar obat sendiri tanpa bergantung pada file PDF lokal di repo.

## File yang Boleh Diedit

Gunakan [LIST OBAT 2026.csv](../LIST%20OBAT%202026.csv) sebagai source of truth.

Jangan edit [catalog.ts](../src/generated/catalog.ts) secara manual karena file itu generated otomatis saat build.

## Struktur CSV yang Harus Dipertahankan

```csv
Kategori,Kandungan,Sediaan,Obat BPJS,Obat Umum
```

Arti kolom:

- `Kategori`: kelompok obat
- `Kandungan`: nama kandungan atau komposisi
- `Sediaan`: bentuk obat
- `Obat BPJS`: alias untuk jalur BPJS
- `Obat Umum`: alias untuk jalur Umum

## Aturan Penting

- Satu baris adalah satu obat untuk satu kombinasi `Kategori + Kandungan + Sediaan`.
- Jika satu kolom punya lebih dari satu alias, pisahkan dengan titik koma `;`.
- Contoh yang benar: `FENATIC 400; FARSIFEN 400`
- Jika tidak ada nilai, isi dengan `-`.
- Jangan ubah nama header kolom.
- Simpan tetap sebagai `.csv`.

## Jika Sumber Data Berupa PDF

1. Gunakan dokumen PDF sumber (dari pihak internal/eksternal) sebagai referensi isi data.
2. Gunakan [LIST OBAT 2026.csv](../LIST%20OBAT%202026.csv) sebagai template dan satu-satunya source of truth di repo.
3. Pindahkan isi dari dokumen sumber ke kolom CSV yang sesuai.
4. Jika di dokumen sumber beberapa nama obat ditulis bertumpuk dalam satu sel, ubah menjadi format CSV dengan separator `;`.

Contoh:

- tampilan dokumen sumber: `FENATIC 400` lalu `FARSIFEN 400`
- format CSV: `FENATIC 400; FARSIFEN 400`

## Jika Sumber Data Berupa Excel

1. Pastikan kolom Excel bisa dipetakan ke:
   - `Kategori`
   - `Kandungan`
   - `Sediaan`
   - `Obat BPJS`
   - `Obat Umum`
2. Rapikan alias ganda agar dipisah dengan `;`.
3. Export atau simpan sebagai CSV.
4. Ganti isi [LIST OBAT 2026.csv](../LIST%20OBAT%202026.csv) dengan data tersebut (tetap jadikan CSV ini sebagai source of truth).

## Contoh Baris yang Benar

```csv
Kategori,Kandungan,Sediaan,Obat BPJS,Obat Umum
ANALGETIK/ANTIPIRETIC,Paracetamol 500 mg,Tablet,PARACETAMOL (PCT),FASGO 500
ANALGETIK/ANTIPIRETIC,Ibuprofen 400 mg,Tablet,IBUPROFEN TAB,FENATIC 400; FARSIFEN 400
PENCERNAAN,Per 5 ml : Sucralfate 500 mg,Sirup,-,PROFAT SYR; SUCRALFATE SYR
```

## Setelah CSV Diubah

Jalankan:

```bash
npm run build
```

Lalu:

1. buka `chrome://extensions` atau `edge://extensions`
2. klik `Reload` pada extension
3. refresh halaman EMR

## Verifikasi Setelah Update

Lanjutkan dengan [Panduan smoke test setelah update](./smoke-test-after-update.md).
