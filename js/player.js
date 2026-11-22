/**
 * Universal TV Video Player Engine
 * Supports:
 * - mpegts.js (Hardware-accelerated MSE demuxing for raw MPEG-TS .ts live streams)
 * - Hls.js (M3U8 HLS streams)
 * - Samsung Tizen AVPlay (webapis.avplay)
 * - Native HTML5 Video (.mp4, .mkv)
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
            console.error('[Player] Video element hatası:', e);
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
            } catch (e) {}
            this.mpegtsPlayer = null;
        }

        if (this.hls) {
            try {
                this.hls.destroy();
            } catch (e) {}
            this.hls = null;
        }

        if (this.isTizenNative) {
            try {
                webapis.avplay.stop();
                webapis.avplay.close();
            } catch (e) {}
        }
    }

    play(streamUrl) {
        if (!streamUrl) return;
        this.currentStreamUrl = streamUrl;

        console.log('[Player] Oynatma isteği:', streamUrl);
        if (this.onStateChange) this.onStateChange('loading');

        this.destroyActiveEngines();

        // Pass through local proxy to bypass CORS and follow internal redirects
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;

        // 1. Tizen Native AVPlay check
        if (this.isTizenNative) {
            try {
                webapis.avplay.open(proxyUrl);
                webapis.avplay.setDisplayRect(0, 0, window.innerWidth, window.innerHeight);
                webapis.avplay.prepareAsync(() => {
                    webapis.avplay.play();
                }, (err) => {
                    console.warn('[AVPlay] Hata, fallback deneniyor:', err);
                    this.playWithWeb(proxyUrl, streamUrl);
                });
                return;
            } catch (err) {
                console.warn('[AVPlay] Başlatılamadı:', err);
            }
        }

        this.playWithWeb(proxyUrl, streamUrl);
    }

    playWithWeb(proxyUrl, originalUrl) {
        const isTs = originalUrl.includes('.ts') || originalUrl.includes('output=mpegts');
        const isM3u8 = originalUrl.includes('.m3u8');

        // 2. MPEG-TS Live Stream via mpegts.js (Transmuxes .ts to MP4 MSE in browser)
        if (isTs && window.mpegts && window.mpegts.isSupported()) {
            console.log('[Player] mpegts.js motoru başlatılıyor...');
            try {
                this.mpegtsPlayer = window.mpegts.createPlayer({
                    type: 'mse',
                    isLive: true,
                    url: proxyUrl
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
                this.mpegtsPlayer.play().catch(e => console.warn('[mpegts] Autoplay:', e));

                this.mpegtsPlayer.on(window.mpegts.Events.ERROR, (type, detail, info) => {
                    console.warn('[mpegts] Hata:', type, detail, info);
                });
                return;
            } catch (err) {
                console.warn('[mpegts] Başlatma hatası:', err);
            }
        }

        // 3. HLS Stream via Hls.js
        if (isM3u8 && window.Hls && window.Hls.isSupported()) {
            console.log('[Player] Hls.js motoru başlatılıyor...');
            this.hls = new window.Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 30
            });
            this.hls.loadSource(proxyUrl);
            this.hls.attachMedia(this.videoEl);
            this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                this.videoEl.play().catch(e => console.warn('[Hls] Autoplay:', e));
            });
            return;
        }

        // 4. Fallback Native HTML5 Video (MP4 / WebM / Native HLS)
        this.videoEl.src = proxyUrl;
        this.videoEl.load();
        this.videoEl.play().catch(e => console.warn('[NativeVideo] Play:', e));
    }

    toggleAspectRatio() {
        this.currentAspectIndex = (this.currentAspectIndex + 1) % this.aspectRatios.length;
        const mode = this.aspectRatios[this.currentAspectIndex];
        this.videoEl.style.objectFit = mode;
        console.log('[Player] En-Boy Oranı:', mode);
        return mode;
    }

    stop() {
        this.destroyActiveEngines();
        if (this.videoEl) {
            this.videoEl.pause();
            this.videoEl.removeAttribute('src');
            this.videoEl.load();
        }
    }
}

window.VideoPlayer = VideoPlayer;
