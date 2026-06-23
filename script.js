// ============ DATA LAYER (Simulasi Database) ============
const STORAGE_KEY = 'findash_pro_data';
const USERS_KEY = 'findash_pro_users';
const SESSION_KEY = 'findash_pro_session';

// Kode rahasia untuk mendaftar sebagai Admin
const ADMIN_SECRET_CODE = 'ADMIN123';

const defaultUsers = [
    { id: 'u1', name: 'Admin Utama', email: 'admin@perusahaan.com', password: 'admin123', role: 'admin', createdAt: '2024-01-01' },
    { id: 'u2', name: 'Staff Keuangan', email: 'staff@perusahaan.com', password: 'staff123', role: 'staff', createdAt: '2024-02-15' },
];

const sampleTransactions = [
    { id: 'TRX001', name: 'Pembayaran Klien PT Maju', date: '2026-06-20', type: 'income', amount: 15000000, paymentMethod: 'Transfer Bank', description: 'Pelunasan invoice #INV-042', status: 'Selesai', createdAt: '2026-06-20T10:30:00' },
    { id: 'TRX002', name: 'Pembelian ATK Bulanan', date: '2026-06-19', type: 'expense', amount: 850000, paymentMethod: 'QRIS', description: 'Kertas, pulpen, map, tinta printer', status: 'Selesai', createdAt: '2026-06-19T14:15:00' },
    { id: 'TRX003', name: 'Langganan Software SaaS', date: '2026-06-18', type: 'expense', amount: 2400000, paymentMethod: 'Kartu Kredit', description: 'Subscription bulanan tools desain', status: 'Selesai', createdAt: '2026-06-18T09:00:00' },
    { id: 'TRX004', name: 'Pendapatan Proyek Website', date: '2026-06-17', type: 'income', amount: 35000000, paymentMethod: 'Transfer Bank', description: 'Proyek website company profile', status: 'Selesai', createdAt: '2026-06-17T16:45:00' },
    { id: 'TRX005', name: 'Biaya Listrik & Internet', date: '2026-06-16', type: 'expense', amount: 1200000, paymentMethod: 'E-Wallet', description: 'Tagihan bulan Juni', status: 'Selesai', createdAt: '2026-06-16T11:00:00' },
    { id: 'TRX006', name: 'Konsultasi Bisnis', date: '2026-06-22', type: 'income', amount: 5000000, paymentMethod: 'Tunai', description: 'Sesi konsultasi manajemen', status: 'Selesai', createdAt: '2026-06-22T08:30:00' },
    { id: 'TRX007', name: 'Sewa Ruang Meeting', date: '2026-06-21', type: 'expense', amount: 600000, paymentMethod: 'Transfer Bank', description: 'Sewa ruangan untuk presentasi klien', status: 'Pending', createdAt: '2026-06-21T13:00:00' },
];

function getUsers() {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    return [...defaultUsers];
}

