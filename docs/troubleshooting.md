# Panduan Troubleshooting

Dokumen ini membantu saat extension tidak tampil atau hasil lookup tidak sesuai.

## Extension Tidak Muncul

Cek hal berikut:

- sudah menjalankan `npm run build`
- extension diload dari folder [`dist/`](../dist)
- extension sudah di-`Reload`
- halaman yang dibuka cocok dengan `pemeriksaanmedis/show/*`
- context yang aktif memang `Non Racik` atau modal `Cari Obat`

## Perubahan Daftar Obat Tidak Muncul

Cek hal berikut:

- yang diedit adalah [LIST OBAT 2026.csv](../LIST%20OBAT%202026.csv)
- bukan [catalog.ts](../src/generated/catalog.ts)
- setelah edit CSV kamu menjalankan `npm run build`
- extension sudah di-`Reload`
- halaman EMR sudah di-refresh

## Lookup Kosong atau Tidak Ketemu

Cek hal berikut:

- nama obat benar-benar ada di CSV
- alias ganda dipisah dengan `;`
- tidak ada typo pada kolom `Kandungan`, `Obat BPJS`, atau `Obat Umum`
- format CSV masih 5 kolom

## Payer Salah

Cek hal berikut:

- row `Penjamin` di kartu `Data Pasien`
- jangan ambil acuan dari `Penjamin Obat` pada modal atau tabel hasil

## Alias Gabungan Muncul Lagi

Biasanya penyebabnya salah format CSV.

Periksa:

- alias ganda harus pakai `;`
- jangan gabungkan dua nama obat jadi satu string tanpa separator
- build ulang setelah CSV diperbaiki

## Modal Input Berubah Sendiri

Kalau input modal terlihat berubah sendiri saat proses resolve:

- reload extension
- jalankan build terbaru
- ulangi smoke test

Kalau masih terjadi, catat query yang dipakai dan laporkan sebagai bug.

## Build Gagal

Coba:

```bash
npm install
npm test
npm run build
```

Kalau masih gagal:

- cek apakah Node.js sudah terpasang
- cek apakah dependency sudah berhasil diinstall
- baca error terakhir di terminal

## Link Lanjutan

- [Panduan instalasi untuk user biasa](./install-for-users.md)
- [Panduan update katalog dari PDF atau Excel](./update-catalog-from-pdf-excel.md)
- [Panduan smoke test setelah update](./smoke-test-after-update.md)
- [FAQ singkat](./faq.md)
