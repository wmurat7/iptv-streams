/**
 * Universal TV Video Player Engine
 * Supports:
 * - Direct stream playback (Zero PC dependence)
 * - Samsung Tizen AVPlay (webapis.avplay)
 * - Native HTML5 Video (.ts, .m3u8, .mp4, .mkv)
 * - mpegts.js & Hls.js fallback
 */
class VideoPlayer {
    constructor(videoElementId) {
        this.videoEl = document.getElementById(videoElementId);
        this.hls = null;
        this.mpegtsPlayer = null;
        this.currentStreamUrl = '';
        this.isTizenNative = typeof tizen !== 'undefined' && typeof webapis !== 'undefined' && webapis.avplay;
        this.aspectRatios = ['contain', 'cover', 'fill'];
        this.currentAspectIndex = 0;

        this.initEvents();
    }

    initEvents() {
        if (!this.videoEl) return;

        this.videoEl.addEventListener('playing', () => {
            console.log('[Player] Oynatılıyor');
            if (this.onStateChange) this.onStateChange('playing');
        });

        this.videoEl.addEventListener('waiting', () => {
            console.log('[Player] Ara belleğe alınıyor (Buffering)...');
            if (this.onStateChange) this.onStateChange('buffering');
        });

        this.videoEl.addEventListener('error', (e) => {
            console.warn('[Player] Video element hatası:', e);
            if (this.onStateChange) this.onStateChange('error');
        });
    }

    destroyActiveEngines() {
        if (this.mpegtsPlayer) {
            try {
                this.mpegtsPlayer.pause();
                this.mpegtsPlayer.unload();
                this.mpegtsPlayer.detachMediaElement();
                this.mpegtsPlayer.destroy();
            } catch (e) { }
            this.mpegtsPlayer = null;
        }

        if (this.hls) {
            try {
                this.hls.destroy();
            } catch (e) { }
            this.hls = null;
        }

        if (this.isTizenNative) {
            try {
                webapis.avplay.stop();
                webapis.avplay.close();
            } catch (e) { }
        }
    }

    play(streamUrl) {
        if (!streamUrl) return;
        this.currentStreamUrl = streamUrl;

        console.log('[Player] Oynatma isteği:', streamUrl);
        if (this.onStateChange) this.onStateChange('loading');

        this.destroyActiveEngines();

        // If running in local PC dev server (port 3000), route via proxy to prevent browser CORS
        const isLocalDev = window.location.port === '3000';
        const targetUrl = isLocalDev ? `/api/proxy?url=${encodeURIComponent(streamUrl)}` : streamUrl;

        // 1. Tizen Native AVPlay check
        if (this.isTizenNative) {
            try {
                webapis.avplay.open(targetUrl);
                webapis.avplay.setDisplayRect(0, 0, window.innerWidth, window.innerHeight);
                webapis.avplay.prepareAsync(() => {
                    webapis.avplay.play();
                }, (err) => {
                    console.warn('[AVPlay] Fallback deneniyor:', err);
                    this.playWithWeb(targetUrl, streamUrl);
                });
                return;
            } catch (err) {
                console.warn('[AVPlay] Başlatılamadı:', err);
            }
        }

        this.playWithWeb(targetUrl, streamUrl);
    }

    playWithWeb(targetUrl, originalUrl) {
        const isTs = originalUrl.includes('.ts') || originalUrl.includes('output=mpegts');
        const isM3u8 = originalUrl.includes('.m3u8');

        // 2. MPEG-TS Live Stream via mpegts.js (MSE demuxing)
        if (isTs && window.mpegts && window.mpegts.isSupported()) {
            try {
                this.mpegtsPlayer = window.mpegts.createPlayer({
                    type: 'mse',
                    isLive: true,
                    url: targetUrl
                }, {
                    enableWorker: true,
                    lazyLoad: false,
                    liveBufferLatencyChasing: true,
                    liveBufferLatencyMaxLatency: 3.0,
                    liveBufferLatencyMinRemain: 1.0,
                    autoCleanupSourceBuffer: true
                });

                this.mpegtsPlayer.attachMediaElement(this.videoEl);
                this.mpegtsPlayer.load();
                this.mpegtsPlayer.play().catch(e => {
                    console.warn('[mpegts] Autoplay fallback:', e);
                    this.videoEl.src = targetUrl;
                    this.videoEl.play().catch(() => { });
                });

                this.mpegtsPlayer.on(window.mpegts.Events.ERROR, (type, detail, info) => {
                    console.warn('[mpegts] Hata, doğrudan video elementine geçiliyor:', type);
                    this.destroyActiveEngines();
                    this.videoEl.src = targetUrl;
                    this.videoEl.play().catch(() => { });
                });
                return;
            } catch (err) {
                console.warn('[mpegts] Başlatma hatası:', err);
            }
        }

        // 3. HLS Stream via Hls.js
        if (isM3u8 && window.Hls && window.Hls.isSupported()) {
            try {
                this.hls = new window.Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 30
                });
                this.hls.loadSource(targetUrl);
                this.hls.attachMedia(this.videoEl);
                this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                    this.videoEl.play().catch(e => console.warn('[Hls] Autoplay:', e));
                });
                return;
            } catch (err) {
                console.warn('[Hls] Başlatma hatası:', err);
            }
        }

        // 4. Fallback Native HTML5 Video Tag (MP4 / WebM / Native HLS / TV hardware decode)
        this.videoEl.src = targetUrl;
        this.videoEl.play().catch(e => console.warn('[Native Video] Autoplay:', e));
    }

    toggleAspectRatio() {
        this.currentAspectIndex = (this.currentAspectIndex + 1) % this.aspectRatios.length;
        const ratio = this.aspectRatios[this.currentAspectIndex];
        if (this.videoEl) {
            this.videoEl.style.objectFit = ratio;
        }
        if (window.app && window.app.showToast) {
            window.app.showToast(`En-Boy Oranı: ${ratio.toUpperCase()}`);
        }
    }
}

window.VideoPlayer = VideoPlayer;
