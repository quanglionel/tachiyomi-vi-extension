// State
let extensions = [];
let filteredExtensions = [];
let currentSort = { field: 'name', direction: 'asc' };
let isCardView = false;

// DOM Elements
const tableBody = document.getElementById('tableBody');
const cardView = document.getElementById('cardView');
const tableView = document.getElementById('tableView');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const langFilter = document.getElementById('langFilter');
const nsfwFilter = document.getElementById('nsfwFilter');
const viewToggle = document.getElementById('viewToggle');
const gridIcon = document.getElementById('gridIcon');
const listIcon = document.getElementById('listIcon');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const resultsCount = document.getElementById('resultsCount');
const totalExtensions = document.getElementById('totalExtensions');
const totalSources = document.getElementById('totalSources');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');

// Configuration for multiple repositories
const REPOS = [
    {
        name: 'Official',
        url: 'index.min.json',
        github: 'https://github.com/keiyoushi/extensions'
    },
    {
        name: 'Unofficial',
        url: 'https://beer-psi.github.io/tachiyomi-unofficial-extensions/index.min.json',
        github: 'https://github.com/beer-psi/tachiyomi-unofficial-extensions'
    },
    {
        name: 'Suwayomi',
        url: 'https://raw.githubusercontent.com/suwayomi/tachiyomi-extension/repo/index.min.json',
        github: 'https://github.com/suwayomi/tachiyomi-extension'
    },
    {
        name: 'Anime',
        url: 'https://raw.githubusercontent.com/yuzono/anime-repo/repo/index.min.json',
        github: 'https://github.com/yuzono/anime-repo'
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    await loadData();
    populateLanguageFilter();
}

// Load JSON data from all repositories
async function loadData() {
    loading.style.display = 'flex';
    let allExtensions = [];

    try {
        const fetchPromises = REPOS.map(async (repo) => {
            try {
                const response = await fetch(repo.url);
                if (!response.ok) throw new Error(`Failed to load ${repo.name}`);
                const data = await response.json();
                // Add repo information to each extension
                return data.map(ext => ({
                    ...ext,
                    repoName: repo.name,
                    repoGithub: repo.github
                }));
            } catch (err) {
                console.error(`Error loading repo ${repo.name}:`, err);
                return [];
            }
        });

        const results = await Promise.all(fetchPromises);
        // CHỈ GIỮ LẠI TIẾNG VIỆT (lang === 'vi')
        allExtensions = results.flat().filter(ext => ext.lang === 'vi');

        // De-duplicate items by package (pkg), keeping the one with higher version or first one
        const uniqueExtensions = new Map();
        allExtensions.forEach(ext => {
            if (!uniqueExtensions.has(ext.pkg) || isNewerVersion(ext.version, uniqueExtensions.get(ext.pkg).version)) {
                uniqueExtensions.set(ext.pkg, ext);
            }
        });

        extensions = Array.from(uniqueExtensions.values());
        filteredExtensions = [...extensions];

        // Update stats
        updateStats();

        renderData();
        loading.style.display = 'none';
        noResults.style.display = extensions.length === 0 ? 'flex' : 'none';
    } catch (error) {
        console.error('Data loading error:', error);
        resultsCount.textContent = 'Không thể tải dữ liệu. Vui lòng thử lại.';
        loading.style.display = 'none';
    }
}

// Helper to compare versions
function isNewerVersion(v1, v2) {
    if (!v1 || !v2) return true;
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const n1 = parts1[i] || 0;
        const n2 = parts2[i] || 0;
        if (n1 > n2) return true;
        if (n1 < n2) return false;
    }
    return false;
}

function updateStats() {
    totalExtensions.textContent = extensions.length;
    const sourcesCount = extensions.reduce((sum, ext) => sum + (ext.sources?.length || 0), 0);
    totalSources.textContent = sourcesCount;
}

// Setup event listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        handleSearch();
    });

    // Filters
    langFilter.addEventListener('change', handleFilter);
    nsfwFilter.addEventListener('change', handleFilter);

    // View toggle
    viewToggle.addEventListener('click', toggleView);

    // Sort
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });

    // Modal
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Populate language filter (Only showing Vietnamese now)
function populateLanguageFilter() {
    langFilter.innerHTML = '<option value="vi">Tiếng Việt</option>';
}

// Get language display name
function getLanguageName(code) {
    if (code === 'vi') return 'Tiếng Việt';
    return code.toUpperCase();
}

// Handle search
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    clearSearch.style.display = query ? 'flex' : 'none';
    handleFilter();
}