function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function getTransactions() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleTransactions));
    return [...sampleTransactions];
}
function saveTransactions(transactions) { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
function getSession() { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
function saveSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

// ============ APP STATE ============
let currentUser = getSession();
let transactions = getTransactions();
let currentPage = 'dashboard';
let barChartInstance = null; 
let pieChartInstance = null;
let isDarkMode = localStorage.getItem('findash_darkmode') === 'true';
let chartFilter = { start: null, end: null };
let transactionFilterType = 'all';
let currentChartType = localStorage.getItem('findash_chartType') || 'bar';
// DOM elements
const $loginPage = document.getElementById('loginPage');
const $mainDashboard = document.getElementById('mainDashboard');
const $loginForm = document.getElementById('loginForm');
const $registerForm = document.getElementById('registerForm');
const $tabLogin = document.getElementById('tabLogin');
const $tabRegister = document.getElementById('tabRegister');
const $sidebar = document.getElementById('sidebar');
const $sidebarOverlay = document.getElementById('sidebarOverlay');
const $pageTitle = document.getElementById('pageTitle');
const $toastContainer = document.getElementById('toastContainer');

// ============ TOGGLE ADMIN CODE ============
function toggleAdminCode() {
    const regRole = document.getElementById('regRole');
    const adminCodeSection = document.getElementById('adminCodeSection');
    if (regRole && adminCodeSection) {
        if (regRole.value === 'admin') {
            adminCodeSection.classList.remove('hidden');
        } else {
            adminCodeSection.classList.add('hidden');
        }
    }
}

// ============ INIT ============
function init() {
    console.warn('🔒 PERINGATAN: Aplikasi ini menggunakan localStorage. Untuk produksi, gunakan backend dengan enkripsi password (bcrypt) dan JWT.');
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        updateDarkModeUI();
    }
    if (currentUser) {
        showDashboard();
        updateSidebarUserInfo();
        refreshAllData();
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 6);
        document.getElementById('chartStartDate').value = lastWeek.toISOString().split('T')[0];
        document.getElementById('chartEndDate').value = today.toISOString().split('T')[0];
        applyChartFilter();
    } else {
        showLoginPage();
    }
    updateCurrentDate();
    setInterval(updateCurrentDate, 60000);

        // Inisialisasi pemilih tipe grafik
    const chartTypeSelector = document.getElementById('chartTypeSelector');
    if (chartTypeSelector) {
        chartTypeSelector.value = currentChartType;
        chartTypeSelector.addEventListener('change', function () {
            currentChartType = this.value;
            localStorage.setItem('findash_chartType', currentChartType);
            renderCharts();
        });
    }
    // Event listener untuk dropdown role
    const regRoleEl = document.getElementById('regRole');
    if (regRoleEl) {
        regRoleEl.addEventListener('change', toggleAdminCode);
        toggleAdminCode(); // sinkronisasi awal
    }

    // Saat tab Register diklik, pastikan tampilan kode admin sesuai
    $tabRegister.addEventListener('click', () => {
        setTimeout(toggleAdminCode, 0);
    });
}

function updateCurrentDate() {
    const el = document.getElementById('currentDate');
    if (el) el.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ============ AUTH ============
function showLoginPage() {
    $loginPage.style.display = 'flex';
    $mainDashboard.classList.add('hidden');
    $loginForm.classList.remove('hidden');
    $registerForm.classList.add('hidden');
    $tabLogin.classList.add('bg-white', 'dark:bg-gray-700', 'shadow', 'text-gray-900', 'dark:text-white');
    $tabLogin.classList.remove('text-gray-500', 'dark:text-gray-400');
    $tabRegister.classList.remove('bg-white', 'dark:bg-gray-700', 'shadow', 'text-gray-900', 'dark:text-white');
    $tabRegister.classList.add('text-gray-500', 'dark:text-gray-400');
}

function showDashboard() {
    $loginPage.style.display = 'none';
    $mainDashboard.classList.remove('hidden');
    navigateTo('dashboard');
}

$tabLogin.addEventListener('click', () => {
    $loginForm.classList.remove('hidden'); $registerForm.classList.add('hidden');
    $tabLogin.classList.add('bg-white', 'dark:bg-gray-700', 'shadow', 'text-gray-900', 'dark:text-white');
    $tabLogin.classList.remove('text-gray-500', 'dark:text-gray-400');
    $tabRegister.classList.remove('bg-white', 'dark:bg-gray-700', 'shadow', 'text-gray-900', 'dark:text-white');
    $tabRegister.classList.add('text-gray-500', 'dark:text-gray-400');
});

// $tabRegister event listener sudah ditangani di init() untuk toggleAdminCode, tapi kita perlu style juga
$tabRegister.addEventListener('click', () => {
    $registerForm.classList.remove('hidden'); $loginForm.classList.add('hidden');
    $tabRegister.classList.add('bg-white', 'dark:bg-gray-700', 'shadow', 'text-gray-900', 'dark:text-white');
    $tabRegister.classList.remove('text-gray-500', 'dark:text-gray-400');
    $tabLogin.classList.remove('bg-white', 'dark:bg-gray-700', 'shadow', 'text-gray-900', 'dark:text-white');
    $tabLogin.classList.add('text-gray-500', 'dark:text-gray-400');
});

$loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const users = getUsers();
    const user = users.find(u => (u.email === email) && u.password === password);
    if (user) {
        currentUser = user;
        saveSession(user);
        transactions = getTransactions();
        showDashboard();
        updateSidebarUserInfo();
        refreshAllData();
        const today = new Date();
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 6);
        document.getElementById('chartStartDate').value = lastWeek.toISOString().split('T')[0];
        document.getElementById('chartEndDate').value = today.toISOString().split('T')[0];
        applyChartFilter();
        showToast('success', 'Selamat datang, ' + user.name + '! 🎉');
    } else {
        showToast('error', 'Email atau password salah! ❌');
    }
});

$registerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const roleInput = document.getElementById('regRole')?.value || 'staff';
    const adminCode = document.getElementById('regAdminCode')?.value || '';

    let role = 'staff';
    if (roleInput === 'admin') {
        if (adminCode !== ADMIN_SECRET_CODE) {
            showToast('error', 'Kode Admin salah! Tidak bisa mendaftar sebagai Admin.');
            return;
        }
        role = 'admin';
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
        showToast('error', 'Email sudah terdaftar!');
        return;
    }
    const newUser = {
        id: 'u' + Date.now(),
        name,
        email,
        password,
        role,
        createdAt: new Date().toISOString().split('T')[0]
    };
    users.push(newUser);
    saveUsers(users);
    showToast('success', `Akun ${role === 'admin' ? 'Admin' : 'Staff'} berhasil dibuat! Silakan login.`);
    $tabLogin.click();
    document.getElementById('regName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regRole').value = 'staff';
    document.getElementById('regAdminCode').value = '';
    toggleAdminCode(); // reset sembunyi kode admin
});

// Lupa Password
document.getElementById('forgotPasswordLink').addEventListener('click', function() {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) {
        showToast('warning', 'Masukkan email terlebih dahulu.');
        return;
    }
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (user) {
        user.password = 'password123';
        saveUsers(users);
        showToast('success', 'Password untuk ' + email + ' berhasil direset menjadi "password123". Silakan login.');
    } else {
        showToast('error', 'Email tidak ditemukan.');
    }
});

function handleLogout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        clearSession();
        currentUser = null;
        showLoginPage();
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        showToast('info', 'Anda telah logout.');
    }
}

function updateSidebarUserInfo() {
    if (!currentUser) return;
    document.getElementById('sidebarUserInitial').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('sidebarUserName').textContent = currentUser.name;
    document.getElementById('sidebarUserRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Staff';
}

// ============ NAVIGATION ============
function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('page-' + page).classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active-nav', 'bg-gray-100', 'dark:bg-gray-800', 'text-brand-600', 'dark:text-brand-400'));
    const activeNav = document.querySelector(`[data-nav="${page}"]`);
    if (activeNav) {
        activeNav.classList.add('active-nav', 'bg-gray-100', 'dark:bg-gray-800', 'text-brand-600', 'dark:text-brand-400');
        activeNav.classList.remove('text-gray-700', 'dark:text-gray-300');
    }
    const titles = { dashboard: 'Dashboard', transactions: 'Transaksi', reports: 'Laporan', export: 'Export Excel' };
    $pageTitle.textContent = titles[page] || 'Dashboard';

    if (page === 'transactions') {
        transactionFilterType = 'all';
        const filterDropdown = document.getElementById('filterType');
        if (filterDropdown) filterDropdown.value = 'all';
    }

    if (page === 'dashboard') {
        updateDashboardStats();
        renderCharts();
        renderRecentTransactions();
    } else if (page === 'transactions') {
        renderAllTransactions();
    } else if (page === 'reports') {
        updateReportsPage();
    }

    if (window.innerWidth < 1024) {
        $sidebar.classList.remove('open');
        $sidebarOverlay.classList.remove('active');
    }
}

function toggleSidebar() {
    $sidebar.classList.toggle('open');
    $sidebarOverlay.classList.toggle('active');
}
$sidebarOverlay.addEventListener('click', () => {
    $sidebar.classList.remove('open');
    $sidebarOverlay.classList.remove('active');
});

// ============ CHART FILTER ============
function getFilteredTransactionsForChart() {
    let filtered = [...transactions];
    if (chartFilter.start) filtered = filtered.filter(t => t.date >= chartFilter.start);
    if (chartFilter.end) filtered = filtered.filter(t => t.date <= chartFilter.end);
    return filtered;
}

