import { message } from "antd";
import moment from "moment";

export function dateToString(date) {
    try {
        return date.toISOString();
    } catch (error) {
        console.error('Error formatting date:', error, date);
        return date;
    }
}

export function isMobile() {
    return window.innerWidth <= 768;
}

const truncateString = str => str.length > 10 ? str.slice(0, 10) + '...' : str;

export function copyToClipboard(textToCopy) {
    navigator.clipboard.writeText(textToCopy).then(() => {
        message.success(`Text copied to clipboard! - ${truncateString(textToCopy)}`);
    }).catch(err => {
        message.error('Failed to copy text');
    });
}

const ERROR_KEY = 'errorMessages';

export const COLLECTION_NAME = 'my-buddy';
export const DOC_ID_TODO = 'todo';

/**
 * Retrieve the current errors from local storage.
 * @returns {string[]} Array of error messages.
 */
export function getErrors() {
    const errors = localStorage.getItem(ERROR_KEY);
    return errors ? JSON.parse(errors) : [];
}

/**
 * Add a new error message to the local storage.
 * @param {string} errorMessage - The error message to add.
 */
export function addError(errorMessage) {
    const errors = getErrors();
    errors.push(errorMessage);
    localStorage.setItem(ERROR_KEY, JSON.stringify(errors));
}

/**
 * Remove an error message from local storage.
 * @param {string} errorMessage - The error message to remove.
 */
export function removeError(errorMessage) {
    let errors = getErrors();
    errors = errors.filter(error => error !== errorMessage);
    localStorage.setItem(ERROR_KEY, JSON.stringify(errors));
}

/**
 * Clear all error messages from local storage.
 */
export function clearErrors() {
    localStorage.removeItem(ERROR_KEY);
}

/**
 * Get the count of error messages.
 * @returns {number} The number of error messages stored.
 */
export function getErrorCount() {
    return getErrors().length;
}

/**
 * Show a notification in the browser using the Notification API.
 * @param {string} title - The title of the notification.
 * @param {string} [body] - The body text of the notification.
 * @param {Object} [options] - Additional options for the notification.
 */
export function showNotification(title, body, options = {}) {
    // Check if the Notification API is supported
    if (!("Notification" in window)) {
        console.error("This browser does not support desktop notification.");
        return;
    }

    // Check if the user has granted permission
    if (Notification.permission === "granted") {
        // If it's okay, create a notification
        new Notification(title, { body, ...options });
    } else if (Notification.permission !== "denied") {
        // Otherwise, we need to ask the user for permission
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, { body, ...options });
            }
        });
    }
}
