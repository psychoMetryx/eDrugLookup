# Release Hygiene (Sanitasi Katalog)

Dokumen ini memastikan repo tidak menyimpan katalog obat nyata/sensitif di:

- `LIST OBAT 2026.csv`
- `src/generated/catalog.ts`

## Rule Sanitasi Sederhana

`npm run check:catalog-sanitization` akan **memblokir commit/CI** bila:

1. Ditemukan keyword nama obat nyata yang diblokir (contoh: `paracetamol`, `amoxicillin`, dst).
2. Format template tidak konsisten (mis. kategori tidak diawali `TEMPLATE`, placeholder `OBAT-CONTOH-` hilang, header CSV berubah).
3. Ukuran daftar melebihi baseline template:
   - `LIST OBAT 2026.csv` > 30 data row.
   - `src/generated/catalog.ts` > 30 entry `catalog-*`.

> Rule ini sengaja simple dan konservatif untuk mencegah kebocoran data saat review.

## Cara Pakai di Lokal (Pre-Commit)

Install `pre-commit` lalu pasang hook:

```bash
pre-commit install
```

Setiap commit akan menjalankan:

```bash
npm run check:catalog-sanitization
```

## CI Gate

Workflow `.github/workflows/catalog-hygiene.yml` menjalankan check sanitasi pada `push` dan `pull_request`.

PR tidak boleh di-merge jika check ini gagal.

## Checklist Reviewer (Wajib sebelum merge)

1. Jalankan `npm run check:catalog-sanitization`.
2. Pastikan diff pada `LIST OBAT 2026.csv` tetap berupa placeholder template.
3. Pastikan `src/generated/catalog.ts` hanya generated output dari template.
4. Pastikan tidak ada indikasi nama obat nyata, MRN, atau data pasien.

## Opsional: Audit dan Pembersihan History Lama

Jika pernah terlanjur commit katalog sensitif, lakukan audit:

```bash
git log --oneline -- "LIST OBAT 2026.csv" "src/generated/catalog.ts"
```

Jika ada kebocoran, lakukan rewrite history (contoh dengan `git filter-repo`) dan **rotate** akses repo bila diperlukan. Koordinasikan dulu dengan maintainer karena rewrite history berdampak ke semua kontributor.
