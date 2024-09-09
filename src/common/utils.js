import moment from "moment";

export function dateToString(date) {
    return date && date instanceof moment ? date.format('YYYY-MM-DD') : date;
}

export function isMobile() {
    return window.innerWidth <= 768;
}