function applyChartFilter() {
    const startEl = document.getElementById('chartStartDate');
    const endEl = document.getElementById('chartEndDate');
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
    chartFilter.start = startEl.value || weekAgo;
    chartFilter.end = endEl.value || today;
    if (currentPage === 'dashboard') renderCharts();
}

function resetChartFilter() {
    document.getElementById('chartStartDate').value = '';
    document.getElementById('chartEndDate').value = '';
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
    chartFilter.start = weekAgo;
    chartFilter.end = today;
    if (currentPage === 'dashboard') renderCharts();
}

// ============ STATS ============
function updateDashboardStats() {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('statTotalTransaksi').textContent = transactions.length;
    document.getElementById('statTotalIncome').textContent = formatRupiah(totalIncome);
    document.getElementById('statTotalExpense').textContent = formatRupiah(totalExpense);
    document.getElementById('statNetBalance').textContent = formatRupiah(totalIncome - totalExpense);
}

function formatRupiah(amount) {
    if (amount >= 1000000) return 'Rp ' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return 'Rp ' + (amount / 1000).toFixed(0) + 'K';
    return 'Rp ' + amount.toLocaleString('id-ID');
}
function formatRupiahFull(amount) { return 'Rp ' + amount.toLocaleString('id-ID'); }

// ============ CHARTS ============
function renderCharts() {
    const filtered = getFilteredTransactionsForChart();
    renderMainChart(filtered);
    renderPieChart(filtered);
}

function renderMainChart(data) {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;
    if (barChartInstance) barChartInstance.destroy();

    // Tentukan rentang tanggal
    let startDate, endDate;
    if (chartFilter.start) {
        startDate = new Date(chartFilter.start);
    } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 6);
    }
    if (chartFilter.end) {
        endDate = new Date(chartFilter.end);
    } else {
        endDate = new Date();
    }

    // Bangun label dan data
    const days = [];
    const incomeData = [];
    const expenseData = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        days.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
        incomeData.push(data.filter(t => t.date === dateStr && t.type === 'income').reduce((s, t) => s + t.amount, 0));
        expenseData.push(data.filter(t => t.date === dateStr && t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    }

    // Siapkan dataset sesuai tipe chart
    const isBar = (currentChartType === 'bar');

    const datasetConfig = {
        labels: days,
        datasets: [
            {
                label: 'Pemasukan',
                data: incomeData,
                backgroundColor: isBar ? 'rgba(16,185,129,0.7)' : 'rgba(16,185,129,0.2)',
                borderColor: '#10b981',
                borderWidth: isBar ? 1 : 2,
                borderRadius: isBar ? 6 : 0,
                tension: 0.3,
                fill: !isBar
            },
            {
                label: 'Pengeluaran',
                data: expenseData,
                backgroundColor: isBar ? 'rgba(239,68,68,0.7)' : 'rgba(239,68,68,0.2)',
                borderColor: '#ef4444',
                borderWidth: isBar ? 1 : 2,
                borderRadius: isBar ? 6 : 0,
                tension: 0.3,
                fill: !isBar
            }
        ]
    };

    // Opsi grafik
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { usePointStyle: true, padding: 20, font: { size: 11 } }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { callback: v => formatRupiah(v) },
                grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
            },
            x: { grid: { display: false } }
        }
    };

    // Tambahkan opsi titik untuk line chart
    if (!isBar) {
        options.elements = { point: { radius: 3, hoverRadius: 5 } };
    }

    // Buat chart baru
    barChartInstance = new Chart(ctx, {
        type: currentChartType,
        data: datasetConfig,
        options: options
    });
}

function renderPieChart(data) {
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;
    if (pieChartInstance) pieChartInstance.destroy();

    const totalIncome = data.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pemasukan', 'Pengeluaran'],
            datasets: [{ data: [totalIncome || 1, totalExpense || 1], backgroundColor: ['#10b981', '#ef4444'], borderColor: isDarkMode ? '#1e293b' : '#ffffff', borderWidth: 3, hoverBorderWidth: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => formatRupiahFull(ctx.parsed) } } }
        }
    });
}

