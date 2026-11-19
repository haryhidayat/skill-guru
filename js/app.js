/**
 * ============================================================================
 * SEDEKAH KILAT GURU (SKIL GURU) — APPLICATION CONTROLLER
 * ============================================================================
 * Mengatur UI, navigasi role (Admin vs Kepsek), Chart.js, kompresi foto canvas,
 * modal dialog, dan integrasi API REST Google Apps Script.
 * ============================================================================
 */

// Application State
const AppState = {
  currentRole: 'admin', // 'admin' atau 'kepsek'
  data: null,
  filteredTransactions: [],
  searchQuery: '',
  filterType: 'all',
  filterMonth: 'all',
  selectedTransaction: null,
  charts: {
    donut: null,
    bar: null
  },
  compressedUpload: {
    masuk: null,
    keluar: null,
    edit: null
  }
};

// ============================================================================
// 1. INISIALISASI APLIKASI
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Deteksi Role dari URL Parameter (?view=kepsek)
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');
  if (viewParam === 'kepsek') {
    AppState.currentRole = 'kepsek';
  } else {
    AppState.currentRole = 'admin';
  }

  // 2. Setup Event Listeners
  setupEventListeners();

  // 3. Load Data Pertama Kali
  await loadApplicationData();
});

// ============================================================================
// 2. SETUP EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
  // Role Toggles (Admin vs Kepsek)
  document.getElementById('tab-admin')?.addEventListener('click', () => switchRole('admin'));
  document.getElementById('tab-kepsek')?.addEventListener('click', () => switchRole('kepsek'));

  // Header Actions
  document.getElementById('btn-sync')?.addEventListener('click', () => loadApplicationData(true));
  document.getElementById('btn-copy-kepsek')?.addEventListener('click', copyKepsekLink);

  // Quick Action Buttons (Admin)
  document.getElementById('btn-catat-masuk')?.addEventListener('click', () => openModal('modal-masuk'));
  document.getElementById('btn-catat-keluar')?.addEventListener('click', () => openModal('modal-keluar'));
  document.getElementById('btn-mobile-masuk')?.addEventListener('click', () => openModal('modal-masuk'));
  document.getElementById('btn-mobile-keluar')?.addEventListener('click', () => openModal('modal-keluar'));

  // Search & Filter
  document.getElementById('search-transaksi')?.addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value.toLowerCase();
    applyFilters();
  });

  document.getElementById('filter-kategori')?.addEventListener('change', (e) => {
    AppState.filterType = e.target.value;
    applyFilters();
  });

  document.getElementById('filter-bulan')?.addEventListener('change', (e) => {
    AppState.filterMonth = e.target.value;
    applyFilters();
  });

  // Modal Closers
  document.querySelectorAll('.modal-close-trigger').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });

  // Close modal when clicking outside
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Preset Chips Nominal Uang Masuk
  setupPresetChips();

  // Terbilang Nominal Realtime
  setupTerbilangInput('keluar-nominal', 'keluar-terbilang');
  setupTerbilangInput('masuk-nominal', 'masuk-terbilang');

  // File Upload & Compression
  setupImageCompressionInput('masuk-file', 'masuk-dropzone', 'masuk-preview', 'masuk');
  setupImageCompressionInput('keluar-file', 'keluar-dropzone', 'keluar-preview', 'keluar');
  setupImageCompressionInput('edit-file', 'edit-dropzone', 'edit-preview', 'edit');

  // Form Submissions
  document.getElementById('form-masuk')?.addEventListener('submit', handleFormMasukSubmit);
  document.getElementById('form-keluar')?.addEventListener('submit', handleFormKeluarSubmit);
  document.getElementById('form-edit')?.addEventListener('submit', handleFormEditSubmit);
  document.getElementById('btn-confirm-delete')?.addEventListener('click', handleConfirmDelete);
  document.getElementById('btn-trigger-delete')?.addEventListener('click', () => {
    closeModal('modal-edit');
    openDeleteConfirmModal(AppState.selectedTransaction);
  });
}

