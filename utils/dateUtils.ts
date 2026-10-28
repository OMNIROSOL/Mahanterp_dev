export const LUSAKA_TIMEZONE = 'Africa/Lusaka';

export const formatTimestamp = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: LUSAKA_TIMEZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        const parts = formatter.formatToParts(date);
        const day = parts.find(p => p.type === 'day')?.value || '';
        const month = parts.find(p => p.type === 'month')?.value || '';
        const year = parts.find(p => p.type === 'year')?.value || '';
        const hour = parts.find(p => p.type === 'hour')?.value || '';
        const minute = parts.find(p => p.type === 'minute')?.value || '';
        const second = parts.find(p => p.type === 'second')?.value || '';
        const dayPeriod = (parts.find(p => p.type === 'dayPeriod')?.value || '').toUpperCase();
        return `${day}.${month}.${year} ${hour}:${minute}:${second} ${dayPeriod}`.trim();
    } catch {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${day}.${month}.${year} ${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    }
};

export const convertToInputDate = (displayDate: string | null | undefined): string => {
    if (!displayDate) return '';
    const parts = displayDate.split('.');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

export const convertToDisplayDate = (inputDate: string | null | undefined): string => {
    if (!inputDate) return '';
    const parts = inputDate.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

export const formatDateDMY = (val: string | Date | null | undefined): string => {
    if (!val) return '';
    if (typeof val === 'string') {
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) return val;
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [y, m, d] = val.split('-');
            return `${d}.${m}.${y}`;
        }
    }
    const date = new Date(val);
    if (isNaN(date.getTime())) return String(val);

    try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: LUSAKA_TIMEZONE,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const parts = formatter.formatToParts(date);
        const day = parts.find(p => p.type === 'day')?.value || '';
        const month = parts.find(p => p.type === 'month')?.value || '';
        const year = parts.find(p => p.type === 'year')?.value || '';
        return `${day}.${month}.${year}`;
    } catch {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }
};
