# Panduan Smoke Test Setelah Update

Panduan ini dipakai setelah katalog atau build extension diperbarui.

## Sebelum Mulai

Pastikan kamu sudah menjalankan:

```bash
npm test
npm run build
```

Lalu reload extension di browser dan refresh halaman EMR.

## Langkah Smoke Test

1. Buka halaman `https://emr.eclinic.id/pemeriksaanmedis/show/*`
2. Masuk ke `Resep`
3. Pilih `Non Racik`
4. Klik field `Nama Obat`
5. Tes query berikut satu per satu:
   - `paracetamol`
   - `pacd`
   - `cop`

## Yang Harus Dicek

- panel suggestion muncul
- payer badge sesuai pasien
- alias utama tampil benar
- alias tambahan tampil sebagai item terpisah
- alias gabungan tidak muncul lagi sebagai satu istilah panjang
- modal input tidak berubah sendiri saat resolve internal
- extension tidak klik `Tambahkan Obat`
- extension tidak klik `Simpan`

## Tanda Hasil Aman

Kalau tiga query tadi berjalan normal dan semua checklist lolos, update katalog biasanya aman dipakai.

## Kalau Ada Masalah

Lanjut ke [Panduan troubleshooting](./troubleshooting.md).
