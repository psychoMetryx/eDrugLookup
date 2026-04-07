# Customize Your Drug List

Halaman ini adalah panduan singkat untuk user internal yang ingin memakai katalog obat lokal (CSV sendiri) tanpa mengubah alur utama extension.

## Mulai dari Sini

- [Panduan instalasi untuk user biasa](./install-for-users.md)
- [Panduan update katalog dari sumber data eksternal (PDF/Excel)](./update-catalog-from-pdf-excel.md)
- [Panduan smoke test setelah update](./smoke-test-after-update.md)
- [Panduan troubleshooting](./troubleshooting.md)
- [FAQ singkat](./faq.md)

## Panduan Singkat Isi CSV Lokal

1. Siapkan salinan lokal `LIST OBAT 2026.csv` sebagai sumber data katalog internal.
2. Isi/update baris obat sesuai kebutuhan internal klinik.
3. Pastikan format alias konsisten (alias ganda dipisah `;`).
4. Simpan perubahan CSV lokal.

> CSV internal adalah data operasional internal. **Jangan commit CSV internal ke repository Git publik.**

## Build Lokal Setelah Ubah CSV

Setelah CSV lokal diperbarui, jalankan langkah berikut secara berurutan:

1. `npm run build:catalog`
   - Regenerate file `src/generated/catalog.ts` dari CSV.
2. `npm run build`
   - Build extension untuk menghasilkan output terbaru di folder `dist`.
3. Reload extension dari folder `dist` di `chrome://extensions`.
4. Refresh halaman EMR sebelum verifikasi.

## Checklist Verifikasi Cepat (Setelah Build)

Lakukan smoke test query minimal:

- `paracetamol`
- `pacd`
- `cop`

Lalu cek poin penting berikut:

- Badge payer tampil sesuai context pasien.
- Alias utama tampil benar (tanpa alias gabungan yang tidak diinginkan).
- Interaksi native modal tetap normal.

## Catatan Penting

- Source of truth yang boleh diedit adalah `LIST OBAT 2026.csv` (lokal/internal).
- Jangan edit `src/generated/catalog.ts` secara manual.
- Perubahan katalog harus melalui pipeline build (`build:catalog` → `build`).
