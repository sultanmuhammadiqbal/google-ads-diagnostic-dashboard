# Dashboard Diagnosis Google Ads (Simulasi)

> *Data simulasi. Struktur dan kasus diagnosis berasal dari pengalaman kerja nyata; seluruh angka fiktif dan dihasilkan oleh skrip.*

Studi kasus portofolio berupa dashboard interaktif statis. Kasusnya: analisis biaya per konversi (CPA) per perangkat bias karena konversi kunjungan toko bercampur dengan konversi pembelian, sehingga rekomendasi mengurangi bid Desktop keliru dan dibatalkan sebelum dieksekusi. Pengunjung menemukan bias itu sendiri lewat satu tombol di tampilan Diagnosis.

**Semua angka di proyek ini fiktif.** Seluruhnya dibuat oleh skrip generator (`scripts/generate-data.mjs`), bukan diambil atau ditiru dari akun iklan mana pun. Tidak ada konektor atau API Google Ads, tidak ada kunci API, tidak ada pelacak.

Banner di atas tampil permanen di setiap halaman dan tidak bisa ditutup. Biaya ditampilkan sebagai indeks (rata-rata biaya harian 7 hari pertama = 100), bukan Rupiah.

## Tampilan

1. **Ringkasan**: filter rentang tanggal, kartu indeks biaya, konversi, dan CPA, tabel per tipe campaign dengan porsi budget, serta tren harian.
2. **Diagnosis**: tombol "Semua konversi" / "Purchase saja" mengubah grafik CPA per perangkat dan kartu rekomendasi. Di bawahnya ada tabel kontribusi tiap jenis konversi per perangkat dan penjelasan mengapa Kunjungan Toko menyesatkan perbandingan.
3. **Log keputusan**: enam entri fiktif beserta ambang yang dipakai. Kolom hasil diberi label ilustrasi. Di bawahnya ada kartu "Keputusan saya" untuk tiap entri dan blok "Hasil nyata (dinormalisasi)" yang terpisah dari simulasi.
4. **Peta kemampuan**: tabel fitur dashboard, kemampuan yang diperlihatkan, dan pemakaiannya di pekerjaan nyata.

Tampilan Diagnosis punya tombol **Mulai tur** (enam langkah, bisa dilewati kapan saja, tidak mengunci tombol konversi).

## Konten narasi

Teks tur, kartu keputusan, peta kemampuan, dan hasil nyata ditulis oleh pemilik proyek di folder `content/` (lihat `content/README.md`). Kode hanya menyiapkan struktur; field yang belum diisi tampil "belum diisi", dan blok hasil nyata kosong secara default ("Pengukuran sedang berjalan, hasil menyusul."). Hasil nyata yang diisi dibatasi tiga angka persen atau rentang, wajib bertanggal dan bersumber, dan build gagal bila melanggar.

## Menjalankan

Prasyarat: Node.js 20 atau lebih baru.

```bash
npm install
```

**Generator data.** Memakai seed tetap, jadi hasilnya selalu sama persis. Output ditulis ke `public/data/` (`meta.json`, `daily.json`, `decisions.json`).

```bash
npm run generate
```

**Situs.**

```bash
npm run dev        # mode pengembangan
npm run build      # build statis ke dist/
npm run preview    # menjalankan situs dari hasil build
```

## Pemeriksaan

```bash
npm run verify:data        # memastikan pola kasus tertanam di data
npm run check:determinism  # generator dijalankan dua kali, hasil harus identik
npm run check:content      # bentuk berkas content/ + pencarian kata klaim hasil
npm run test:content       # uji aturan hasil nyata (tanggal wajib, bukan mata uang, maks. tiga)
npm run scan               # pemindai kebocoran data nyata (berkas + riwayat git)
```

`npm run scan` hanya memeriksa pola umum secara bawaan (format ID akun iklan, berkas ekspor atau gambar). Untuk memeriksa nama perusahaan, brand, atau cabang, simpan daftarnya **di luar** repositori ini, lalu:

```bash
node scripts/scan-sensitive.mjs --terms ~/istilah-sensitif.txt
```

## Deploy ke Vercel

Situs ini statis. Di Vercel, impor repositori dan pakai preset **Vite** (build command `npm run build`, output directory `dist`). Data JSON sudah ada di repositori, jadi build tidak memerlukan generator.

## Struktur

```
scripts/generate-data.mjs   generator data sintetis (seed tetap)
scripts/verify-data.mjs     pemeriksa pola kasus
scripts/check-determinism.mjs
scripts/scan-sensitive.mjs
scripts/check-content.mjs   pemeriksa berkas content/ (jalan otomatis sebelum build)
content/                    teks narasi dan hasil nyata, ditulis pemilik proyek
public/data/                JSON hasil generator (satu-satunya sumber data)
src/                        aplikasi React + Recharts
```
