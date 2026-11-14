# cupuberlari — running tracker

Aplikasi lari berbasis web untuk pelari pemula, menengah, dan pro. Tanpa server, tanpa database, tanpa API berbayar. Semua data disimpan di browser HP pengguna (`localStorage`).

## Aplikasi Android + sinkron

Langkah tersedia sebagai **website** dan **aplikasi Android** (Capacitor). Data keduanya tersambung lewat akun Supabase.

### 1. Supabase (sudah terpasang)
Proyek Supabase **cupuberlari** (region Singapura) sudah dibuat dan terhubung lewat `src/config.js`. Tabel `lk_state` dan `lk_runs` beserta Row Level Security ada di `supabase/schema.sql`. Pengguna cukup daftar/masuk di Profil → Akun & sinkron.

Pengaturan yang sebaiknya diubah sekali di dashboard Supabase (Authentication):
- **URL Configuration → Site URL**: `https://jadilebihfit.github.io/running-tracker/` supaya tautan konfirmasi email membuka aplikasi, bukan localhost.
- Opsional: **Sign In / Providers → Email → Confirm email** dimatikan supaya daftar langsung bisa masuk tanpa klik email.

### 2. Dapatkan APK
Setiap push ke `main` menjalankan GitHub Actions (`.github/workflows/android.yml`) yang membuat APK dan menaruhnya di halaman **Releases**. Tautan unduh langsung (selalu versi terbaru):
https://github.com/jadilebihfit/running-tracker/releases/latest/download/cupuberlari.apk

Unduh dari HP Android, buka file-nya, izinkan "Instal dari sumber tidak dikenal" kalau diminta.

Build sendiri (butuh Android Studio + JDK 21):
```bash
npm install
npm run android:sync
npm run android:open
```

### Cara sinkron bekerja
- Data selalu disimpan dulu di HP (bisa offline), lalu dikirim ke Supabase saat online.
- Sinkron otomatis saat aplikasi dibuka, saat kembali ke aplikasi, dan setelah ada perubahan.
- Lari: versi yang paling baru diubah yang menang. Lari yang dihapus ikut terhapus di perangkat lain.
- Profil: versi terbaru menang. Saat pertama kali masuk di perangkat baru, profil dari akun yang dipakai.
- Progres program dan milestone digabung dari semua perangkat.

## Struktur

```
src/
  index.html        markup semua halaman
  styles.css        tema gelap + komponen (token warna di :root)
  app.js            seluruh logika aplikasi
  config.js         URL + anon key Supabase
  vendor/           Leaflet 1.9.4 (peta) dan supabase-js 2.118 (sinkron)
supabase/schema.sql tabel + Row Level Security untuk sinkron
android/            proyek Android (Capacitor 7)
capacitor.config.json, package.json
build.py            gabungkan src/ jadi satu file (index.html, dist/, www/)
dist/               hasil build (index.html + artifact.html)
```

## Menjalankan saat mengedit

GPS hanya jalan di `https://` atau `http://localhost`, jadi jangan buka file langsung (file://).

- VS Code: pasang ekstensi **Live Server**, klik kanan `src/index.html` → *Open with Live Server*.
- Atau terminal:

```bash
cd src && python3 -m http.server 8000
```

Lalu buka http://localhost:8000. Untuk mencoba GPS dari HP di jaringan yang sama, perlu HTTPS (pakai hasil build di Netlify).

## Buka aplikasinya

https://jadilebihfit.github.io/running-tracker/

## Build dan deploy

```bash
python3 build.py
```

- `index.html` di root → otomatis tampil di GitHub Pages setelah di-push (Settings → Pages → Deploy from branch → `main` / root).
- `dist/index.html` → bisa juga diseret ke https://app.netlify.com/drop (gratis, otomatis HTTPS). Buka dari HP, Share → Add to Home Screen.
- `dist/artifact.html` → versi untuk artifact claude.ai (GPS dan gambar peta diblokir di sana, otomatis memakai mode tanpa GPS, impor GPX, dan gambar rute).

## Peta bagian kode (app.js)

| Bagian | Isi |
|---|---|
| `util` | format waktu/pace, tanggal, haversine |
| `konstanta` | `LEVELS` (pemula/menengah/pro + fitur bawaan), `FEATS`, jarak lomba |
| `state` | profil, daftar lari, progres program, milestone (kunci `lk-*` di localStorage) |
| `fisiologi` | VDOT (Daniels), pace latihan, prediksi lomba |
| `program` | `planPemula()` lari-jalan, `planStructured()` 10K/HM/FM |
| `milestone` | daftar `MS` + `checkMilestones()` |
| `native` | deteksi Capacitor, akses plugin native |
| `perekam` | GPS live: filter akurasi (>35 m dibuang), anti-goyang (<3 m), anti-loncat (>11 m/s), elevasi, split, jeda otomatis, mode simulasi |
| `analisis track` | best effort 1K–FM, split, impor GPX |
| `story IG` | `drawStory()` kartu kaca 1080×1920, background foto/transparan/gelap/lime |
| `akun & sinkron` | login Supabase, `syncNow()` tarik/kirim lari, profil, progres |
| `peta` | Leaflet + tile CARTO dark, fallback ke canvas |
| `Beranda`, `Program`, `Riwayat`, `Alat`, `Pencapaian`, `Profil`, `Onboarding` | render tiap halaman |

## Catatan

- **Font**: teks memakai font sistem dulu (`-apple-system`), jadi di iPhone/Mac tampil sebagai SF Pro; di perangkat lain memakai Inter dari Google Fonts. File SF Pro sengaja tidak disimpan di repo ini karena lisensi Apple tidak mengizinkan disebarkan. Angka memakai Roboto Mono.
- **Peta**: tile dari CARTO (berbasis OpenStreetMap), gratis untuk pemakaian ringan dengan atribusi. Untuk banyak pengguna, cek ketentuan CARTO.
- **GPS**: di aplikasi Android, GPS tetap merekam saat layar mati (foreground service + notifikasi). Di website, browser berhenti membaca GPS saat layar terkunci; waktu yang terlewat tetap dihitung kalau kamu terus bergerak, tapi rute di bagian itu jadi garis lurus.
- Rumus detak jantung: Tanaka + Karvonen. Kalori: berat × km × 1,036 (perkiraan).
