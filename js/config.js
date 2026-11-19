/**
 * ============================================================================
 * SEDEKAH KILAT GURU (SKIL GURU) — KONFIGURASI FRONTEND
 * ============================================================================
 * File ini menyimpan konfigurasi utama dan alamat backend Google Apps Script.
 * ============================================================================
 */

const APP_CONFIG = {
  // Ganti URL di bawah ini dengan URL Web App (/exec) dari hasil Deploy Google Apps Script Anda.
  // Contoh: 'https://script.google.com/macros/s/AKfycbx.../exec'
  GAS_URL: 'https://script.google.com/macros/s/AKfycbz6NOh3TQng5GMb3UBsJ2kTeXYE4-Nq5HKWkzd2uANl3hiKRTpgs0EgWnWYfKjsFU3P2g/exec',

  // Informasi Sekolah & Aplikasi
  APP_NAME: 'Sedekah Kilat Guru',
  APP_CODE: 'SKIL Guru',
  SCHOOL_NAME: 'SDIT Al-Multazam',
  TAGLINE: 'Rekapitulasi Dana Sosial Kilat & Solidaritas',

  // Pengaturan Kompresi Foto (Canvas Klien)
  COMPRESSION: {
    MAX_WIDTH: 1080, // Resolusi lebar maksimal foto nota
    QUALITY: 0.70    // Kompresi JPEG 70% (mengurangi ukuran ~90% tanpa pecah)
  },

  // Target Mata Uang
  CURRENCY_PREFIX: 'Rp '
};
