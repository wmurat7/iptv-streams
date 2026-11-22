/**
 * IPTV Smarters Pro - Samsung Tizen Smart TV Edition
 * Standalone High-Performance Client Controller
 */

class IPTVSmartersApp {
    constructor() {
        this.player = null;
        this.nav = null;

        // Credentials
        this.account = {
            server: 'http://jkrteki.com:8080',
            username: 'WMurat',
            password: 'JfHPHXkQNqck'
        };

        // Stream format preference: 'ts' (default) or 'm3u8'
        this.streamFormat = localStorage.getItem('iptv_stream_format') || 'ts';

        // Catalog Data
        this.liveCategories = [];
        this.liveChannels = [];
        this.movieCategories = [];
        this.movies = [];
        this.seriesCategories = [];
        this.series = [];
        this.seriesDetails = {};

        // Active State
        this.currentView = 'DASHBOARD';
        this.activeLiveCategory = null;
        this.activeMovieCategory = null;
        this.activeSeriesCategory = null;
        this.activeLiveChannel = null;
        this.activeVodItem = null;
        this.activeSeriesItem = null;
        this.activeSeason = '1';

        this.isFullscreen = false;
        this.osdTimer = null;
        this.toastTimer = null;

        // Parental Control
        this.isAdultUnlocked = false;
        this.enteredPin = '';
        this.pinCallback = null;

        this.init();
    }

    async init() {
        this.player = new VideoPlayer('main-video');
        this.nav = new TVNavigation(this);

        this.initClock();
        await this.loadCatalogData();

        setTimeout(() => {
            const firstTile = document.querySelector('.hero-tile');
            if (firstTile) this.nav.setFocus(firstTile);
        }, 200);
    }

