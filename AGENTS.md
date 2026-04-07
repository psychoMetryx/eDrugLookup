# AGENTS.md

## Ringkasan Repo

Repo ini adalah extension MV3 untuk membantu drug lookup pada eClinic, khususnya halaman `pemeriksaanmedis/show/*` dan workflow resep `Non Racik`. Area yang paling sensitif adalah:

- DOM live eClinic
- bridge ke Vue / main-world
- context pasien dan payer
- behavior modal native `Cari Obat`

Jangan perlakukan repo ini seperti extension UI biasa. Sedikit perubahan pada selector, cara bridge, atau resolver bisa langsung mengganggu input resep di halaman pasien.

## Source of Truth

- Source of truth katalog obat adalah [LIST OBAT 2026.csv](C:/Users/POLI%20UMUM/Desktop/CODEX/Extension/LIST%20OBAT%202026.csv)
- File generated [catalog.ts](C:/Users/POLI%20UMUM/Desktop/CODEX/Extension/src/generated/catalog.ts) tidak boleh diedit manual
- Perubahan catalog harus lewat pipeline:
  - edit CSV
  - jalankan `npm run build:catalog` atau `npm run build`
- Jangan anggap data di generated file sebagai canonical source

## Peta Modul

- [controller.ts](C:/Users/POLI%20UMUM/Desktop/CODEX/Extension/src/content/controller.ts)
  - orchestrator utama untuk state lookup, search, resolve, cache, dan panel render
- [pageBridge.ts](C:/Users/POLI%20UMUM/Desktop/CODEX/Extension/src/content/pageBridge.ts)
  - bridge ke main-world / Vue methods eClinic
- [pageState.ts](C:/Users/POLI%20UMUM/Desktop/CODEX/Extension/src/content/pageState.ts)
  - deteksi context `inline-non-racik`, `modal-cari-obat`, atau `inactive`
- [payer.ts](C:/Users/POLI%20UMUM/Desktop/CODEX/Extension/src/content/payer.ts)
  - infer payer pasien dari `Data Pasien > Penjamin`
- [ui.ts](C:/Users/POLI%20UMUM/Desktop/CODEX/Extension/src/content/ui.ts)
  - panel UI dalam `ShadowRoot`
- `src/lib/catalog/*`
  - `normalize.ts`: normalisasi CSV dan alias
  - `search.ts`: ranking lookup lokal
  - `resolve.ts`: candidate term dan ranking inventory live
  - `types.ts`: shape internal penting

## Invariant Teknis yang Wajib Dijaga

- Modal harus tetap native-first
- Extension tidak boleh men-trigger `Tambahkan Obat`
- Extension tidak boleh men-trigger `Simpan`
- Extension tidak boleh submit form resep
- Payer harus diambil dari row pasien `Penjamin`, bukan dari tabel hasil modal atau `Penjamin Obat`
- Alias utama dan sibling alias tidak boleh digabung lagi menjadi satu term pencarian concatenated
- Generated catalog harus selalu konsisten dengan CSV
- Badge source alias utama harus tetap tampil walaupun alias tidak punya sibling
- Warna badge harus konsisten:
  - BPJS merah
  - Umum biru

## Aturan Saat Mengubah Resolver

- Bedakan dengan jelas:
  - alias utama yang diklik user
  - sibling alias dalam entry yang sama
  - fallback kandungan
- Candidate order untuk modal harus dimulai dari clicked alias
- Jangan overwrite input modal yang terlihat user selama internal/background resolve
- Jika perlu fallback modal native search, mulai dari clicked alias terlebih dahulu
- Jika alias tidak match, baru lanjut ke sibling alias dan kandungan
- Cache resolve harus keyed per alias, bukan cuma per parent entry

## Aturan Saat Mengubah UI

- UI extension harus tetap dirender di `ShadowRoot`
- Jangan pasang overlay yang menghalangi click native modal
- Jangan ambil alih keyboard modal native kecuali benar-benar disengaja dan didokumentasikan
- Panel harus tetap usable di zoom yang umum dipakai user
- Badge source alias utama harus selalu terlihat
- Jika ada perubahan visual besar, update test UI atau tambahkan regression test

## API / Interface Notes

Type penting yang perlu dipahami:

- `CatalogEntry`
  - parent row hasil normalisasi CSV
  - berisi kandungan, sediaan, alias, dan token pencarian
- `CatalogAlias`
  - alias individual untuk suggestion / resolve
  - punya `id`, `parentEntryId`, `name`, `source`, `normalizedName`
- `CatalogSearchResult`
  - hasil ranking search lokal
  - membawa `entry` dan `alias`
- `PayerInference`
  - hasil infer payer pasien
  - berisi `kind`, `source`, `confidence`, dan `rawValue`

Bridge actions yang dipakai:

- `searchInventory`
- `selectInventory`
- `primeSearch`
- `searchModalInventory`
- `selectModalInventory`
- `primeModalSearch`

Context modes:

- `inline-non-racik`
- `modal-cari-obat`
- `inactive`

## Checklist Verifikasi

Sebelum bilang perubahan aman:

1. jalankan `npm test`
2. jalankan `npm run build`
3. reload extension di `chrome://extensions`
4. refresh halaman EMR
5. smoke test query:
   - `paracetamol`
   - `pacd`
   - `cop`
6. cek hal-hal berikut:
   - payer badge benar
   - alias utama tampil benar
   - alias gabungan tidak muncul lagi
   - modal input tidak “lari” saat resolve internal
   - extension tidak klik `Tambahkan Obat`
   - extension tidak klik `Simpan`

## Troubleshooting Cepat

### Extension tidak muncul

- cek build terbaru sudah di-load dari `dist`
- cek extension sudah di-reload
- cek halaman match ke `pemeriksaanmedis/show/*`
- cek context benar-benar `Non Racik` atau modal `Cari Obat` sedang aktif

### Payer salah

- cek row `Data Pasien > Penjamin`
- pastikan infer tidak membaca `Penjamin Obat` dari modal/table
- tambah regression test di `payer.spec.ts` bila bug baru ditemukan

### Alias gabungan muncul lagi

- cek logic split alias di `normalize.ts`
- cek generated `catalog.ts`
- cek search result keyed per alias, bukan per parent entry

### Modal input ikut berubah saat resolve

- cek `pageBridge.ts`
- pastikan internal modal search tidak meninggalkan nilai fallback di input visible
- pastikan `syncInput` hanya true untuk explicit native fallback yang memang diinginkan user

### Panel menutup atau blocking modal native

- cek handling focus/click di controller
- cek pointer-events dan positioning di UI shadow DOM
- verifikasi keyboard modal tetap native-first

## Gaya Kontribusi

- Utamakan perubahan kecil dan terukur
- Tambah test untuk setiap bug nyata yang baru ditemukan
- Jika menyentuh `controller`, `pageBridge`, dan `ui` sekaligus, dokumentasikan invariant yang berubah
- Jangan menyisipkan “fix cepat” di generated file
- Kalau perilaku extension berubah untuk user, update dokumentasi yang relevan
