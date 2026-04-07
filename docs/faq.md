# FAQ Singkat

## Boleh edit `src/generated/catalog.ts` langsung?

Tidak. File itu generated otomatis. Edit yang benar adalah [LIST OBAT 2026.csv](../LIST%20OBAT%202026.csv).

## Kenapa harus build ulang setelah edit CSV?

Karena extension membaca katalog generated yang dibangkitkan dari CSV saat proses build.

## Kenapa harus reload extension di browser?

Karena browser masih memakai build lama sampai extension di-`Reload`.

## Kalau cuma ganti daftar obat, apakah perlu `npm install` lagi?

Biasanya tidak. `npm install` cukup saat setup awal atau saat dependency berubah.

## Separator alias yang benar apa?

Gunakan titik koma `;`.

Contoh:

```text
FENATIC 400; FARSIFEN 400
```

## Kalau tidak ada obat BPJS atau Umum, diisi apa?

Isi dengan `-`.

## Bagaimana tahu update katalog sudah masuk?

Jalankan [Panduan smoke test setelah update](./smoke-test-after-update.md).

## Kalau sumber daftar obat masih PDF?

Gunakan [Panduan update katalog dari PDF atau Excel](./update-catalog-from-pdf-excel.md).
