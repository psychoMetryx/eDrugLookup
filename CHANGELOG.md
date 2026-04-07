# Changelog

Semua perubahan penting untuk project ini akan diringkas di file ini.

## v0.1.0 - 2026-04-07

Initial public documentation release.

### Added

- Extension MV3 untuk assistive drug lookup pada eClinic workflow `Resep > Non Racik`
- Lookup lokal berbasis [LIST OBAT 2026.csv](./LIST%20OBAT%202026.csv)
- Support untuk field inline `Nama Obat` dan modal native `Cari Obat`
- Payer inference dari `Data Pasien > Penjamin`
- Inventory resolver berbasis bridge ke page context atau Vue internal eClinic
- Dokumentasi user:
  - panduan instalasi
  - panduan update katalog dari PDF atau Excel
  - panduan smoke test
  - panduan troubleshooting
  - FAQ singkat

### Notes

- Extension sengaja tidak menekan `Tambahkan Obat`
- Extension sengaja tidak menekan `Simpan`
- Extension sengaja tidak submit resep otomatis
- Integrasi sangat bergantung pada struktur DOM dan Vue internal eClinic
