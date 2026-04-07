# Customize Your Drug List

Halaman ini adalah pintu masuk cepat untuk user yang ingin memakai katalog obat sendiri.

## Mulai dari Sini

- [Panduan instalasi untuk user biasa](./install-for-users.md)
- [Panduan update katalog dari PDF atau Excel](./update-catalog-from-pdf-excel.md)
- [Panduan smoke test setelah update](./smoke-test-after-update.md)
- [Panduan troubleshooting](./troubleshooting.md)
- [FAQ singkat](./faq.md)

## Ringkasan Alur

1. Install dependency dan build extension.
2. Edit [LIST OBAT 2026.csv](../LIST%20OBAT%202026.csv) bila ingin memakai daftar obat sendiri.
3. Jalankan `npm run build`.
4. Reload extension di browser.
5. Jalankan smoke test.

## Catatan Penting

- Source of truth yang boleh diedit adalah [LIST OBAT 2026.csv](../LIST%20OBAT%202026.csv)
- Jangan edit [catalog.ts](../src/generated/catalog.ts) secara manual
- Alias ganda harus dipisah dengan `;`
