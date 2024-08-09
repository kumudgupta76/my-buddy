export function dateToString(date) {
    return date ? date.format('YYYY-MM-DD') : "";
}

export function isMobile() {
    return window.innerWidth <= 768;
}