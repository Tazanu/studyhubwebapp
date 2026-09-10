export const BOOKING_STATUS_TONE = {
    pending:   'warning',
    confirmed: 'success',
    completed: 'info',
    cancelled: 'danger',
};

/**
 * Translation key for a booking status. The status itself is the API's value
 * and never changes with language — only what the reader sees does.
 */
export const bookingStatusKey = (status) =>
    `bookingStatus.${status in BOOKING_STATUS_TONE ? status : 'pending'}`;
