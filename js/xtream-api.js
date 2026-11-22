/**
 * Xtream Codes API Client & Auto-Detector
 */
const XtreamAPI = {
    // Check if an M3U URL is an Xtream Codes link and extract credentials
    parseXtreamFromUrl(m3uUrl) {
        if (!m3uUrl) return null;
        try {
            const parsed = new URL(m3uUrl);
            const username = parsed.searchParams.get('username');
            const password = parsed.searchParams.get('password');
            if (username && password) {
                return {
                    server: `${parsed.protocol}//${parsed.host}`,
                    username,
                    password
                };
            }
        } catch (e) {}
        return null;
    },

    async testConnection(server, username, password) {
        const cleanServer = server.replace(/\/+$/, '');
        const targetUrl = `${cleanServer}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;

        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Sunucu yanıt vermedi: HTTP ${res.status}`);
        const data = await res.json();
        if (data.user_info && data.user_info.auth === 1) {
            return data;
        } else if (data.user_info && data.user_info.auth === 0) {
            throw new Error('Kullanıcı adı veya şifre hatalı!');
        }
        return data;
    },

    async getLiveCategories(server, username, password) {
        return this.query(server, username, password, 'get_live_categories');
    },

    async getLiveStreams(server, username, password, categoryId = '') {
        const action = categoryId ? `get_live_streams&category_id=${categoryId}` : 'get_live_streams';
        return this.query(server, username, password, action);
    },

    async getVodCategories(server, username, password) {
        return this.query(server, username, password, 'get_vod_categories');
    },

    async getVodStreams(server, username, password, categoryId = '') {
        const action = categoryId ? `get_vod_streams&category_id=${categoryId}` : 'get_vod_streams';
        return this.query(server, username, password, action);
    },

    async getSeriesCategories(server, username, password) {
        return this.query(server, username, password, 'get_series_categories');
    },

    async getSeries(server, username, password, categoryId = '') {
        const action = categoryId ? `get_series&category_id=${categoryId}` : 'get_series';
        return this.query(server, username, password, action);
    },

    async getSeriesInfo(server, username, password, seriesId) {
        return this.query(server, username, password, `get_series_info&series_id=${seriesId}`);
    },

    async getShortEPG(server, username, password, streamId) {
        return this.query(server, username, password, `get_short_epg&stream_id=${streamId}&limit=5`);
    },

    async query(server, username, password, action) {
        const cleanServer = server.replace(/\/+$/, '');
        const targetUrl = `${cleanServer}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${action}`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;

        try {
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn(`[Xtream] ${action} hatası:`, e.message);
            return [];
        }
    },

    getStreamUrl(server, username, password, streamId, containerExtension = 'ts', type = 'live') {
        const cleanServer = server.replace(/\/+$/, '');
        if (type === 'live') {
            return `${cleanServer}/live/${username}/${password}/${streamId}.${containerExtension}`;
        } else if (type === 'movie') {
            return `${cleanServer}/movie/${username}/${password}/${streamId}.${containerExtension || 'mp4'}`;
        } else if (type === 'series') {
            return `${cleanServer}/series/${username}/${password}/${streamId}.${containerExtension || 'mp4'}`;
        }
        return '';
    }
};

window.XtreamAPI = XtreamAPI;
