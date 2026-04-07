# Panduan Instalasi untuk User Biasa

Panduan ini untuk pengguna yang hanya ingin memakai extension, bukan mengubah kode inti.

## Yang Dibutuhkan

- Google Chrome atau Microsoft Edge
- Node.js versi LTS
- Folder project eDrugLookup

## Langkah Instalasi

1. Download atau clone repository ini.
2. Buka folder project ini.
3. Jalankan:

```bash
npm install
npm run build
```

4. Buka `chrome://extensions` atau `edge://extensions`
5. Aktifkan `Developer mode`
6. Klik `Load unpacked`
7. Pilih folder [`dist/`](../dist)

Setelah itu extension siap dipakai di halaman EMR yang sesuai.

## Kalau Ada Update Katalog atau Kode

Kalau file katalog atau source code berubah, lakukan:

```bash
npm run build
```

Lalu:

1. kembali ke halaman extensions
2. klik `Reload` pada extension
3. refresh halaman EMR

## Cara Cek Instalasi Berhasil

1. Buka halaman `https://emr.eclinic.id/pemeriksaanmedis/show/*`
2. Masuk ke `Resep`
3. Pilih `Non Racik`
4. Klik field `Nama Obat`
5. Ketik `paracetamol`

Kalau berhasil, panel suggestion extension akan muncul.

## Jika Gagal

Lihat [Panduan troubleshooting](./troubleshooting.md).