// ============ TRANSACTION TABLES ============
function renderRecentTransactions() {
    const tbody = document.getElementById('recentTransactionsTable');
    const recent = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">Belum ada transaksi</td></tr>';
        return;
    }
    tbody.innerHTML = recent.map(t => createTransactionRow(t, true)).join('');
}

function renderAllTransactions() {
    const tbody = document.getElementById('allTransactionsTable');
    const dropdown = document.getElementById('filterType');
    if (dropdown) {
        transactionFilterType = dropdown.value;
    }
    let filtered = [...transactions];
    if (transactionFilterType !== 'all') {
        filtered = filtered.filter(t => t.type === transactionFilterType);
    }
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-gray-400">Belum ada transaksi</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(t => createTransactionRow(t, false)).join('');
}

function createTransactionRow(t, isRecent) {
    const typeBadge = t.type === 'income' ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">💰 Income</span>' : '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">📤 Expense</span>';
    const statusBadge = t.status === 'Selesai' ? '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Selesai</span>' : '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</span>';
    const amountClass = t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    const amountPrefix = t.type === 'income' ? '+' : '-';
    const formattedDate = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    if (isRecent) {
        return `<tr class="table-row-hover border-b border-gray-50 dark:border-gray-800/50 transition-colors">
            <td class="px-5 py-3 font-mono text-xs text-gray-500">${t.id}</td>
            <td class="px-5 py-3 text-xs">${formattedDate}</td>
            <td class="px-5 py-3 font-medium text-gray-900 dark:text-white text-xs">${t.name}</td>
            <td class="px-5 py-3">${typeBadge}</td>
            <td class="px-5 py-3 font-semibold ${amountClass} text-xs">${amountPrefix} ${formatRupiahFull(t.amount)}</td>
            <td class="px-5 py-3">${statusBadge}</td>
            <td class="px-5 py-3 text-center">
                <button onclick="editTransaction('${t.id}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mx-1"><i class="fas fa-edit"></i></button>
                <button onclick="deleteTransaction('${t.id}')" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mx-1"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>`;
    }
    return `<tr class="table-row-hover border-b border-gray-50 dark:border-gray-800/50 transition-colors">
        <td class="px-5 py-3 font-mono text-xs text-gray-500">${t.id}</td>
        <td class="px-5 py-3 text-xs">${formattedDate}</td>
        <td class="px-5 py-3 font-medium text-gray-900 dark:text-white text-xs">${t.name}</td>
        <td class="px-5 py-3 text-xs text-gray-500 max-w-[120px] truncate">${t.description || '-'}</td>
        <td class="px-5 py-3">${typeBadge}</td>
        <td class="px-5 py-3 font-semibold ${amountClass} text-xs">${amountPrefix} ${formatRupiahFull(t.amount)}</td>
        <td class="px-5 py-3 text-xs">${t.paymentMethod}</td>
        <td class="px-5 py-3">${statusBadge}</td>
        <td class="px-5 py-3 text-center">
            <button onclick="editTransaction('${t.id}')" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mx-1"><i class="fas fa-edit"></i></button>
            <button onclick="deleteTransaction('${t.id}')" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mx-1"><i class="fas fa-trash-alt"></i></button>
        </td>
    </tr>`;
}

// ============ CRUD ============
function openAddTransactionModal() {
    document.getElementById('modalTitle').textContent = 'Tambah Transaksi Baru';
    document.getElementById('editTransactionId').value = '';
    document.getElementById('txName').value = '';
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('txType').value = 'income';
    document.getElementById('txAmount').value = '';
    document.getElementById('txPaymentMethod').value = 'Transfer Bank';
    document.getElementById('txDescription').value = '';
    document.getElementById('transactionModal').classList.add('flex');
    document.getElementById('transactionModal').classList.remove('hidden');
}

