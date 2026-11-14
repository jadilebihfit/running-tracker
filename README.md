# Langkah — aplikasi lari

Aplikasi lari berbasis web untuk pelari pemula, menengah, dan pro. Tanpa server, tanpa database, tanpa API berbayar. Semua data disimpan di browser HP pengguna (`localStorage`).

## Struktur

```
src/
  index.html        markup semua halaman
  styles.css        tema gelap + komponen (token warna di :root)
  app.js            seluruh logika aplikasi
  vendor/leaflet.css  stylesheet peta Leaflet 1.9.4
build.py            gabungkan src/ jadi satu file
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
| `perekam` | GPS live: filter akurasi (>35 m dibuang), anti-goyang (<3 m), anti-loncat (>11 m/s), elevasi, split, jeda otomatis, mode simulasi |
| `analisis track` | best effort 1K–FM, split, impor GPX |
| `story IG` | `drawStory()` kartu kaca 1080×1920, background foto/transparan/gelap/lime |
| `peta` | Leaflet + tile CARTO dark, fallback ke canvas |
| `Beranda`, `Program`, `Riwayat`, `Alat`, `Pencapaian`, `Profil`, `Onboarding` | render tiap halaman |

## Catatan

- **Font**: teks memakai font sistem dulu (`-apple-system`), jadi di iPhone/Mac tampil sebagai SF Pro; di perangkat lain memakai Inter dari Google Fonts. File SF Pro sengaja tidak disimpan di repo ini karena lisensi Apple tidak mengizinkan disebarkan. Angka memakai Roboto Mono.
- **Peta**: tile dari CARTO (berbasis OpenStreetMap), gratis untuk pemakaian ringan dengan atribusi. Untuk banyak pengguna, cek ketentuan CARTO.
- **Keterbatasan GPS web**: browser berhenti membaca GPS saat layar terkunci. Aplikasi menjaga layar tetap menyala (Wake Lock). Ada bug yang diketahui: dengan jeda otomatis aktif, waktu selama layar mati tidak dihitung sehingga pace terlihat lebih cepat (lihat fungsi `tick()` di `app.js`).
- Rumus detak jantung: Tanaka + Karvonen. Kalori: berat × km × 1,036 (perkiraan).
