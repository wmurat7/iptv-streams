/**
 * Universal Samsung TV Remote & Keyboard D-Pad Navigation Engine
 */
class TVNavigation {
    constructor(app) {
        this.app = app;
        this.currentView = 'DASHBOARD'; // 'DASHBOARD', 'LIVE', 'MOVIES', 'SERIES', 'PLAYER', 'MODAL'
        this.activeElement = null;

        this.initKeyCodes();
        this.bindEvents();
    }

    initKeyCodes() {
        this.KEYS = {
            UP: [38],
            DOWN: [40],
            LEFT: [37],
            RIGHT: [39],
            ENTER: [13],
            RETURN: [10009, 27, 8, 4], // Tizen 10009, Esc 27, Backspace 8, Android 4
            CH_UP: [427, 33],
            CH_DOWN: [428, 34],
            RED: [403, 112],
            GREEN: [404, 113],
            YELLOW: [405, 114],
            BLUE: [406, 115]
        };

        if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
            const keysToRegister = [
                'MediaPlay', 'MediaPause', 'MediaStop',
                'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue',
                'ChannelUp', 'ChannelDown'
            ];
            keysToRegister.forEach(k => {
                try { tizen.tvinputdevice.registerKey(k); } catch (e) {}
            });
        }
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Browser Popstate (History Back Button / Gesture)
        window.addEventListener('popstate', (e) => {
            if (this.currentView === 'PLAYER') {
                this.app.exitFullscreen();
                return;
            }
            if (this.app.isAnyModalOpen()) {
                this.app.closeModal();
                return;
            }
            if (e.state && e.state.view) {
                this.app.switchView(e.state.view, false);
            } else {
                this.app.switchView('DASHBOARD', false);
            }
        });
    }

    matches(group, code) {
        return this.KEYS[group] && this.KEYS[group].includes(code);
    }

    isReturnKey(e) {
        return this.matches('RETURN', e.keyCode) ||
               e.key === 'Backspace' || e.key === 'Escape' ||
               e.key === 'GoBack' || e.key === 'BrowserBack';
    }

    handleKeyDown(e) {
        // Prevent backspace from navigating away from page if not in text input
        if (this.isReturnKey(e)) {
            const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
            if (!isInput) {
                e.preventDefault();
                e.stopPropagation();
                this.handleReturn();
                return;
            }
        }

        const code = e.keyCode;

        // In Fullscreen Playing Mode
        if (this.currentView === 'PLAYER') {
            this.handlePlayerNav(e, code);
            return;
        }

        // Directional navigation
        if (this.matches('UP', code)) {
            e.preventDefault();
            this.navigate('UP');
        } else if (this.matches('DOWN', code)) {
            e.preventDefault();
            this.navigate('DOWN');
        } else if (this.matches('LEFT', code)) {
            e.preventDefault();
            this.navigate('LEFT');
        } else if (this.matches('RIGHT', code)) {
            e.preventDefault();
            this.navigate('RIGHT');
        } else if (this.matches('ENTER', code)) {
            e.preventDefault();
            this.handleEnter();
        } else if (this.matches('RED', code)) {
            e.preventDefault();
            this.app.toggleActiveFavorite();
        } else if (this.matches('GREEN', code)) {
            e.preventDefault();
            this.app.player.toggleAspectRatio();
        } else if (this.matches('YELLOW', code)) {
            e.preventDefault();
            this.app.openSettings();
        }
    }

    handlePlayerNav(e, code) {
        this.app.showOSD();

        if (this.isReturnKey(e) || this.matches('ENTER', code)) {
            e.preventDefault();
            this.app.exitFullscreen();
        } else if (this.matches('UP', code) || this.matches('CH_UP', code)) {
            e.preventDefault();
            this.app.zapChannel(-1);
        } else if (this.matches('DOWN', code) || this.matches('CH_DOWN', code)) {
            e.preventDefault();
            this.app.zapChannel(1);
        } else if (this.matches('GREEN', code)) {
            e.preventDefault();
            this.app.player.toggleAspectRatio();
        }
    }

    handleReturn() {
        console.log('[Nav] Geri tuşuna basıldı. Mevcut görünüm:', this.currentView);

        // 1. If Fullscreen Video
        if (this.currentView === 'PLAYER') {
            this.app.exitFullscreen();
            return;
        }

        // 2. If Modal is open
        if (this.app.isAnyModalOpen()) {
            this.app.closeModal();
            return;
        }

        // 3. If in LIVE TV
        if (this.currentView === 'LIVE') {
            const focused = document.querySelector('.nav-item.focused');
            const inChannels = focused && (focused.classList.contains('live-channel-card') || focused.closest('#live-ch-list') || focused.closest('.live-col-preview'));
            
            // If focused on channel or preview, move focus back to categories first
            if (inChannels) {
                const activeCat = document.querySelector('.live-cat-item.active') || document.querySelector('.live-cat-item');
                if (activeCat) {
                    this.setFocus(activeCat);
                    return;
                }
            }
            // If already in categories (or no category focused), go back to Dashboard!
            this.app.switchView('DASHBOARD');
            return;
        }

        // 4. If in MOVIES or SERIES
        if (this.currentView === 'MOVIES' || this.currentView === 'SERIES') {
            const focused = document.querySelector('.nav-item.focused');
            const inGrid = focused && (focused.classList.contains('poster-card') || focused.closest('.poster-grid'));

            // If focused in grid, move back to categories list
            if (inGrid) {
                const isMovie = this.currentView === 'MOVIES';
                const listEl = document.getElementById(isMovie ? 'movie-cat-list' : 'series-cat-list');
                const activeCat = listEl ? (listEl.querySelector('.live-cat-item.active') || listEl.querySelector('.live-cat-item')) : null;
                if (activeCat) {
                    this.setFocus(activeCat);
                    return;
                }
            }
            // If already in categories, go back to Dashboard!
            this.app.switchView('DASHBOARD');
            return;
        }

        // 5. If in Dashboard, nothing to return to
        console.log('[Nav] Zaten Ana Ekrandasınız.');
    }

    navigate(direction) {
        const focusable = Array.from(document.querySelectorAll('.app-view:not(.hidden) .nav-item, .modal-overlay:not(.hidden) .nav-item'));
        if (!focusable.length) return;

        let currentIndex = focusable.indexOf(document.activeElement);
        if (currentIndex === -1) {
            currentIndex = focusable.findIndex(el => el.classList.contains('focused'));
        }
        if (currentIndex === -1) currentIndex = 0;

        const currentRect = focusable[currentIndex].getBoundingClientRect();
        let bestCandidate = null;
        let minDistance = Infinity;

        focusable.forEach((target, i) => {
            if (i === currentIndex) return;
            const targetRect = target.getBoundingClientRect();

            let isEligible = false;
            let primaryDist = 0;
            let secondaryDist = 0;

            if (direction === 'RIGHT' && targetRect.left >= currentRect.right - 5) {
                isEligible = true;
                primaryDist = targetRect.left - currentRect.right;
                secondaryDist = Math.abs(targetRect.top - currentRect.top);
            } else if (direction === 'LEFT' && targetRect.right <= currentRect.left + 5) {
                isEligible = true;
                primaryDist = currentRect.left - targetRect.right;
                secondaryDist = Math.abs(targetRect.top - currentRect.top);
            } else if (direction === 'DOWN' && targetRect.top >= currentRect.bottom - 5) {
                isEligible = true;
                primaryDist = targetRect.top - currentRect.bottom;
                secondaryDist = Math.abs(targetRect.left - currentRect.left);
            } else if (direction === 'UP' && targetRect.bottom <= currentRect.top + 5) {
                isEligible = true;
                primaryDist = currentRect.top - targetRect.bottom;
                secondaryDist = Math.abs(targetRect.left - currentRect.left);
            }

            if (isEligible) {
                const totalDist = primaryDist * 1.5 + secondaryDist;
                if (totalDist < minDistance) {
                    minDistance = totalDist;
                    bestCandidate = target;
                }
            }
        });

        if (!bestCandidate) {
            if (direction === 'DOWN' || direction === 'RIGHT') {
                bestCandidate = focusable[Math.min(focusable.length - 1, currentIndex + 1)];
            } else if (direction === 'UP' || direction === 'LEFT') {
                bestCandidate = focusable[Math.max(0, currentIndex - 1)];
            }
        }

        if (bestCandidate) {
            this.setFocus(bestCandidate);
        }
    }

    setFocus(element) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('focused'));
        if (element) {
            element.classList.add('focused');
            element.focus();
            element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            this.activeElement = element;
        }
    }

    handleEnter() {
        const focused = document.querySelector('.nav-item.focused');
        if (focused) {
            focused.click();
        }
    }
}

window.TVNavigation = TVNavigation;