    initClock() {
        const update = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            const timeEl = document.getElementById('header-time');
            const dateEl = document.getElementById('header-date');
            if (timeEl) timeEl.innerText = timeStr;
            if (dateEl) dateEl.innerText = dateStr;
        };
        update();
        setInterval(update, 1000);
    }

    async loadCatalogData() {
        try {
            // 1. Live Data (199 KB - loads in 20ms)
            const liveRes = await fetch('data/live.json');
            if (liveRes.ok) {
                const liveData = await liveRes.json();
                this.liveCategories = liveData.categories || [];
                this.liveChannels = liveData.channels || [];
                const liveCount = document.getElementById('dash-count-live');
                if (liveCount) liveCount.innerText = `${this.liveChannels.length.toLocaleString('tr-TR')} Kanal`;
            }

            // 2. Movies Data in background
            fetch('data/movies.json')
                .then(r => r.json())
                .then(m => {
                    this.movieCategories = m.categories || [];
                    this.movies = m.movies || [];
                    const movCount = document.getElementById('dash-count-movies');
                    if (movCount) movCount.innerText = `${this.movies.length.toLocaleString('tr-TR')} Film`;
                })
                .catch(e => console.warn('Movies fetch error:', e));

            // 3. Series Data in background
            fetch('data/series.json')
                .then(r => r.json())
                .then(s => {
                    this.seriesCategories = s.categories || [];
                    this.series = s.series || [];
                    const serCount = document.getElementById('dash-count-series');
                    if (serCount) serCount.innerText = `${this.series.length.toLocaleString('tr-TR')} Dizi`;
                })
                .catch(e => console.warn('Series fetch error:', e));

            // 4. Series Details (episodes)
            fetch('data/series_details.json')
                .then(r => r.json())
                .then(d => {
                    this.seriesDetails = d || {};
                })
                .catch(e => console.warn('Series details fetch error:', e));

        } catch (e) {
            console.error('Catalog load error:', e);
        }
    }

    /* ==========================================================================
       VIEW NAVIGATION
       ========================================================================== */
    switchView(viewName, pushHistory = true) {
        if (pushHistory && viewName !== this.currentView) {
            try {
                history.pushState({ view: viewName }, '', '#' + viewName.toLowerCase());
            } catch (e) { }
        }

        this.currentView = viewName;
        this.nav.currentView = viewName;

        document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));

        // Update Top Navigation Bar active state
        document.querySelectorAll('.top-nav-btn').forEach(btn => btn.classList.remove('active'));
        if (viewName === 'DASHBOARD') {
            const b = document.getElementById('btn-nav-home');
            if (b) b.classList.add('active');
        } else if (viewName === 'LIVE') {
            const b = document.getElementById('btn-nav-live');
            if (b) b.classList.add('active');
        } else if (viewName === 'MOVIES') {
            const b = document.getElementById('btn-nav-movies');
            if (b) b.classList.add('active');
        } else if (viewName === 'SERIES') {
            const b = document.getElementById('btn-nav-series');
            if (b) b.classList.add('active');
        }

        const backBtn = document.getElementById('btn-header-back');
        if (backBtn) {
            backBtn.style.display = viewName === 'DASHBOARD' ? 'none' : 'flex';
        }

        if (viewName === 'DASHBOARD') {
            document.getElementById('view-dashboard').classList.remove('hidden');
            const firstTile = document.querySelector('.hero-tile');
            if (firstTile) this.nav.setFocus(firstTile);
        } else if (viewName === 'LIVE') {
            document.getElementById('view-live').classList.remove('hidden');
            this.renderLiveCategories();
            this.selectLiveCategory(0);
        } else if (viewName === 'MOVIES') {
            document.getElementById('view-movies').classList.remove('hidden');
            this.renderMovieCategories();
            this.selectMovieCategory(0);
        } else if (viewName === 'SERIES') {
            document.getElementById('view-series').classList.remove('hidden');
            this.renderSeriesCategories();
            this.selectSeriesCategory(0);
        }
    }

    goBack() {
        if (this.isFullscreen) {
            this.exitFullscreen();
            return;
        }
        if (this.isAnyModalOpen()) {
            this.closeModal();
            return;
        }
        if (this.currentView !== 'DASHBOARD') {
            this.switchView('DASHBOARD');
            return;
        }
        this.showToast('Çıkmak için TV kumandasındaki [Çıkış] tuşuna basın.');
    }

    isAnyModalOpen() {
        const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
        return modals.length > 0;
    }

    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        this.nav.currentView = this.currentView;
    }

    clearAndExitSearch(type) {
        if (type === 'live') {
            const input = document.getElementById('live-search-input');
            if (input) { input.value = ''; input.blur(); }
            this.filterLiveChannels('');
            this.nav.focusFirstContentItem();
        } else if (type === 'movies') {
            const input = document.getElementById('movie-search-input');
            if (input) { input.value = ''; input.blur(); }
            this.filterMovies('');
            this.nav.focusFirstContentItem();
        } else if (type === 'series') {
            const input = document.getElementById('series-search-input');
            if (input) { input.value = ''; input.blur(); }
            this.filterSeries('');
            this.nav.focusFirstContentItem();
        }
    }

    /* ==========================================================================
       LIVE TV
       ========================================================================== */
    renderLiveCategories() {
        const listEl = document.getElementById('live-cat-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        const fullCats = [
            { id: 'ALL', name: '📺 Tüm Kanallar', adult: false },
            { id: 'FAV', name: '⭐ Favorilerim', adult: false, isFav: true },
            ...this.liveCategories
        ];

        fullCats.forEach((cat, idx) => {
            const div = document.createElement('div');
            div.className = `live-cat-item nav-item ${idx === 0 ? 'active' : ''}`;
            div.innerHTML = `<span>${cat.name}</span>${cat.adult && !this.isAdultUnlocked ? ' 🔒' : ''}`;
            div.addEventListener('click', () => {
                if (cat.adult && !this.isAdultUnlocked) {
                    this.openPinModal(() => {
                        this.selectLiveCategory(idx, cat);
                    });
                    return;
                }
                this.selectLiveCategory(idx, cat);
            });
            listEl.appendChild(div);
        });
    }

    selectLiveCategory(index, catObj) {
        const listEl = document.getElementById('live-cat-list');
        if (listEl) {
            listEl.querySelectorAll('.live-cat-item').forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });
        }

        const fullCats = [
            { id: 'ALL', name: '📺 Tüm Kanallar', adult: false },
            { id: 'FAV', name: '⭐ Favorilerim', adult: false, isFav: true },
            ...this.liveCategories
        ];

        const activeCat = catObj || fullCats[index];
        if (!activeCat) return;

        this.activeLiveCategory = activeCat;

        // Reset search input
        const searchInput = document.getElementById('live-search-input');
        if (searchInput) searchInput.value = '';

        let channels = [];
        if (activeCat.id === 'ALL') {
            // Exclude adult from ALL if not unlocked
            channels = this.liveChannels.filter(ch => {
                const isAdult = this.isChannelAdult(ch);
                return !isAdult || this.isAdultUnlocked;
            });
        } else if (activeCat.isFav) {
            channels = FavoritesManager.getFavorites();
        } else {
            channels = this.liveChannels.filter(ch => ch.c === activeCat.id);
        }

        this.renderLiveChannels(channels);
    }

    isChannelAdult(channel) {
        const cat = this.liveCategories.find(c => c.id === channel.c);
        return cat ? cat.adult : false;
    }

    filterLiveChannels(query) {
        const q = (query || '').trim().toLowerCase();
        let pool = [];

        if (!this.activeLiveCategory || this.activeLiveCategory.id === 'ALL') {
            pool = this.liveChannels.filter(ch => !this.isChannelAdult(ch) || this.isAdultUnlocked);
        } else if (this.activeLiveCategory.isFav) {
            pool = FavoritesManager.getFavorites();
        } else {
            pool = this.liveChannels.filter(ch => ch.c === this.activeLiveCategory.id);
        }

        if (!q) {
            this.renderLiveChannels(pool);
            return;
        }

        const filtered = pool.filter(ch => (ch.n || '').toLowerCase().includes(q));
        this.renderLiveChannels(filtered);
    }

    renderLiveChannels(channels) {
        const chListEl = document.getElementById('live-ch-list');
        const countTag = document.getElementById('live-filtered-count');
        if (!chListEl) return;
        chListEl.innerHTML = '';

        if (countTag) countTag.innerText = `${channels.length} Kanal`;
        this.currentDisplayedChannels = channels;

        if (!channels.length) {
            chListEl.innerHTML = '<div style="padding:25px; color:var(--text-muted); text-align:center;">Kanal bulunamadı.</div>';
            return;
        }

        const limit = Math.min(channels.length, 120);
        for (let i = 0; i < limit; i++) {
            const ch = channels[i];
            const epg = EPGManager.getProgramForChannel(ch.n);
            const isFav = FavoritesManager.isFavorite(ch.i);

            const card = document.createElement('div');
            card.className = `live-channel-card nav-item ${this.activeLiveChannel && this.activeLiveChannel.i === ch.i ? 'active' : ''}`;
            card.innerHTML = `
                <div class="ch-logo-wrap">
                    ${ch.l ? `<img src="${ch.l}" onerror="this.src='https://placehold.co/44x44/000/fff?text=TV'"/>` : '📺'}
                </div>
                <div class="ch-details">
                    <div class="ch-title">${isFav ? '⭐ ' : ''}${ch.n}</div>
                    <div class="ch-epg-now">${epg.title}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                this.playLiveChannel(ch, epg);
            });
            chListEl.appendChild(card);
        }

        if (!this.activeLiveChannel && channels.length > 0) {
            this.previewChannelInfo(channels[0], EPGManager.getProgramForChannel(channels[0].n));
        }
    }

    previewChannelInfo(ch, epg) {
        const epgData = epg || EPGManager.getProgramForChannel(ch.n);
        const titleEl = document.getElementById('epg-ch-title');
        const progEl = document.getElementById('epg-prog-title');
        const descEl = document.getElementById('epg-desc');
        const nextEl = document.getElementById('epg-next-title');
        const progressFill = document.getElementById('epg-prog-fill');

        if (titleEl) titleEl.innerText = ch.n;
        if (progEl) progEl.innerText = epgData.title;
        if (descEl) descEl.innerText = epgData.description || 'Yayın akışı devam ediyor.';
        if (nextEl) nextEl.innerText = epgData.nextTitle || '-';
        if (progressFill) progressFill.style.width = `${epgData.progress || 40}%`;
    }

    playLiveChannel(ch, epg) {
        this.activeLiveChannel = ch;
        const epgData = epg || EPGManager.getProgramForChannel(ch.n);
        this.previewChannelInfo(ch, epgData);

        const osdName = document.getElementById('osd-channel-name');
        const osdProg = document.getElementById('osd-program-name');
        const osdNum = document.getElementById('osd-channel-num');
        const osdLogo = document.getElementById('osd-channel-logo');

        if (osdName) osdName.innerText = ch.n;
        if (osdProg) osdProg.innerText = epgData.title;
        if (osdNum) osdNum.innerText = ch.num || '';
        if (osdLogo) osdLogo.src = ch.l || '';

        // Stream URL according to selected format
        const ext = this.streamFormat === 'm3u8' ? 'm3u8' : 'ts';
        const streamUrl = `${this.account.server}/live/${this.account.username}/${this.account.password}/${ch.i}.${ext}`;

        this.player.play(streamUrl);
    }

    zapChannel(delta) {
        if (!this.currentDisplayedChannels || !this.currentDisplayedChannels.length) return;
        let idx = this.currentDisplayedChannels.findIndex(c => this.activeLiveChannel && c.i === this.activeLiveChannel.i);
        if (idx === -1) idx = 0;

        let nextIdx = (idx + delta + this.currentDisplayedChannels.length) % this.currentDisplayedChannels.length;
        this.playLiveChannel(this.currentDisplayedChannels[nextIdx]);
        this.showOSD();
    }

    toggleActiveFavorite() {
        if (!this.activeLiveChannel) return;
        const isAdded = FavoritesManager.toggleFavorite({
            id: this.activeLiveChannel.i,
            name: this.activeLiveChannel.n,
            logo: this.activeLiveChannel.l
        });
        this.showToast(isAdded ? '⭐ Favorilere eklendi!' : 'Favorilerden kaldırıldı.');
        if (this.currentView === 'LIVE') {
            this.renderLiveCategories();
        }
    }

    openFavorites() {
        this.switchView('LIVE');
        this.selectLiveCategory(1);
    }

    openAdultCategory() {
        this.switchView('LIVE');
        const adultCatIdx = this.liveCategories.findIndex(c => c.adult);
        if (adultCatIdx !== -1) {
            const realIdx = adultCatIdx + 2; // +2 for ALL & FAV
            const cat = this.liveCategories[adultCatIdx];
            if (!this.isAdultUnlocked) {
                this.openPinModal(() => {
                    this.selectLiveCategory(realIdx, cat);
                });
            } else {
                this.selectLiveCategory(realIdx, cat);
            }
        } else {
            this.showToast('Yetişkin kategorisi bulunamadı.');
        }
    }

    /* ==========================================================================
       MOVIES (VOD)
       ========================================================================== */
    renderMovieCategories() {
        const listEl = document.getElementById('movie-cat-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        this.movieCategories.forEach((cat, idx) => {
            const div = document.createElement('div');
            div.className = `live-cat-item nav-item ${idx === 0 ? 'active' : ''}`;
            div.innerHTML = `<span>${cat.name}</span>`;
            div.addEventListener('click', () => {
                this.selectMovieCategory(idx, cat);
            });
            listEl.appendChild(div);
        });
    }

    selectMovieCategory(index, catObj) {
        const listEl = document.getElementById('movie-cat-list');
        if (listEl) {
            listEl.querySelectorAll('.live-cat-item').forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });
        }

        const cat = catObj || this.movieCategories[index];
        if (!cat) return;
        this.activeMovieCategory = cat;

        const titleEl = document.getElementById('movie-active-cat-title');
        if (titleEl) titleEl.innerText = cat.name;

        const searchInput = document.getElementById('movie-search-input');
        if (searchInput) searchInput.value = '';

        const catMovies = this.movies.filter(m => m.c === cat.id);
        this.renderMovieGrid(catMovies);
    }

    filterMovies(query) {
        const q = (query || '').trim().toLowerCase();
        let pool = this.activeMovieCategory ? this.movies.filter(m => m.c === this.activeMovieCategory.id) : this.movies;

        if (!q) {
            this.renderMovieGrid(pool);
            return;
        }

        const filtered = pool.filter(m => (m.n || '').toLowerCase().includes(q));
        this.renderMovieGrid(filtered);
    }

    renderMovieGrid(items) {
        const gridEl = document.getElementById('movie-grid');
        const badgeEl = document.getElementById('movie-count-badge');
        if (!gridEl) return;
        gridEl.innerHTML = '';

        if (badgeEl) badgeEl.innerText = `${items.length} Film`;

        if (!items.length) {
            gridEl.innerHTML = '<div style="padding:40px; color:var(--text-muted); text-align:center; grid-column:1/-1;">Bu kategoride film bulunamadı.</div>';
            return;
        }

        const limit = Math.min(items.length, 120);
        for (let i = 0; i < limit; i++) {
            const m = items[i];
            const card = document.createElement('div');
            card.className = 'poster-card nav-item';
            card.innerHTML = `
                <div class="poster-img-wrap">
                    <img src="${m.p || ''}" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300'"/>
                    ${m.r ? `<div class="poster-rating">★ ${m.r}</div>` : ''}
                </div>
                <div class="poster-info">
                    <div class="poster-title">${m.n}</div>
                    <div class="poster-year">${this.activeMovieCategory ? this.activeMovieCategory.name : 'Film'}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                this.openVodModal(m);
            });
            gridEl.appendChild(card);
        }
    }

    openVodModal(item) {
        this.activeVodItem = item;
        const modal = document.getElementById('modal-vod');
        document.getElementById('vod-modal-title').innerText = item.n;
        document.getElementById('vod-modal-cat').innerText = this.activeMovieCategory ? this.activeMovieCategory.name : 'Film';
        document.getElementById('vod-modal-desc').innerText = `${item.n} filmi, yüksek çözünürlüklü ve kesintisiz Türkçe seslendirme ile hemen izleyebilirsiniz.`;
        document.getElementById('vod-modal-poster').src = item.p || '';
        document.getElementById('vod-modal-rating').innerText = item.r ? `⭐ ${item.r}` : '⭐ 8.0';

        modal.classList.remove('hidden');
        this.nav.currentView = 'MODAL';
        this.nav.setFocus(document.getElementById('btn-vod-play'));
    }

    playActiveVod() {
        if (!this.activeVodItem) return;
        const ext = this.activeVodItem.e || 'mp4';
        const streamUrl = `${this.account.server}/movie/${this.account.username}/${this.account.password}/${this.activeVodItem.i}.${ext}`;

        const osdName = document.getElementById('osd-channel-name');
        const osdProg = document.getElementById('osd-program-name');
        const osdLogo = document.getElementById('osd-channel-logo');
        if (osdName) osdName.innerText = this.activeVodItem.n;
        if (osdProg) osdProg.innerText = 'Sinema Filmi';
        if (osdLogo) osdLogo.src = this.activeVodItem.p || '';

        this.closeModal();
        this.player.play(streamUrl);
        this.enterFullscreen();
    }

    toggleActiveVodFavorite() {
        this.showToast('⭐ Film favorilere eklendi!');
    }

    /* ==========================================================================
       SERIES (DİZİLER)
       ========================================================================== */
    renderSeriesCategories() {
        const listEl = document.getElementById('series-cat-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        this.seriesCategories.forEach((cat, idx) => {
            const div = document.createElement('div');
            div.className = `live-cat-item nav-item ${idx === 0 ? 'active' : ''}`;
            div.innerHTML = `<span>${cat.name}</span>`;
            div.addEventListener('click', () => {
                this.selectSeriesCategory(idx, cat);
            });
            listEl.appendChild(div);
        });
    }

    selectSeriesCategory(index, catObj) {
        const listEl = document.getElementById('series-cat-list');
        if (listEl) {
            listEl.querySelectorAll('.live-cat-item').forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });
        }

        const cat = catObj || this.seriesCategories[index];
        if (!cat) return;
        this.activeSeriesCategory = cat;

        const titleEl = document.getElementById('series-active-cat-title');
        if (titleEl) titleEl.innerText = cat.name;

        const searchInput = document.getElementById('series-search-input');
        if (searchInput) searchInput.value = '';

        const catSeries = this.series.filter(s => s.c === cat.id);
        this.renderSeriesGrid(catSeries);
    }

    filterSeries(query) {
        const q = (query || '').trim().toLowerCase();
        let pool = this.activeSeriesCategory ? this.series.filter(s => s.c === this.activeSeriesCategory.id) : this.series;

        if (!q) {
            this.renderSeriesGrid(pool);
            return;
        }

        const filtered = pool.filter(s => (s.n || '').toLowerCase().includes(q));
        this.renderSeriesGrid(filtered);
    }

    renderSeriesGrid(items) {
        const gridEl = document.getElementById('series-grid');
        const badgeEl = document.getElementById('series-count-badge');
        if (!gridEl) return;
        gridEl.innerHTML = '';

        if (badgeEl) badgeEl.innerText = `${items.length} Dizi`;

        if (!items.length) {
            gridEl.innerHTML = '<div style="padding:40px; color:var(--text-muted); text-align:center; grid-column:1/-1;">Bu kategoride dizi bulunamadı.</div>';
            return;
        }

        const limit = Math.min(items.length, 120);
        for (let i = 0; i < limit; i++) {
            const s = items[i];
            const card = document.createElement('div');
            card.className = 'poster-card nav-item';
            card.innerHTML = `
                <div class="poster-img-wrap">
                    <img src="${s.p || ''}" onerror="this.src='https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=300'"/>
                    ${s.r ? `<div class="poster-rating">★ ${s.r}</div>` : ''}
                </div>
                <div class="poster-info">
                    <div class="poster-title">${s.n}</div>
                    <div class="poster-year">${this.activeSeriesCategory ? this.activeSeriesCategory.name : 'Dizi'}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                this.openSeriesModal(s);
            });
            gridEl.appendChild(card);
        }
    }

    openSeriesModal(seriesItem) {
        this.activeSeriesItem = seriesItem;
        const sid = str(seriesItem.i);
        const details = this.seriesDetails[sid];

        const modal = document.getElementById('modal-series');
        document.getElementById('series-modal-title').innerText = seriesItem.n;
        document.getElementById('series-modal-cover').src = seriesItem.p || '';
        document.getElementById('series-modal-rating').innerText = seriesItem.r ? `⭐ ${seriesItem.r}` : '⭐ 8.2';
        document.getElementById('series-modal-plot').innerText = (details && details.plot) || seriesItem.plot || `${seriesItem.n} dizisinin tüm sezon ve bölümleri.`;

        modal.classList.remove('hidden');
        this.nav.currentView = 'MODAL';

        // Render Seasons
        const tabsBox = document.getElementById('series-season-tabs');
        tabsBox.innerHTML = '';

        let seasonKeys = [];
        if (details && details.episodes) {
            seasonKeys = Object.keys(details.episodes);
        } else {
            seasonKeys = ['1', '2', '3'];
        }

        seasonKeys.forEach((sNum, idx) => {
            const btn = document.createElement('button');
            btn.className = `season-tab-btn nav-item ${idx === 0 ? 'active' : ''}`;
            btn.innerText = `Sezon ${sNum}`;
            btn.addEventListener('click', () => {
                tabsBox.querySelectorAll('.season-tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
                this.renderSeriesEpisodes(sNum);
            });
            tabsBox.appendChild(btn);
        });

        if (seasonKeys.length > 0) {
            this.renderSeriesEpisodes(seasonKeys[0]);
        }
    }

    renderSeriesEpisodes(seasonNum) {
        const epBox = document.getElementById('series-episodes-list');
        epBox.innerHTML = '';

        const sid = str(this.activeSeriesItem.i);
        const details = this.seriesDetails[sid];
        let eps = [];

        if (details && details.episodes && details.episodes[seasonNum]) {
            eps = details.episodes[seasonNum];
        } else {
            // Mock episodes if not in pre-fetched top 40
            for (let i = 1; i <= 10; i++) {
                eps.push({
                    id: `${sid}-${seasonNum}-${i}`,
                    num: i,
                    title: `Sezon ${seasonNum} - Bölüm ${i}`,
                    ext: 'mp4'
                });
            }
        }

        eps.forEach(ep => {
            const card = document.createElement('div');
            card.className = 'episode-card nav-item';
            card.innerHTML = `
                <div class="ep-left">
                    <span class="ep-num">${ep.num || 1}</span>
                    <span class="ep-title">${ep.title || 'Bölüm'}</span>
                </div>
                <button class="ep-btn-play">▶ İzle</button>
            `;
            card.addEventListener('click', () => {
                this.playSeriesEpisode(ep);
            });
            epBox.appendChild(card);
        });
    }

    playSeriesEpisode(ep) {
        const ext = ep.ext || 'mp4';
        const streamUrl = `${this.account.server}/series/${this.account.username}/${this.account.password}/${ep.id}.${ext}`;

        const osdName = document.getElementById('osd-channel-name');
        const osdProg = document.getElementById('osd-program-name');
        const osdLogo = document.getElementById('osd-channel-logo');
        if (osdName) osdName.innerText = this.activeSeriesItem ? this.activeSeriesItem.n : 'Dizi';
        if (osdProg) osdProg.innerText = ep.title || 'Bölüm';
        if (osdLogo) osdLogo.src = this.activeSeriesItem ? this.activeSeriesItem.p : '';

        this.closeModal();
        this.player.play(streamUrl);
        this.enterFullscreen();
    }

    /* ==========================================================================
       FULLSCREEN & OSD
       ========================================================================== */
    enterFullscreen() {
        this.isFullscreen = true;
        this.nav.currentView = 'PLAYER';
        document.getElementById('fullscreen-player-layer').classList.remove('hidden');

        const vid = document.getElementById('main-video');
        document.getElementById('fullscreen-player-layer').prepend(vid);
        this.showOSD();
    }

    exitFullscreen() {
        this.isFullscreen = false;
        this.nav.currentView = this.currentView;
        document.getElementById('fullscreen-player-layer').classList.add('hidden');

        const vid = document.getElementById('main-video');
        document.getElementById('live-preview-box').prepend(vid);
    }

    showOSD() {
        const osd = document.getElementById('smarters-osd');
        if (!osd) return;
        osd.classList.remove('hidden');

        if (this.osdTimer) clearTimeout(this.osdTimer);
        this.osdTimer = setTimeout(() => {
            osd.classList.add('hidden');
        }, 4000);
    }

    /* ==========================================================================
       PARENTAL PIN MODAL
       ========================================================================== */
    openPinModal(callback) {
        this.enteredPin = '';
        this.pinCallback = callback;
        this.updatePinDots();
        const errEl = document.getElementById('pin-error-msg');
        if (errEl) errEl.innerText = '';

        document.getElementById('modal-pin').classList.remove('hidden');
        this.nav.currentView = 'MODAL';
    }

    enterPinDigit(digit) {
        if (this.enteredPin.length < 4) {
            this.enteredPin += digit;
            this.updatePinDots();
            if (this.enteredPin.length === 4) {
                setTimeout(() => this.submitPin(), 150);
            }
        }
    }

    deletePinDigit() {
        if (this.enteredPin.length > 0) {
            this.enteredPin = this.enteredPin.slice(0, -1);
            this.updatePinDots();
        }
    }

    updatePinDots() {
        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById(`pin-dot-${i}`);
            if (dot) dot.classList.toggle('filled', i <= this.enteredPin.length);
        }
    }

    submitPin() {
        const storedPin = localStorage.getItem('iptv_parental_pin') || '0000';
        if (this.enteredPin === storedPin) {
            this.isAdultUnlocked = true;
            this.closeModal();
            this.showToast('✅ Ebeveyn kilidi açıldı!');
            if (this.pinCallback) {
                this.pinCallback();
                this.pinCallback = null;
            }
        } else {
            const errEl = document.getElementById('pin-error-msg');
            if (errEl) errEl.innerText = 'Hatalı PIN! Lütfen tekrar deneyin.';
            this.enteredPin = '';
            this.updatePinDots();
        }
    }

    /* ==========================================================================
       SETTINGS MODAL
       ========================================================================== */
    openSettings() {
        document.getElementById('modal-settings').classList.remove('hidden');
        this.nav.currentView = 'MODAL';
        this.switchSettingsTab('account');
    }

    switchSettingsTab(tabName) {
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('onclick').includes(tabName));
        });
        document.querySelectorAll('.settings-pane').forEach(p => p.classList.add('hidden'));

        const targetPane = document.getElementById(`set-tab-${tabName}`);
        if (targetPane) targetPane.classList.remove('hidden');
    }

    changePin() {
        const oldPin = document.getElementById('input-old-pin').value;
        const newPin = document.getElementById('input-new-pin').value;
        const currentPin = localStorage.getItem('iptv_parental_pin') || '0000';

        if (oldPin !== currentPin) {
            alert('Mevcut PIN hatalı!');
            return;
        }
        if (!newPin || newPin.length !== 4 || isNaN(newPin)) {
            alert('Yeni PIN 4 haneli bir sayı olmalıdır!');
            return;
        }

        localStorage.setItem('iptv_parental_pin', newPin);
        this.showToast('✅ PIN kodu başarıyla güncellendi!');
        document.getElementById('input-old-pin').value = '';
        document.getElementById('input-new-pin').value = '';
    }

    setStreamFormat(format) {
        this.streamFormat = format;
        localStorage.setItem('iptv_stream_format', format);
        this.showToast(`Yayın formatı: ${format.toUpperCase()} olarak ayarlandı.`);
    }

    async reloadCatalog() {
        this.showToast('🔄 Veriler yenileniyor...');
        await this.loadCatalogData();
        this.showToast('✅ Veri yenileme tamamlandı.');
        this.closeModal();
    }

    clearAppCache() {
        localStorage.clear();
        this.showToast('🗑️ Önbellek temizlendi. Yeniden başlatılıyor...');
        setTimeout(() => location.reload(), 1000);
    }

    showToast(msg) {
        const el = document.getElementById('toast-msg');
        if (!el) return;
        el.innerText = msg;
        el.classList.remove('hidden');

        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            el.classList.add('hidden');
        }, 3000);
    }
}

// Utility for str
function str(val) {
    return val !== undefined && val !== null ? String(val) : '';
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new IPTVSmartersApp();
});
