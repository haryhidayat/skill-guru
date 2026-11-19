/**
 * ============================================================================
 * SEDEKAH KILAT GURU (SKIL GURU) — API CLIENT LAYER
 * ============================================================================
 * Menghubungkan Frontend ke Google Apps Script REST API via pure fetch()
 * Sesuai aturan arsitektur GAS-PRO-API:
 * - Tidak menggunakan google.script.run
 * - POST wajib menggunakan Content-Type: 'text/plain;charset=utf-8' untuk bypass CORS preflight
 * ============================================================================
 */

const API = {
  /**
   * Mengambil data kas lengkap dari Google Sheets melalui GAS doGet
   */
  async getKasData(nocache = false) {
    if (!APP_CONFIG.GAS_URL || APP_CONFIG.GAS_URL.trim() === '') {
      console.warn('⚠️ GAS_URL belum diatur di js/config.js. Menggunakan data simulasi lokal.');
      return this.getLocalDemoData();
    }

    try {
      const url = `${APP_CONFIG.GAS_URL}?action=getData${nocache ? '&nocache=1' : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Gagal memuat data dari spreadsheet');
      }

      return result.data;
    } catch (err) {
      console.error('Fetch GET error:', err);
      throw err;
    }
  },

  /**
   * Mengirim request POST ke Google Apps Script
   */
  async postToGAS(action, payload) {
    if (!APP_CONFIG.GAS_URL || APP_CONFIG.GAS_URL.trim() === '') {
      throw new Error('Alamat GAS_URL belum diatur di js/config.js. Harap lakukan deploy Apps Script terlebih dahulu.');
    }

    try {
      const response = await fetch(APP_CONFIG.GAS_URL, {
        method: 'POST',
        // ⚠️ WAJIB text/plain;charset=utf-8 agar browser tidak memicu CORS Preflight OPTIONS
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: action,
          data: payload
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Operasi gagal diproses oleh server');
      }

      return result;
    } catch (err) {
      console.error('Fetch POST error:', err);
      throw err;
    }
  },

  /**
   * Simpan transaksi baru
   */
  async saveTransaction(transactionData) {
    return await this.postToGAS('saveTransaction', transactionData);
  },

  /**
   * Update transaksi yang sudah ada
   */
  async updateTransaction(transactionData) {
    return await this.postToGAS('updateTransaction', transactionData);
  },

  /**
   * Hapus transaksi
   */
  async deleteTransaction(transactionId) {
    return await this.postToGAS('deleteTransaction', { id: transactionId });
  },

  /**
   * Data simulasi demo jika pengguna belum menghubungkan GAS_URL
   */
  getLocalDemoData() {
    return {
      summary: {
        saldo: 3450000,
        totalMasuk: 5200000,
        totalKeluar: 1750000,
        countMasuk: 38,
        countKeluar: 6,
        totalTransaksi: 44,
        terakhirDiperbarui: new Date().toISOString()
      },
      chart: {
        rasio: {
          masuk: 5200000,
          keluar: 1750000,
          persenMasuk: 75,
          persenKeluar: 25
        },
        bulanan: [
          { bulan: '2026-06', labelBulan: 'Jun', masuk: 1800000, keluar: 600000 },
          { bulan: '2026-07', labelBulan: 'Jul', masuk: 2100000, keluar: 800000 },
          { bulan: '2026-08', labelBulan: 'Agu', masuk: 2400000, keluar: 950000 },
          { bulan: '2026-09', labelBulan: 'Sep', masuk: 2200000, keluar: 700000 },
          { bulan: '2026-10', labelBulan: 'Okt', masuk: 2600000, keluar: 900000 },
          { bulan: '2026-11', labelBulan: 'Nov', masuk: 5200000, keluar: 1750000 }
        ]
      },
      transaksi: [
        {
          id: '#SKIL-202611-008',
          tanggal: '2026-11-19',
          tipe: 'Keluar',
          nominal: 800000,
          keterangan: 'Santunan Medis RSUD (Rawat Inap) — Penerima: Ibu Endang Wahyuni (Guru Bahasa Inggris)',
          urlBukti: '',
          driveFileId: ''
        },
        {
          id: '#SKIL-202611-007',
          tanggal: '2026-11-18',
          tipe: 'Masuk',
          nominal: 500000,
          keterangan: 'Iuran spontan jenguk Bu Rahma (10 Guru Matematika & IPA) — Penyetor: Pak Doni Hendrawan',
          urlBukti: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop',
          driveFileId: 'demo-img-1'
        },
        {
          id: '#SKIL-202611-006',
          tanggal: '2026-11-15',
          tipe: 'Keluar',
          nominal: 350000,
          keterangan: 'Beli parcel buah RSUD & amplop santunan Bu Rahma — Penyalur: Bu Siti Khadijah (Bendahara)',
          urlBukti: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop',
          driveFileId: 'demo-img-2'
        },
        {
          id: '#SKIL-202611-005',
          tanggal: '2026-11-14',
          tipe: 'Masuk',
          nominal: 1200000,
          keterangan: 'Sedekah Jumat berkah kolektif guru wali kelas VII — Penyetor: Bu Linda Hartati',
          urlBukti: '',
          driveFileId: ''
        },
        {
          id: '#SKIL-202611-004',
          tanggal: '2026-11-11',
          tipe: 'Masuk',
          nominal: 450000,
          keterangan: 'Solidaritas Rumpun MGMP IPA (Kolektif 6 Guru Mata Pelajaran IPA)',
          urlBukti: '',
          driveFileId: ''
        },
        {
          id: '#SKIL-202611-003',
          tanggal: '2026-11-10',
          tipe: 'Keluar',
          nominal: 600000,
          keterangan: 'Santunan duka cita keluarga alm. Pak Joko (Guru Olahraga) — Diserahkan langsung ke rumah duka',
          urlBukti: '',
          driveFileId: ''
        },
        {
          id: '#SKIL-202611-002',
          tanggal: '2026-11-05',
          tipe: 'Masuk',
          nominal: 750000,
          keterangan: 'Iuran kas bulanan Paguyuban Guru BK & Tata Usaha — Penyetor: Bu Anisa Dewi',
          urlBukti: '',
          driveFileId: ''
        },
        {
          id: '#SKIL-202611-001',
          tanggal: '2026-11-01',
          tipe: 'Masuk',
          nominal: 200000,
          keterangan: 'Sedekah Kilat Awal Bulan — Donatur: Ibu Siti Rahmah, S.Pd.I (Guru PAI)',
          urlBukti: '',
          driveFileId: ''
        }
      ]
    };
  }
};
