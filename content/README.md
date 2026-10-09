# Folder content

Semua teks narasi (tur, kartu keputusan, peta kemampuan) dan hasil nyata ditulis di sini oleh pemilik proyek. Kode tidak membuat teks narasi: field yang kosong tampil sebagai "belum diisi".

Setelah mengubah berkas di folder ini, jalankan `npm run check:content`. `npm run build` menjalankan pemeriksaan bentuk berkas lebih dulu dan berhenti bila ada yang salah.

## tour.json

Daftar tepat enam langkah, urutannya tetap. Field tiap langkah:

| Field | Wajib | Isi |
|---|---|---|
| `target` | ya | Elemen yang disorot: `grafik-cpa`, `kartu-rekomendasi`, `tabel-kontribusi`, `toggle-konversi`, atau `paragraf-log` |
| `judul` | ya | Judul langkah (boleh kosong sementara) |
| `teks` | ya | Teks langkah (boleh kosong sementara) |
| `tampilan` | tidak | `all` atau `purchase`: tampilan konversi yang dipasang saat langkah dibuka. Pengunjung tetap bebas menekan tombol konversi kapan saja |
| `topik` | tidak | Pengingat topik langkah untuk penulis; tidak ditampilkan |

## decisions.json

Satu objek per entri Log keputusan, dihubungkan lewat `logId`. Lima field teks: `yangSayaLihat`, `hipotesis`, `yangSayaCek`, `keputusan`, `yangSayaPantau`.

Nilai `logId` yang tersedia (dari `public/data/decisions.json`):
`negative-keyword-search-b`, `bid-cut-desktop-dibatalkan`, `jeda-search-c`, `geser-budget-pmax`, `laporan-cpa-per-jenis-konversi`, `pertahankan-budget-lokasi`.

## skills.json

Satu objek per baris tabel: `fitur`, `kemampuan`, `penggunaan`. Kolom `penggunaan` memakai deskripsi generik, tanpa nama perusahaan, brand, atau cabang.

## real-results.json

Kosong secara default (`[]`). Jangan diisi dengan nilai contoh. Maksimal tiga angka, masing-masing:

```json
{ "tipe": "persen", "nilai": 0, "metrik": "...", "sumber": "...", "tanggalPengambilan": "YYYY-MM-DD" }
```

atau `{ "tipe": "rentang", "dari": 0, "sampai": 0, ... }` untuk rentang persen. Build gagal bila ada angka tanpa tanggal, tanggal di masa depan, tanpa sumber atau metrik, lebih dari tiga angka, atau teks yang berbentuk mata uang (Rp, $, "juta", angka dengan pemisah ribuan, dan sejenisnya).