// ============================================================================
// 3. LOAD DATA & RENDER CONTROLLER
// ============================================================================
async function loadApplicationData(nocache = false) {
  showLoading(true);
  try {
    const data = await API.getKasData(nocache);
    AppState.data = data;
    AppState.filteredTransactions = data.transaksi || [];

    // Render Komponen
    renderRoleInterface();
    renderSummaryCards(data.summary);
    renderCharts(data.chart);
    populateMonthFilter(data.transaksi || []);
    applyFilters();

    if (nocache) {
      showToast('Data kas berhasil disinkronkan langsung dari Google Sheets!', 'success');
    }
  } catch (err) {
    console.error(err);
    showToast('Gagal memuat data: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

function switchRole(role) {
  AppState.currentRole = role;
  
  // Update browser URL tanpa refresh
  const url = new URL(window.location);
  if (role === 'kepsek') {
    url.searchParams.set('view', 'kepsek');
  } else {
    url.searchParams.delete('view');
  }
  window.history.pushState({}, '', url);

  renderRoleInterface();
  applyFilters(); // Re-render tabel sesuai role
}

function renderRoleInterface() {
  const isKepsek = AppState.currentRole === 'kepsek';

  // Toggle Tab Styles
  const tabAdmin = document.getElementById('tab-admin');
  const tabKepsek = document.getElementById('tab-kepsek');
  const roleBadge = document.getElementById('header-role-badge');
  const kepsekBanner = document.getElementById('kepsek-banner');
  const quickActionBar = document.getElementById('quick-action-bar');
  const mobileThumbBar = document.getElementById('mobile-thumb-bar');

  if (tabAdmin && tabKepsek) {
    tabAdmin.classList.toggle('active', !isKepsek);
    tabKepsek.classList.toggle('active', isKepsek);
  }

  if (roleBadge) {
    if (isKepsek) {
      roleBadge.className = 'role-pill kepsek';
      roleBadge.innerHTML = '👁️ MODE: KEPALA SEKOLAH (PANTAU)';
    } else {
      roleBadge.className = 'role-pill';
      roleBadge.innerHTML = '🔑 MODE: GURU ADMIN (KELOLA)';
    }
  }

  if (kepsekBanner) {
    kepsekBanner.classList.toggle('show', isKepsek);
  }

  // Sembunyikan tombol input kilat dan mobile thumb bar saat mode Kepsek
  if (quickActionBar) {
    quickActionBar.style.display = isKepsek ? 'none' : 'flex';
  }
  if (mobileThumbBar) {
    mobileThumbBar.style.display = isKepsek ? 'none' : 'flex';
  }
}

// ============================================================================
// 4. RENDER SUMMARY STAT CARDS
// ============================================================================
function renderSummaryCards(summary) {
  if (!summary) return;

  const elSaldo = document.getElementById('stat-saldo');
  const elMasuk = document.getElementById('stat-masuk');
  const elKeluar = document.getElementById('stat-keluar');
  const elMetaMasuk = document.getElementById('stat-meta-masuk');
  const elMetaKeluar = document.getElementById('stat-meta-keluar');
  const elMetaSaldo = document.getElementById('stat-meta-saldo');

  if (elSaldo) elSaldo.textContent = formatRupiah(summary.saldo);
  if (elMasuk) elMasuk.textContent = formatRupiah(summary.totalMasuk);
  if (elKeluar) elKeluar.textContent = formatRupiah(summary.totalKeluar);

  if (elMetaMasuk) elMetaMasuk.textContent = `${summary.countMasuk || 0} donasi / iuran spontan`;
  if (elMetaKeluar) elMetaKeluar.textContent = `Untuk ${summary.countKeluar || 0} kegiatan / santunan`;
  if (elMetaSaldo) {
    const timeStr = summary.terakhirDiperbarui 
      ? new Date(summary.terakhirDiperbarui).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
      : 'Realtime';
    elMetaSaldo.textContent = `Update: ${timeStr}`;
  }
}

// ============================================================================
// 5. RENDER CHARTS (CHART.JS)
// ============================================================================
function renderCharts(chartData) {
  if (!chartData || typeof Chart === 'undefined') return;

  // 1. Donut Chart: Komposisi Pemasukan vs Pengeluaran
  const ctxDonut = document.getElementById('chartDonut')?.getContext('2d');
  if (ctxDonut) {
    if (AppState.charts.donut) AppState.charts.donut.destroy();

    const masuk = chartData.rasio.masuk || 0;
    const keluar = chartData.rasio.keluar || 0;

    AppState.charts.donut = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['Uang Masuk (Sedekah)', 'Pengeluaran (Santunan)'],
        datasets: [{
          data: [masuk, keluar],
          backgroundColor: ['#10B981', '#F43F5E'],
          hoverBackgroundColor: ['#059669', '#E11D48'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { family: 'Inter', size: 11, weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return ` ${context.label}: ${formatRupiah(context.raw)}`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // 2. Bar Chart: Tren Bulanan
  const ctxBar = document.getElementById('chartBar')?.getContext('2d');
  if (ctxBar) {
    if (AppState.charts.bar) AppState.charts.bar.destroy();

    const bulanan = chartData.bulanan || [];
    const labels = bulanan.map(b => b.labelBulan);
    const dataMasuk = bulanan.map(b => b.masuk);
    const dataKeluar = bulanan.map(b => b.keluar);

    AppState.charts.bar = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Masuk',
            data: dataMasuk,
            backgroundColor: '#10B981',
            borderRadius: 6
          },
          {
            label: 'Keluar',
            data: dataKeluar,
            backgroundColor: '#F43F5E',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 10,
              font: { family: 'Inter', size: 11, weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return ` ${context.dataset.label}: ${formatRupiah(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(226, 232, 240, 0.7)' },
            ticks: {
              font: { family: 'JetBrains Mono', size: 10 },
              callback: function (val) {
                if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                if (val >= 1000) return (val / 1000) + 'k';
                return val;
              }
            }
          }
        }
      }
    });
  }
}

// ============================================================================
// 6. FILTER & RENDER DATA TABLE
// ============================================================================
function populateMonthFilter(transaksiList) {
  const select = document.getElementById('filter-bulan');
  if (!select) return;

  const currentSelection = select.value;
  const months = new Set();

  transaksiList.forEach(t => {
    if (t.tanggal) {
      months.add(t.tanggal.substring(0, 7)); // '2026-11'
    }
  });

  const sorted = Array.from(months).sort().reverse();
  select.innerHTML = '<option value="all">Semua Bulan</option>';

  sorted.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = formatMonthString(m);
    select.appendChild(opt);
  });

  select.value = currentSelection || 'all';
}

function applyFilters() {
  if (!AppState.data || !AppState.data.transaksi) return;

  let list = [...AppState.data.transaksi];

  // 1. Filter Kategori (Masuk / Keluar)
  if (AppState.filterType !== 'all') {
    list = list.filter(t => t.tipe.toLowerCase() === AppState.filterType.toLowerCase());
  }

  // 2. Filter Bulan
  if (AppState.filterMonth !== 'all') {
    list = list.filter(t => t.tanggal && t.tanggal.startsWith(AppState.filterMonth));
  }

  // 3. Search Query
  if (AppState.searchQuery.trim() !== '') {
    const q = AppState.searchQuery.trim();
    list = list.filter(t => 
      (t.keterangan && t.keterangan.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.tanggal && t.tanggal.includes(q)) ||
      String(t.nominal).includes(q)
    );
  }

  AppState.filteredTransactions = list;
  renderTable(list);
}

function renderTable(list) {
  const tbody = document.getElementById('ledger-tbody');
  const elCounter = document.getElementById('ledger-counter');
  const isKepsek = AppState.currentRole === 'kepsek';

  if (elCounter) {
    const total = AppState.data ? AppState.data.transaksi.length : 0;
    elCounter.textContent = `Menampilkan ${list.length} dari ${total} transaksi`;
  }

  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state-icon">📂</div>
            <h4>Belum Ada Catatan Transaksi</h4>
            <p>Tidak ditemukan mutasi kas sesuai filter atau pencarian Anda.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const isMasuk = item.tipe.toLowerCase() === 'masuk';
    const badgeClass = isMasuk ? 'masuk' : 'keluar';
    const badgeLabel = isMasuk ? '+ Masuk' : '- Keluar';
    const nominalClass = isMasuk ? 'masuk' : 'keluar';
    const nominalPrefix = isMasuk ? '+ ' : '- ';

    // Tombol Lihat Nota
    let buktiHtml = '<span class="text-muted" style="font-size:0.75rem;">-</span>';
    if (item.urlBukti && item.urlBukti.trim() !== '') {
      buktiHtml = `
        <button class="btn-proof" onclick="openLightbox('${item.urlBukti}', '${escapeQuotes(item.keterangan)}')">
          🖼️ Lihat Nota
        </button>
      `;
    }

    // Kolom Aksi (Khusus Admin)
    let actionHtml = '';
    if (!isKepsek) {
      actionHtml = `
        <td>
          <div class="action-buttons">
            <button class="btn-icon" title="Edit Transaksi" onclick="openEditModal('${item.id}')">✏️</button>
            <button class="btn-icon delete" title="Hapus Transaksi" onclick="openDeleteConfirmModal('${item.id}')">🗑️</button>
          </div>
        </td>
      `;
    }

    return `
      <tr>
        <td style="white-space:nowrap; font-weight:600; color:var(--text-secondary);">${formatDisplayDate(item.tanggal)}</td>
        <td><span class="type-badge ${badgeClass}">${badgeLabel}</span></td>
        <td class="nominal-cell ${nominalClass}">${nominalPrefix}${formatRupiah(item.nominal)}</td>
        <td>
          <div style="font-weight:500;">${escapeHtml(item.keterangan)}</div>
          <span class="ref-code">${item.id}</span>
        </td>
        <td>${buktiHtml}</td>
        ${actionHtml}
      </tr>
    `;
  }).join('');

  // Toggle Header Kolom Aksi di THEAD
  const thAksi = document.getElementById('th-aksi');
  if (thAksi) {
    thAksi.style.display = isKepsek ? 'none' : 'table-cell';
  }
}

// ============================================================================
// 7. IMAGE COMPRESSION ENGINE (CLIENT-SIDE HTML5 CANVAS)
// ============================================================================
function setupImageCompressionInput(inputId, dropzoneId, previewId, key) {
  const fileInput = document.getElementById(inputId);
  const dropzone = document.getElementById(dropzoneId);
  const previewContainer = document.getElementById(previewId);

  if (!fileInput || !dropzone) return;

  // Klik dropzone memicu input file
  dropzone.addEventListener('click', () => fileInput.click());

  // Drag and drop event
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '#BAE6FD';
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#BAE6FD';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0], previewContainer, key);
    }
  });

  // File dipilih via kamera/picker
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0], previewContainer, key);
    }
  });
}

async function processImageFile(file, previewContainer, key) {
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih file berupa gambar atau foto kuitansi/nota.', 'error');
    return;
  }

  showLoading(true);
  try {
    const compressed = await compressImage(file, APP_CONFIG.COMPRESSION.MAX_WIDTH, APP_CONFIG.COMPRESSION.QUALITY);
    AppState.compressedUpload[key] = compressed;

    if (previewContainer) {
      previewContainer.style.display = 'flex';
      previewContainer.innerHTML = `
        <img class="image-preview-thumbnail" src="${compressed.dataUrl}" alt="Preview Nota" />
        <div style="flex:1;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary);">${escapeHtml(file.name)}</div>
          <div class="compression-badge">
            ⚡ Kompresi: ${(file.size / 1024).toFixed(0)} KB ➔ ${(compressed.size / 1024).toFixed(0)} KB (-${compressed.ratio}%)
          </div>
        </div>
        <button type="button" class="btn-icon delete" title="Hapus foto" onclick="removeImageUpload('${key}', '${previewContainer.id}')">✕</button>
      `;
    }
    showToast('Foto nota berhasil dikompres otomatis!', 'info');
  } catch (err) {
    console.error(err);
    showToast('Gagal memproses gambar: ' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

function removeImageUpload(key, containerId) {
  AppState.compressedUpload[key] = null;
  const container = document.getElementById(containerId);
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const head = 'data:image/jpeg;base64,';
        const base64Content = dataUrl.substring(head.length);
        const compressedSize = Math.round((base64Content.length * 3) / 4);
        const ratio = Math.max(0, Math.round(((file.size - compressedSize) / file.size) * 100));

        resolve({
          dataUrl: dataUrl,
          base64: base64Content,
          fileName: file.name,
          size: compressedSize,
          ratio: ratio
        });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// ============================================================================
// 8. FORM HANDLERS (MASUK, KELUAR, EDIT, DELETE)
// ============================================================================
async function handleFormMasukSubmit(e) {
  e.preventDefault();
  const btn = e.submitter || document.getElementById('btn-submit-masuk');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const nominalVal = parseInt(document.getElementById('masuk-nominal').value.replace(/\D/g, ''), 10) || 0;
  const payload = {
    tanggal: document.getElementById('masuk-tanggal').value,
    tipe: 'Masuk',
    nominal: nominalVal,
    keterangan: document.getElementById('masuk-keterangan').value,
    fileBase64: AppState.compressedUpload.masuk ? AppState.compressedUpload.masuk.base64 : '',
    fileName: AppState.compressedUpload.masuk ? AppState.compressedUpload.masuk.fileName : ''
  };

  if (payload.nominal <= 0) {
    showToast('Nominal uang masuk wajib diisi!', 'error');
    btn.disabled = false;
    btn.textContent = 'Simpan Uang Masuk';
    return;
  }

  showLoading(true);
  try {
    const res = await API.saveTransaction(payload);
    showToast(res.message || 'Uang masuk berhasil dicatat!', 'success');
    closeModal('modal-masuk');
    e.target.reset();
    removeImageUpload('masuk', 'masuk-preview');
    await loadApplicationData(true);
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Uang Masuk';
    showLoading(false);
  }
}

async function handleFormKeluarSubmit(e) {
  e.preventDefault();
  const btn = e.submitter || document.getElementById('btn-submit-keluar');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const nominalVal = parseInt(document.getElementById('keluar-nominal').value.replace(/\D/g, ''), 10) || 0;
  const payload = {
    tanggal: document.getElementById('keluar-tanggal').value,
    tipe: 'Keluar',
    nominal: nominalVal,
    keterangan: document.getElementById('keluar-keterangan').value,
    fileBase64: AppState.compressedUpload.keluar ? AppState.compressedUpload.keluar.base64 : '',
    fileName: AppState.compressedUpload.keluar ? AppState.compressedUpload.keluar.fileName : ''
  };

  if (payload.nominal <= 0) {
    showToast('Nominal pengeluaran wajib diisi!', 'error');
    btn.disabled = false;
    btn.textContent = 'Simpan Pengeluaran Kas';
    return;
  }

  showLoading(true);
  try {
    const res = await API.saveTransaction(payload);
    showToast(res.message || 'Pengeluaran kas berhasil dicatat!', 'success');
    closeModal('modal-keluar');
    e.target.reset();
    removeImageUpload('keluar', 'keluar-preview');
    await loadApplicationData(true);
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Pengeluaran Kas';
    showLoading(false);
  }
}

async function handleFormEditSubmit(e) {
  e.preventDefault();
  const btn = e.submitter || document.getElementById('btn-submit-edit');
  btn.disabled = true;
  btn.textContent = 'Memperbarui...';

  const nominalVal = parseInt(document.getElementById('edit-nominal').value.replace(/\D/g, ''), 10) || 0;
  const payload = {
    id: document.getElementById('edit-id').value,
    tanggal: document.getElementById('edit-tanggal').value,
    tipe: document.getElementById('edit-tipe').value,
    nominal: nominalVal,
    keterangan: document.getElementById('edit-keterangan').value,
    fileBase64: AppState.compressedUpload.edit ? AppState.compressedUpload.edit.base64 : '',
    fileName: AppState.compressedUpload.edit ? AppState.compressedUpload.edit.fileName : ''
  };

  showLoading(true);
  try {
    const res = await API.updateTransaction(payload);
    showToast(res.message || 'Transaksi berhasil diperbarui!', 'success');
    closeModal('modal-edit');
    removeImageUpload('edit', 'edit-preview');
    await loadApplicationData(true);
  } catch (err) {
    showToast('Gagal memperbarui: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Perubahan';
    showLoading(false);
  }
}

async function handleConfirmDelete() {
  if (!AppState.selectedTransaction) return;

  const btn = document.getElementById('btn-confirm-delete');
  btn.disabled = true;
  btn.textContent = 'Menghapus...';

  showLoading(true);
  try {
    const res = await API.deleteTransaction(AppState.selectedTransaction.id);
    showToast(res.message || 'Transaksi berhasil dihapus!', 'success');
    closeModal('modal-delete');
    await loadApplicationData(true);
  } catch (err) {
    showToast('Gagal menghapus: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ya, Hapus Data';
    showLoading(false);
  }
}

// ============================================================================
// 9. MODAL CONTROLLERS & EDIT/DELETE DIALOGS
// ============================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // Isi default tanggal hari ini
    const today = new Date().toISOString().substring(0, 10);
    const dateInput = modal.querySelector('input[type="date"]');
    if (dateInput && !dateInput.value) {
      dateInput.value = today;
    }
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function openEditModal(transactionId) {
  const tx = AppState.data.transaksi.find(t => t.id === transactionId);
  if (!tx) return;

  AppState.selectedTransaction = tx;

  document.getElementById('edit-id').value = tx.id;
  document.getElementById('edit-ref-display').textContent = tx.id;
  document.getElementById('edit-tanggal').value = tx.tanggal;
  document.getElementById('edit-tipe').value = tx.tipe;
  document.getElementById('edit-nominal').value = formatRupiahNumber(tx.nominal);
  document.getElementById('edit-keterangan').value = tx.keterangan;

  // Pratinjau Bukti Foto yang sudah ada
  const existingProofBox = document.getElementById('edit-existing-proof');
  if (tx.urlBukti) {
    existingProofBox.style.display = 'block';
    existingProofBox.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.82rem; padding:0.5rem; background:#F8FAFC; border-radius:8px; border:1px solid #E2E8F0;">
        <span>🖼️ Bukti tersimpan</span>
        <a href="${tx.urlBukti}" target="_blank" style="color:var(--primary); font-weight:600; text-decoration:none;">Buka Foto ↗</a>
      </div>
    `;
  } else {
    existingProofBox.style.display = 'none';
  }

  openModal('modal-edit');
}

function openDeleteConfirmModal(transactionIdOrObj) {
  let tx = typeof transactionIdOrObj === 'object' 
    ? transactionIdOrObj 
    : AppState.data.transaksi.find(t => t.id === transactionIdOrObj);

  if (!tx) return;

  AppState.selectedTransaction = tx;

  document.getElementById('delete-tx-id').textContent = tx.id;
  document.getElementById('delete-tx-keterangan').textContent = tx.keterangan;
  document.getElementById('delete-tx-nominal').textContent = `${formatRupiah(tx.nominal)} (${tx.tipe.toUpperCase()})`;

  openModal('modal-delete');
}

function openLightbox(imageUrl, caption) {
  const modal = document.getElementById('modal-lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');

  if (img) img.src = imageUrl;
  if (cap) cap.textContent = caption;

  openModal('modal-lightbox');
}

// ============================================================================
// 10. HELPER FUNCTIONS & FORMATTERS
// ============================================================================
function setupPresetChips() {
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('masuk-nominal');
      const val = chip.getAttribute('data-val');

      if (val === 'clear') {
        input.value = '';
      } else {
        const current = parseInt(input.value.replace(/\D/g, ''), 10) || 0;
        const add = parseInt(val, 10);
        input.value = formatRupiahNumber(current + add);
      }

      // Trigger event update terbilang
      input.dispatchEvent(new Event('input'));
    });
  });
}

function setupTerbilangInput(inputId, helperId) {
  const input = document.getElementById(inputId);
  const helper = document.getElementById(helperId);

  if (!input || !helper) return;

  input.addEventListener('input', (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw === '') {
      helper.textContent = '';
      return;
    }

    const num = parseInt(raw, 10);
    e.target.value = formatRupiahNumber(num);
    helper.textContent = terbilang(num) + ' rupiah';
  });
}

function formatRupiah(num) {
  return 'Rp ' + formatRupiahNumber(num);
}

function formatRupiahNumber(num) {
  if (isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonthString(m) {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const parts = m.split('-');
  if (parts.length === 2) {
    const idx = parseInt(parts[1], 10) - 1;
    if (idx >= 0 && idx < 12) {
      return months[idx] + ' ' + parts[0];
    }
  }
  return m;
}

function copyKepsekLink() {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('view', 'kepsek');
  navigator.clipboard.writeText(url.toString()).then(() => {
    showToast('Tautan resmi Kepala Sekolah berhasil disalin ke clipboard!', 'info');
  }).catch(() => {
    showToast('Gagal menyalin tautan: ' + url.toString(), 'error');
  });
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showLoading(show = true) {
  const el = document.getElementById('loading-overlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeQuotes(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Algoritma Terbilang Bahasa Indonesia
function terbilang(bilangan) {
  bilangan = Math.abs(bilangan);
  const angka = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  let hasil = '';

  if (bilangan < 12) {
    hasil = ' ' + angka[bilangan];
  } else if (bilangan < 20) {
    hasil = terbilang(bilangan - 10) + ' belas';
  } else if (bilangan < 100) {
    hasil = terbilang(Math.floor(bilangan / 10)) + ' puluh' + terbilang(bilangan % 10);
  } else if (bilangan < 200) {
    hasil = ' seratus' + terbilang(bilangan - 100);
  } else if (bilangan < 1000) {
    hasil = terbilang(Math.floor(bilangan / 100)) + ' ratus' + terbilang(bilangan % 100);
  } else if (bilangan < 2000) {
    hasil = ' seribu' + terbilang(bilangan - 1000);
  } else if (bilangan < 1000000) {
    hasil = terbilang(Math.floor(bilangan / 1000)) + ' ribu' + terbilang(bilangan % 1000);
  } else if (bilangan < 1000000000) {
    hasil = terbilang(Math.floor(bilangan / 1000000)) + ' juta' + terbilang(bilangan % 1000000);
  } else if (bilangan < 1000000000000) {
    hasil = terbilang(Math.floor(bilangan / 1000000000)) + ' miliar' + terbilang(bilangan % 1000000000);
  }

  return hasil.trim();
}
