/**
 * Persistent Favorites Manager
 */
const FavoritesManager = {
    KEY: 'iptv_smarters_favorites',

    getFavorites() {
        try {
            const data = localStorage.getItem(this.KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    isFavorite(id) {
        const favs = this.getFavorites();
        return favs.some(item => item.id === id);
    },

    toggleFavorite(item) {
        let favs = this.getFavorites();
        const existsIdx = favs.findIndex(f => f.id === item.id);
        if (existsIdx !== -1) {
            favs.splice(existsIdx, 1);
        } else {
            favs.unshift(item);
        }
        localStorage.setItem(this.KEY, JSON.stringify(favs));
        return existsIdx === -1; // true if added, false if removed
    }
};

window.FavoritesManager = FavoritesManager;