// Handle filter
function handleFilter() {
    const query = searchInput.value.toLowerCase().trim();
    const lang = langFilter.value;
    const nsfw = nsfwFilter.value;

    filteredExtensions = extensions.filter(ext => {
        // Search filter
        if (query) {
            const searchFields = [
                ext.name,
                ext.pkg,
                ext.lang,
                ext.version,
                ...(ext.sources?.map(s => s.name) || []),
                ...(ext.sources?.map(s => s.baseUrl) || [])
            ].join(' ').toLowerCase();

            if (!searchFields.includes(query)) return false;
        }

        // Language filter
        if (lang && ext.lang !== lang) return false;

        // NSFW filter
        if (nsfw !== '' && String(ext.nsfw) !== nsfw) return false;

        return true;
    });

    sortData();
    renderData();
}

// Handle sort
function handleSort(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }

    // Update UI
    document.querySelectorAll('.data-table th').forEach(th => {
        th.classList.remove('sorted', 'desc');
    });

    const sortedTh = document.querySelector(`th[data-sort="${field}"]`);
    if (sortedTh) {
        sortedTh.classList.add('sorted');
        if (currentSort.direction === 'desc') sortedTh.classList.add('desc');
    }

    sortData();
    renderData();
}

// Sort data
function sortData() {
    filteredExtensions.sort((a, b) => {
        let valA, valB;

        switch (currentSort.field) {
            case 'name':
                valA = a.name?.toLowerCase() || '';
                valB = b.name?.toLowerCase() || '';
                break;
            case 'pkg':
                valA = a.pkg?.toLowerCase() || '';
                valB = b.pkg?.toLowerCase() || '';
                break;
            case 'lang':
                valA = a.lang?.toLowerCase() || '';
                valB = b.lang?.toLowerCase() || '';
                break;
            case 'version':
                valA = a.version || '';
                valB = b.version || '';
                break;
            case 'nsfw':
                valA = a.nsfw || 0;
                valB = b.nsfw || 0;
                break;
            case 'sources':
                valA = a.sources?.length || 0;
                valB = b.sources?.length || 0;
                break;
            case 'repo':
                valA = a.repoName?.toLowerCase() || '';
                valB = b.repoName?.toLowerCase() || '';
                break;
            default:
                valA = '';
                valB = '';
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Toggle view
function toggleView() {
    isCardView = !isCardView;

    if (isCardView) {
        tableView.style.display = 'none';
        cardView.style.display = 'grid';
        gridIcon.style.display = 'none';
        listIcon.style.display = 'block';
    } else {
        tableView.style.display = 'block';
        cardView.style.display = 'none';
        gridIcon.style.display = 'block';
        listIcon.style.display = 'none';
    }

    renderData();
}

// Render data
function renderData() {
    resultsCount.textContent = `Hiển thị ${filteredExtensions.length} trong tổng số ${extensions.length} extensions`;

    if (filteredExtensions.length === 0) {
        noResults.style.display = 'block';
        tableView.style.display = 'none';
        cardView.style.display = 'none';
        return;
    }

    noResults.style.display = 'none';

    if (isCardView) {
        renderCards();
    } else {
        renderTable();
    }
}

// Render table
function renderTable() {
    tableBody.innerHTML = filteredExtensions.map(ext => `
        <tr>
            <td>
                <div class="extension-name">
                    <div class="extension-icon">${getInitials(ext.name)}</div>
                    <span>${escapeHtml(ext.name)}</span>
                </div>
            </td>
            <td>
                <span class="package-name" title="${escapeHtml(ext.pkg)}">${escapeHtml(ext.pkg)}</span>
            </td>
            <td>
                <span class="lang-badge">${escapeHtml(ext.lang || 'N/A')}</span>
            </td>
            <td>
                <span class="version-badge">v${escapeHtml(ext.version)}</span>
            </td>
            <td>
                <span class="nsfw-badge ${ext.nsfw ? 'nsfw' : 'sfw'}">${ext.nsfw ? 'NSFW' : 'SFW'}</span>
            </td>
            <td>
                <span class="repo-badge ${ext.repoName.toLowerCase()}">${ext.repoName}</span>
            </td>
            <td>
                <button class="sources-btn" onclick='showSources(${JSON.stringify(ext).replace(/'/g, "\\'")})'> 
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 12C21 12 17 4 12 4C7 4 3 12 3 12C3 12 7 20 12 20C17 20 21 12 21 12Z" stroke="currentColor" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    ${ext.sources?.length || 0} sources
                </button>
            </td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <a href="${ext.repoGithub}/tree/master/src/${ext.lang}/${ext.pkg.split('.').pop()}" target="_blank" class="apk-link" title="Xem mã nguồn trên GitHub">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
                        </svg>
                    </a>
                    <a href="#" class="apk-link" title="${escapeHtml(ext.apk)}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </a>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render cards
function renderCards() {
    cardView.innerHTML = filteredExtensions.map(ext => `
        <div class="card">
            <div class="card-header">
                <div class="card-icon">${getInitials(ext.name)}</div>
                <div class="card-title">
                    <h3>${escapeHtml(ext.name)}</h3>
                    <p>${escapeHtml(ext.pkg)}</p>
                </div>
            </div>
            <div class="card-body">
                <div class="card-meta">
                    <span class="lang-badge">${escapeHtml(ext.lang || 'N/A')}</span>
                    <span class="version-badge">v${escapeHtml(ext.version)}</span>
                    <span class="nsfw-badge ${ext.nsfw ? 'nsfw' : 'sfw'}">${ext.nsfw ? 'NSFW' : 'SFW'}</span>
                    <span class="repo-badge ${ext.repoName.toLowerCase()}">${ext.repoName}</span>
                </div>
                <div class="card-actions">
                    <button class="sources-btn" onclick='showSources(${JSON.stringify(ext).replace(/'/g, "\\'")})'>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 12C21 12 17 4 12 4C7 4 3 12 3 12C3 12 7 20 12 20C17 20 21 12 21 12Z" stroke="currentColor" stroke-width="2"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        ${ext.sources?.length || 0}
                    </button>
                    <a href="${ext.repoGithub}/tree/master/src/${ext.lang}/${ext.pkg.split('.').pop()}" target="_blank" class="apk-link sources-btn" style="background: transparent; border: 1px solid #333; color: var(--text-primary);">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
                        </svg>
                        Code
                    </a>
                    <a href="#" class="apk-link sources-btn" style="background: transparent; border: 1px solid var(--accent-primary); color: var(--accent-primary);">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            <path d="M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        APK
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// Show sources modal
function showSources(ext) {
    modalTitle.textContent = `${ext.name} - Sources`;

    if (!ext.sources || ext.sources.length === 0) {
        modalBody.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Không có sources</p>';
    } else {
        modalBody.innerHTML = `
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-muted); font-size: 0.9rem;">Danh sách ${ext.sources.length} nguồn</span>
                <button class="sources-btn" id="checkAllStatus" style="background: var(--accent-primary); color: white;">
                    Kiểm tra tất cả Live/Die
                </button>
            </div>
            <div class="source-list">
                ${ext.sources.map((source, index) => `
                    <div class="source-item" id="source-${index}">
                        <div class="source-info">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                                <h4>${escapeHtml(source.name)}</h4>
                                <span class="status-indicator" id="status-${index}">Đang chờ...</span>
                            </div>
                            <p style="margin-bottom: 8px;">ID: <code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px;">${escapeHtml(source.id)}</code></p>
                            <a href="${escapeHtml(source.baseUrl)}" target="_blank" class="source-link">
                                ${escapeHtml(source.baseUrl)}
                                <svg viewBox="0 0 24 24" fill="none" style="width: 12px; height: 12px; display: inline-block; margin-left: 4px;">
                                    <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M15 3H21V9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </a>
                        </div>
                        <div class="source-meta">
                            <span class="lang-badge">${escapeHtml(source.lang)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('checkAllStatus').addEventListener('click', () => {
            ext.sources.forEach((source, index) => {
                checkUrlStatus(source.baseUrl, index);
            });
        });
    }

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Function to check URL status using proxy backend
async function checkUrlStatus(url, index) {
    const indicator = document.getElementById(`status-${index}`);
    if (!indicator) return;

    if (!url) {
        indicator.textContent = 'No URL';
        indicator.className = 'status-indicator die';
        return;
    }

    indicator.textContent = 'Đang quét...';
    indicator.className = 'status-indicator checking';

    try {
        // Gửi yêu cầu qua server.py để kiểm tra chính xác HTTP Status Code
        const response = await fetch(`/proxy-check?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Proxy error');

        const data = await response.json();

        if (data.live) {
            indicator.textContent = 'LIVE';
            indicator.className = 'status-indicator live';
        } else {
            // Hiển thị cụ thể mã lỗi (ví dụ: DIE (521))
            indicator.textContent = `DIE (${data.status})`;
            indicator.className = 'status-indicator die';
        }
    } catch (error) {
        indicator.textContent = 'DIE';
        indicator.className = 'status-indicator die';
    }
}

// Close modal
function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Get initials from name
function getInitials(name) {
    if (!name) return '?';
    const cleanName = name.replace(/^Tachiyomi:\s*/i, '');
    return cleanName.substring(0, 2).toUpperCase();
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
