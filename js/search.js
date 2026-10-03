const SEARCH_PAGE_SIZE = 12;

let searchState = {
    q: '',
    type: 'all',
    offset: 0,
    loading: false
};

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();

    const params = new URLSearchParams(window.location.search);
    searchState.q = params.get('q') || '';
    searchState.type = params.get('type') || 'all';

    const input = document.getElementById('global-search');
    if (input && searchState.q) input.value = searchState.q;

    document.querySelectorAll('.search-tabs .tab').forEach(tab => {
        if (tab.dataset.type === searchState.type) tab.classList.add('active');
        else tab.classList.remove('active');
        tab.addEventListener('click', () => {
            document.querySelectorAll('.search-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            searchState.type = tab.dataset.type || 'all';
            searchState.offset = 0;
            syncUrl();
            runSearch(true);
        });
    });

    document.getElementById('search-load-more')?.addEventListener('click', () => runSearch(false));

    if (input) {
        let timer = null;
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const q = input.value.trim();
                if (q === searchState.q) return;
                searchState.q = q;
                searchState.offset = 0;
                syncUrl();
                if (q.length >= 2) runSearch(true);
                else showPlaceholder();
            }, 350);
        });
    }

    // lets the shared header search run on this page instead of navigating
    window.searchPageSearch = () => {
        const input = document.getElementById('global-search');
        if (!input) return false;
        const q = input.value.trim();
        searchState.q = q;
        searchState.offset = 0;
        syncUrl();
        if (q.length >= 2) runSearch(true);
        else showPlaceholder();
        return true;
    };

    if (searchState.q) runSearch(true);
    else showPlaceholder();
});

function syncUrl() {
    const params = new URLSearchParams();
    if (searchState.q) params.set('q', searchState.q);
    if (searchState.type && searchState.type !== 'all') params.set('type', searchState.type);
    const qs = params.toString();
    try {
        history.replaceState(null, '', qs ? `search.html?${qs}` : 'search.html');
    } catch (e) {
        // history API can be blocked on file:// or strict origins
    }
}

function showPlaceholder() {
    const box = document.getElementById('search-results');
    box.innerHTML = `<div class="search-empty" style="grid-column:1/-1;">
        <i class="fa-solid fa-magnifying-glass"></i>
        <p>Start typing in the search box above to search people, posts, groups, clubs and events.</p>
    </div>`;
    document.getElementById('search-summary').textContent = 'Search people, posts, department groups, clubs and events.';
    document.getElementById('search-more-wrap').style.display = 'none';
}

async function runSearch(reset = false) {
    const box = document.getElementById('search-results');
    const summary = document.getElementById('search-summary');
    const moreWrap = document.getElementById('search-more-wrap');
    const q = searchState.q.trim();

    if (q.length < 2) { showPlaceholder(); return; }
    if (searchState.loading) return;
    searchState.loading = true;

    if (reset) {
        searchState.offset = 0;
        box.innerHTML = '<div class="text-muted p-4" style="grid-column:1/-1;"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>';
    }

    try {
        const data = await api(`api/search/index.php?q=${encodeURIComponent(q)}&type=${searchState.type}&limit=${SEARCH_PAGE_SIZE}&offset=${searchState.offset}`);
        const groups = Object.entries(data.results || {}).filter(([, v]) => v.length);
        const shown = groups.reduce((n, [, v]) => n + v.length, 0);

        if (reset) box.innerHTML = '';
        if (!groups.length) {
            box.innerHTML = `<div class="search-empty" style="grid-column:1/-1;">
                <i class="fa-solid fa-face-frown"></i>
                <p>No results for "<strong>${escapeHTML(q)}</strong>"${searchState.type !== 'all' ? ' in this category' : ''}.</p>
            </div>`;
        } else {
            groups.forEach(([type, items]) => {
                items.forEach(item => box.insertAdjacentHTML('beforeend', searchResultCardHTML(type, item)));
            });
        }

        const typeLabel = searchState.type === 'all' ? '' : ` in ${searchState.type}`;
        summary.innerHTML = shown
            ? `<strong>${data.total}</strong> result${data.total === 1 ? '' : 's'} for "<strong>${escapeHTML(q)}</strong>"${typeLabel}`
            : `No results for "<strong>${escapeHTML(q)}</strong>"${typeLabel}`;

        searchState.offset += shown;
        const hasMore = searchState.offset < data.total;
        moreWrap.style.display = hasMore ? 'block' : 'none';
    } catch (e) {
        box.innerHTML = '<div class="search-empty" style="grid-column:1/-1;"><p>Search is unavailable right now.</p></div>';
    } finally {
        searchState.loading = false;
    }
}

function searchResultCardHTML(type, r) {
    const meta = SEARCH_TYPE_META?.[type] || { label: type, icon: 'fa-solid fa-circle' };
    const thumb = r.image
        ? `<img src="${mediaUrl(r.image)}" alt="" class="search-card-img">`
        : `<div class="search-card-img search-card-ico"><i class="${meta.icon}"></i></div>`;
    return `<a class="search-card" href="${escapeHTML(r.link || '#')}">
        ${thumb}
        <div class="search-card-body">
            <div class="search-card-type">${meta.label}</div>
            <strong>${escapeHTML(r.title || '')}</strong>
            <span>${escapeHTML(r.subtitle || '')}</span>
            ${(r.meta || r.time) ? `<em>${escapeHTML(r.meta || r.time || '')}</em>` : ''}
        </div>
    </a>`;
}

// keep the page in sync when the shared header search navigates here
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    searchState.q = params.get('q') || '';
    searchState.type = params.get('type') || 'all';
    const input = document.getElementById('global-search');
    if (input) input.value = searchState.q;
    document.querySelectorAll('.search-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.type === searchState.type));
    if (searchState.q) runSearch(true);
    else showPlaceholder();
});
