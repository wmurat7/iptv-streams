/**
 * Advanced M3U / M3U8 Segmented Parser (Live, Movies, Series)
 */
const M3UParser = {
    // Rich demo content covering Live TV, Movies & Series
    getDemoDatabase() {
        const live = [
            { id: 'live-1', num: 1, name: 'TRT 1 HD', category: 'Ulusal', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/TRT_1_logo.svg/300px-TRT_1_logo.svg.png', url: 'https://tv-trt1.medya.trt.com.tr/master.m3u8' },
            { id: 'live-2', num: 2, name: 'TRT Haber HD', category: 'Haber', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/TRT_Haber_logo.svg/300px-TRT_Haber_logo.svg.png', url: 'https://tv-trthaber.medya.trt.com.tr/master.m3u8' },
            { id: 'live-3', num: 3, name: 'TRT Spor HD', category: 'Spor', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/TRT_Spor_logo.svg/300px-TRT_Spor_logo.svg.png', url: 'https://tv-trtspor1.medya.trt.com.tr/master.m3u8' },
            { id: 'live-4', num: 4, name: 'TRT Belgesel HD', category: 'Belgesel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/TRT_Belgesel_logo.svg/300px-TRT_Belgesel_logo.svg.png', url: 'https://tv-trtbelgesel.medya.trt.com.tr/master.m3u8' },
            { id: 'live-5', num: 5, name: 'TRT Müzik HD', category: 'Müzik', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/TRT_M%C3%BCzik_logo.svg/300px-TRT_M%C3%BCzik_logo.svg.png', url: 'https://tv-trtmuzik.medya.trt.com.tr/master.m3u8' },
            { id: 'live-6', num: 6, name: 'TRT Çocuk HD', category: 'Çocuk', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/TRT_%C3%87ocuk_logo.svg/300px-TRT_%C3%87ocuk_logo.svg.png', url: 'https://tv-trtcocuk.medya.trt.com.tr/master.m3u8' },
            { id: 'live-7', num: 7, name: 'NASA TV UHD', category: 'Belgesel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/300px-NASA_logo.svg.png', url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8' },
            { id: 'live-8', num: 8, name: 'Red Bull TV Live', category: 'Spor', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Red_Bull_TV_logo.svg/300px-Red_Bull_TV_logo.svg.png', url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8' }
        ];

        const movies = [
            {
                id: 'mov-1',
                name: 'Big Buck Bunny (4K Ultra HD)',
                category: 'Animasyon / Aile',
                rating: '8.4',
                year: '2023',
                poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/300px-Big_buck_bunny_poster_big.jpg',
                backdrop: 'https://peach.blender.org/wp-content/uploads/bbb-splash.png',
                desc: 'Büyük ve sevimli bir tavşanın ormandaki eğlenceli ve komik macerası.',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            },
            {
                id: 'mov-2',
                name: 'Tears of Steel (Sci-Fi Action)',
                category: 'Bilim Kurgu',
                rating: '7.9',
                year: '2022',
                poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Tears_of_steel_poster.jpg/300px-Tears_of_steel_poster.jpg',
                backdrop: 'https://mango.blender.org/wp-content/uploads/2012/09/01_thom_celia_bridge.jpg',
                desc: 'Gelecekte robot istilasına karşı eski bir ekibin bir araya gelerek verdiği destansı mücadele.',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
            },
            {
                id: 'mov-3',
                name: 'Sintel - Ejderha Arayışı',
                category: 'Fantastik / Macera',
                rating: '8.1',
                year: '2023',
                poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/300px-Sintel_poster.jpg',
                backdrop: 'https://durian.blender.org/wp-content/uploads/2010/05/sintel_concept_art.jpg',
                desc: 'Yaralı bir bebek ejderhayı kurtarıp büyüten genç bir kızın duygu yüklü ve tehlikeli yolculuğu.',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
            }
        ];

        const series = [
            {
                id: 'ser-1',
                name: 'Gezegenimiz & Doğa (Doğa Serisi)',
                category: 'Belgesel Dizi',
                rating: '9.2',
                year: '2023',
                poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
                desc: 'Dünyanın en bakir doğa harikalarını ve vahşi yaşamı konu alan nefes kesici belgesel dizisi.',
                seasons: [
                    {
                        season_number: 1,
                        name: '1. Sezon',
                        episodes: [
                            { id: 'ser-1-1', title: '1. Bölüm: Okyanusların Derinlikleri', duration: '50 dk', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
                            { id: 'ser-1-2', title: '2. Bölüm: Yağmur Ormanları ve Gizem', duration: '48 dk', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' }
                        ]
                    }
                ]
            }
        ];

        return { live, movies, series };
    },

    async parse(text) {
        return new Promise((resolve) => {
            const lines = text.split(/\r?\n/);
            const live = [];
            const movies = [];
            const series = [];

            let current = null;
            let index = 1;

            const liveCatSet = new Set(['Tüm Kanallar']);
            const movieCatSet = new Set(['Tüm Filmler']);
            const seriesCatSet = new Set(['Tüm Diziler']);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                if (line.startsWith('#EXTINF:')) {
                    current = {
                        id: `item-${index}`,
                        num: index,
                        name: 'Bilinmeyen',
                        category: 'Genel',
                        logo: '',
                        url: '',
                        type: 'live' // 'live', 'movie', 'series'
                    };

                    const nameMatch = line.match(/tvg-name="([^"]+)"/i);
                    const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                    const groupMatch = line.match(/group-title="([^"]+)"/i);

                    const commaIdx = line.lastIndexOf(',');
                    if (commaIdx !== -1) {
                        current.name = line.substring(commaIdx + 1).trim();
                    } else if (nameMatch) {
                        current.name = nameMatch[1];
                    }

                    if (logoMatch && logoMatch[1]) current.logo = logoMatch[1];
                    if (groupMatch && groupMatch[1]) current.category = groupMatch[1].trim();

                    // Detect VOD / Series vs Live from group title & name
                    const catLower = current.category.toLowerCase();
                    const nameLower = current.name.toLowerCase();

                    if (catLower.includes('dizi') || catLower.includes('series') || nameLower.includes('s01') || nameLower.includes('s02')) {
                        current.type = 'series';
                        seriesCatSet.add(current.category);
                    } else if (catLower.includes('film') || catLower.includes('movie') || catLower.includes('vod') || catLower.includes('sinema')) {
                        current.type = 'movie';
                        movieCatSet.add(current.category);
                    } else {
                        current.type = 'live';
                        liveCatSet.add(current.category);
                    }
                } else if (line.startsWith('http://') || line.startsWith('https://')) {
                    if (current) {
                        current.url = line;
                        if (current.type === 'movie') {
                            movies.push(current);
                        } else if (current.type === 'series') {
                            series.push(current);
                        } else {
                            live.push(current);
                        }
                        index++;
                        current = null;
                    }
                }
            }

            // Fallback: If no movies/series identified, put test movies/series so tabs are not blank
            const demo = this.getDemoDatabase();
            const finalMovies = movies.length > 0 ? movies : demo.movies;
            const finalSeries = series.length > 0 ? series : demo.series;

            resolve({
                live,
                movies: finalMovies,
                series: finalSeries,
                liveCategories: Array.from(liveCatSet).map(name => ({ name, count: name === 'Tüm Kanallar' ? live.length : live.filter(c => c.category === name).length })),
                movieCategories: Array.from(movieCatSet).map(name => ({ name, count: name === 'Tüm Filmler' ? finalMovies.length : finalMovies.filter(c => c.category === name).length })),
                seriesCategories: Array.from(seriesCatSet).map(name => ({ name, count: name === 'Tüm Diziler' ? finalSeries.length : finalSeries.filter(c => c.category === name).length }))
            });
        });
    },

    async fetchFromUrl(url) {
        try {
            const res = await fetch(url, { headers: { 'Accept': '*/*' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            return await this.parse(text);
        } catch (err) {
            console.warn('[M3U] Proxy deneniyor...', err.message);
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
            const proxyRes = await fetch(proxyUrl);
            if (!proxyRes.ok) throw new Error(`HTTP ${proxyRes.status}`);
            const text = await proxyRes.text();
            return await this.parse(text);
        }
    }
};

window.M3UParser = M3UParser;