function editTransaction(id) {
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;
    document.getElementById('modalTitle').textContent = 'Edit Transaksi';
    document.getElementById('editTransactionId').value = t.id;
    document.getElementById('txName').value = t.name;
    document.getElementById('txDate').value = t.date;
    document.getElementById('txType').value = t.type;
    document.getElementById('txAmount').value = t.amount;
    document.getElementById('txPaymentMethod').value = t.paymentMethod;
    document.getElementById('txDescription').value = t.description || '';
    document.getElementById('transactionModal').classList.add('flex');
    document.getElementById('transactionModal').classList.remove('hidden');
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.add('hidden');
    document.getElementById('transactionModal').classList.remove('flex');
}

function deleteTransaction(id) {
    if (!confirm('Yakin ingin menghapus transaksi ' + id + '?')) return;
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions(transactions);
    refreshAllData();
    showToast('success', 'Transaksi ' + id + ' berhasil dihapus.');
}

document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('editTransactionId').value;
    const amount = parseInt(document.getElementById('txAmount').value);
    if (isNaN(amount) || amount <= 0) {
        showToast('error', 'Nominal harus lebih besar dari 0.');
        return;
    }
    const txData = {
        id: editId || 'TRX' + String(transactions.length + 1).padStart(3, '0'),
        name: document.getElementById('txName').value.trim(),
        date: document.getElementById('txDate').value,
        type: document.getElementById('txType').value,
        amount: amount,
        paymentMethod: document.getElementById('txPaymentMethod').value,
        description: document.getElementById('txDescription').value.trim(),
        status: 'Selesai',
        createdAt: editId ? (transactions.find(t => t.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };
    if (editId) {
        const idx = transactions.findIndex(t => t.id === editId);
        if (idx >= 0) transactions[idx] = { ...transactions[idx], ...txData, id: editId, createdAt: transactions[idx].createdAt };
        showToast('success', 'Transaksi berhasil diperbarui! ✅');
    } else {
        let newId = txData.id;
        while (transactions.find(t => t.id === newId)) newId = 'TRX' + String(parseInt(newId.replace('TRX','')) + 1).padStart(3,'0');
        txData.id = newId;
        transactions.push(txData);
        showToast('success', 'Transaksi baru berhasil ditambahkan! 🎉');
    }
    saveTransactions(transactions);
    closeTransactionModal();
    refreshAllData();
});

// ============ REPORTS ============
function updateReportsPage() {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    document.getElementById('reportSummary').innerHTML = `
        <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800"><span class="text-gray-600 dark:text-gray-400">Total Pemasukan</span><span class="font-bold text-emerald-600">${formatRupiahFull(totalIncome)}</span></div>
        <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800"><span class="text-gray-600 dark:text-gray-400">Total Pengeluaran</span><span class="font-bold text-rose-600">${formatRupiahFull(totalExpense)}</span></div>
        <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800"><span class="text-gray-600 dark:text-gray-400">Saldo Bersih</span><span class="font-bold text-indigo-600">${formatRupiahFull(totalIncome - totalExpense)}</span></div>
        <div class="flex justify-between py-2"><span class="text-gray-600 dark:text-gray-400">Jumlah Transaksi</span><span class="font-bold text-gray-900 dark:text-white">${transactions.length}</span></div>
    `;
    const methods = {};
    transactions.forEach(t => { const m = t.paymentMethod || 'Lainnya'; methods[m] = (methods[m] || 0) + t.amount; });
    const summaryDiv = document.getElementById('paymentMethodSummary');
    if (Object.keys(methods).length === 0) {
        summaryDiv.innerHTML = '<p>Belum ada data.</p>';
    } else {
        summaryDiv.innerHTML = Object.entries(methods).map(([m, total]) => `<div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800"><span>${m}</span><span class="font-semibold text-gray-900 dark:text-white">${formatRupiahFull(total)}</span></div>`).join('');
    }
}

