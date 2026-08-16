export const formatTimestamp = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = hours.toString().padStart(2, '0');

    return `${day}.${month}.${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
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
