/**
 * Electronic Program Guide (EPG) Engine
 */
const EPGManager = {
    // Generate realistic EPG schedule if provider EPG is missing
    getProgramForChannel(channelName) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDayTimeMinutes = currentHour * 60 + currentMinute;

        // Common program blocks by genre
        let title = 'Canlı Yayın';
        let nextTitle = 'Günün Özeti';
        let desc = 'Canlı televizyon yayını ve güncel program akışı.';

        const lower = (channelName || '').toLowerCase();
        if (lower.includes('haber') || lower.includes('news')) {
            if (currentHour >= 19 && currentHour < 21) {
                title = 'Ana Haber Bülteni';
                nextTitle = 'Günün Analizi ve Yorumlar';
            } else if (currentHour >= 6 && currentHour < 10) {
                title = 'Sabah Haberleri ve Basın Özeti';
                nextTitle = 'Ekonomi Dünyası';
            } else {
                title = 'Gün Ortası Canlı Haber Kuşağı';
                nextTitle = 'Gelişmeler & Son Dakika';
            }
            desc = 'Türkiye ve dünyadan sıcak gelişmeler, canlı bağlantılar ve uzman yorumları.';
        } else if (lower.includes('spor') || lower.includes('sport')) {
            title = 'Canlı Spor Bülteni & Maç Saati';
            nextTitle = 'Günün Golleri ve Özetler';
            desc = 'Liglerden en son haberler, canlı skorlar ve transfer gündemi.';
        } else if (lower.includes('belgesel') || lower.includes('doc') || lower.includes('nat') || lower.includes('wild')) {
            title = 'Vahşi Doğa ve Yaşam Mücadelesi';
            nextTitle = 'Mühendislik Harikaları';
            desc = 'Dünyanın en zorlu coğrafyalarında hayatta kalma mücadelesi ve keşifler.';
        } else if (lower.includes('çocuk') || lower.includes('kids') || lower.includes('kartoon')) {
            title = 'Çizgi Dizi & Macera Kuşağı';
            nextTitle = 'Eğlenceli Oyun Zamanı';
            desc = 'Çocuklar için eğitici ve eğlenceli çizgi maceralar.';
        } else if (lower.includes('müzik') || lower.includes('music')) {
            title = 'Hit 40 & En Çok Dinlenenler';
            nextTitle = 'Akustik Performanslar';
            desc = 'Haftanın en popüler şarkıları ve unutulmaz klipler.';
        } else {
            if (currentHour >= 20 && currentHour < 23) {
                title = 'Akşam Sineması & Yerli Dizi';
                nextTitle = 'Gece Sineması';
            } else {
                title = 'Gündüz Kuşağı ve Magazin';
                nextTitle = 'Kültür & Sanat';
            }
        }

        // Program duration (typically 60-90 mins)
        const blockStartMinute = Math.floor(currentMinute / 30) * 30;
        const start = new Date(now);
        start.setMinutes(blockStartMinute, 0, 0);

        const end = new Date(start);
        end.setMinutes(start.getMinutes() + 60);

        const totalSeconds = (end - start) / 1000;
        const elapsedSeconds = (now - start) / 1000;
        const progress = Math.min(100, Math.max(0, Math.round((elapsedSeconds / totalSeconds) * 100)));

        const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        return {
            title,
            nextTitle,
            description: desc,
            startTime: formatTime(start),
            endTime: formatTime(end),
            progress
        };
    }
};

window.EPGManager = EPGManager;