// ============ EXPORT (semua user) ============
function exportToExcel() {
    const dateFrom = document.getElementById('exportDateFrom')?.value;
    const dateTo = document.getElementById('exportDateTo')?.value;
    const exportType = document.getElementById('exportType')?.value || 'all';
    const exportPayment = document.getElementById('exportPaymentMethod')?.value || 'all';
    let filtered = [...transactions];
    if (dateFrom) filtered = filtered.filter(t => t.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(t => t.date <= dateTo);
    if (exportType !== 'all') filtered = filtered.filter(t => t.type === exportType);
    if (exportPayment !== 'all') filtered = filtered.filter(t => t.paymentMethod === exportPayment);
    if (filtered.length === 0) { showToast('warning', 'Tidak ada data yang sesuai dengan filter.'); return; }

    const excelData = filtered.map((t, i) => ({
        'No': i + 1,
        'ID Transaksi': t.id,
        'Tanggal': new Date(t.date).toLocaleDateString('id-ID'),
        'Nama Produk': t.name,
        'Deskripsi': t.description || '-',
        'Tipe': t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        'Nominal (Rp)': t.amount,
        'Metode Pembayaran': t.paymentMethod,
        'Status': t.status,
    }));
    const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    excelData.push({});
    excelData.push({ 'No': '', 'ID Transaksi': 'RINGKASAN', 'Tanggal': '', 'Nama Produk': '', 'Deskripsi': '', 'Tipe': '', 'Nominal (Rp)': '', 'Metode Pembayaran': '', 'Status': '' });
    excelData.push({ 'No': '', 'ID Transaksi': 'Total Pemasukan', 'Tanggal': '', 'Nama Produk': '', 'Deskripsi': '', 'Tipe': '', 'Nominal (Rp)': totalIncome, 'Metode Pembayaran': '', 'Status': '' });
    excelData.push({ 'No': '', 'ID Transaksi': 'Total Pengeluaran', 'Tanggal': '', 'Nama Produk': '', 'Deskripsi': '', 'Tipe': '', 'Nominal (Rp)': totalExpense, 'Metode Pembayaran': '', 'Status': '' });
    excelData.push({ 'No': '', 'ID Transaksi': 'Saldo Bersih', 'Tanggal': '', 'Nama Produk': '', 'Deskripsi': '', 'Tipe': '', 'Nominal (Rp)': totalIncome - totalExpense, 'Metode Pembayaran': '', 'Status': '' });

    const headers = ['No', 'ID Transaksi', 'Tanggal', 'Nama Produk', 'Deskripsi', 'Tipe', 'Nominal (Rp)', 'Metode Pembayaran', 'Status'];
    const ws = XLSX.utils.json_to_sheet(excelData, { header: headers });

    // Style header: kuning, bold, border bawah
    for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: c });
        if (ws[cellRef]) {
            if (!ws[cellRef].s) ws[cellRef].s = {};
            ws[cellRef].s.fill = { fgColor: { rgb: "FFFF00" } };
            ws[cellRef].s.font = { bold: true, sz: 12 };
            ws[cellRef].s.border = {
                bottom: { style: "medium", color: { rgb: "000000" } }
            };
        }
    }

    ws['!cols'] = [
        { wch: 5 }, { wch: 14 }, { wch: 14 }, { wch: 25 }, { wch: 25 },
        { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan');
    const now = new Date();
    XLSX.writeFile(wb, `Laporan_Keuangan_${now.toISOString().split('T')[0]}_${now.getHours()}${now.getMinutes()}.xlsx`);
    showToast('success', 'File Excel berhasil diunduh! 📥');
}

// ============ SETTINGS & USER MANAGEMENT ============
function openSettingsModal() {
    document.getElementById('settingsModal').classList.add('flex');
    document.getElementById('settingsModal').classList.remove('hidden');
    renderUserManagement();
}
function closeSettingsModal() {
    document.getElementById('settingsModal').classList.add('hidden');
    document.getElementById('settingsModal').classList.remove('flex');
}
function changePassword() {
    const newPass = document.getElementById('newPassword').value.trim();
    if (!newPass || newPass.length < 6) { showToast('error', 'Password minimal 6 karakter!'); return; }
    const users = getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx >= 0) {
        users[idx].password = newPass;
        saveUsers(users);
        currentUser.password = newPass;
        saveSession(currentUser);
        showToast('success', 'Password berhasil diubah! 🔐');
        closeSettingsModal();
    }
}
function deleteMyAccount() {
    const confirmText = document.getElementById('deleteAccountConfirm').value.trim();
    if (confirmText !== 'HAPUS') { showToast('error', 'Ketik "HAPUS" untuk konfirmasi.'); return; }
    if (!confirm('⚠️ Akun Anda akan dihapus permanen. Lanjutkan?')) return;
    let users = getUsers();
    users = users.filter(u => u.id !== currentUser.id);
    saveUsers(users);
    clearSession();
    currentUser = null;
    showLoginPage();
    showToast('info', 'Akun Anda telah dihapus.');
}
function deleteUser(userId) {
    if (currentUser.role !== 'admin') return;
    const user = getUsers().find(u => u.id === userId);
    if (!user) return;
    if (user.role === 'admin') { showToast('error', 'Tidak bisa menghapus akun Admin lain.'); return; }
    if (!confirm(`Hapus akun ${user.name} (${user.email})?`)) return;
    let users = getUsers();
    users = users.filter(u => u.id !== userId);
    saveUsers(users);
    renderUserManagement();
    showToast('success', 'Akun ' + user.name + ' berhasil dihapus.');
}
function resetAllData() {
    if (currentUser.role !== 'admin') { showToast('error', 'Hanya Admin yang bisa mereset semua data.'); return; }
    const confirmText = document.getElementById('resetDataConfirm')?.value || '';
    if (confirmText !== 'RESET') { showToast('error', 'Ketik "RESET" untuk konfirmasi.'); return; }
    if (!confirm('⚠️ SEMUA transaksi akan dihapus permanen. Lanjutkan?')) return;
    localStorage.removeItem(STORAGE_KEY);
    transactions = [];
    saveTransactions(transactions);
    refreshAllData();
    showToast('success', 'Semua data transaksi telah direset.');
}
function renderUserManagement() {
    const container = document.getElementById('userManagementSection');
    const resetSection = document.getElementById('resetDataSection');

    // Atur visibilitas tombol Reset Data hanya untuk Admin
    if (resetSection) {
        resetSection.style.display = (currentUser?.role === 'admin') ? 'block' : 'none';
    }

    // Jika bukan admin, sembunyikan daftar pengguna
    if (!container) return;
    if (currentUser?.role !== 'admin') {
        container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">Hanya Admin yang dapat melihat daftar pengguna.</p>';
        return;
    }

    // Tampilkan daftar pengguna untuk Admin
    const users = getUsers();
    let html = `<div class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4"><h4 class="font-semibold text-gray-900 dark:text-white mb-3">Daftar Pengguna</h4>`;
    users.forEach(u => {
        html += `<div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">${u.name} <span class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full ml-2">${u.role}</span></p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${u.email}</p>
            </div>
            ${u.role === 'staff' ? `<button onclick="deleteUser('${u.id}')" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"><i class="fas fa-trash-alt"></i> Hapus</button>` : ''}
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// ============ DARK MODE ============
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('findash_darkmode', isDarkMode);
    updateDarkModeUI();
    if (currentPage === 'dashboard' && currentUser) renderCharts();
}
function updateDarkModeUI() {
    document.getElementById('darkModeIcon').className = isDarkMode ? 'fas fa-sun w-5 text-center text-amber-400' : 'fas fa-moon w-5 text-center';
    document.getElementById('darkModeLabel').textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
}

// ============ TOAST ============
function showToast(type, message) {
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const bgColors = { success:'bg-emerald-600', error:'bg-red-600', warning:'bg-amber-500', info:'bg-blue-600' };
    const toast = document.createElement('div');
    toast.className = `toast-enter ${bgColors[type] || 'bg-gray-700'} text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 pointer-events-auto max-w-sm`;
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    $toastContainer.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// ============ PASSWORD TOGGLE ============
window.togglePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash text-sm';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye text-sm';
    }
};

// ============ GLOBAL REFRESH ============
function refreshAllData() {
    transactions = getTransactions();
    updateDashboardStats();
    if (currentPage === 'dashboard') {
        renderCharts();
        renderRecentTransactions();
    } else if (currentPage === 'transactions') {
        renderAllTransactions();
    } else if (currentPage === 'reports') {
        updateReportsPage();
    }
}

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeTransactionModal(); closeSettingsModal(); }
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); if (currentUser) openAddTransactionModal(); }
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); if (currentUser) navigateTo('dashboard'); }
});

// ============ START ============
init();
console.log('🚀 FinDash Pro siap digunakan!');