export function formatDmTime(date: Date): string {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (diffDays === 1) return 'Dün';

    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    if (diffDays < 7) return days[date.getDay()];

    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getZodiac(birthDate: Date): string {
    const m = birthDate.getMonth() + 1;
    const d = birthDate.getDate();
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Koç';
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Boğa';
    if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'İkizler';
    if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Yengeç';
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Aslan';
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Başak';
    if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Terazi';
    if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Akrep';
    if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Yay';
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Oğlak';
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Kova';
    return 'Balık';
}
