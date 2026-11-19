# Sedekah Kilat Guru (SKIL Guru) — Frontend Web App

Aplikasi web pencatatan dana sosial dan sedekah guru di lingkungan sekolah dengan arsitektur **GAS-PRO-API** (Google Apps Script REST API + Frontend Native GitHub Pages).

## 📁 Struktur Berkas

```
skil-guru/
├── index.html        # File utama antarmuka (Root GitHub Pages)
├── README.md         # Dokumentasi ini
├── css/
│   └── style.css     # Sistem desain Solidarity Glass / Cool Blue Glassmorphism
└── js/
    ├── config.js     # Alamat endpoint GAS_URL dan parameter sekolah
    ├── api.js        # Klien API REST fetch() CORS-Safe
    └── app.js        # Controller aplikasi, filter, kompresi foto & Chart.js
```

## ⚙️ Cara Menghubungkan Backend

1. Buka file `js/config.js`.
2. Masukkan URL Web App Google Apps Script hasil deploy ke variabel `GAS_URL`:
   ```javascript
   const APP_CONFIG = {
     GAS_URL: 'https://script.google.com/macros/s/AKfycbx.../exec',
     ...
   };
   ```
3. Simpan dan push ke GitHub Pages!
