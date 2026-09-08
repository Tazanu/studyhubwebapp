/**
 * Normalise a tags field into a clean string array.
 *
 * The same field arrives in three shapes depending on the caller: a real array
 * (a JSON request), a JSON-encoded array (the forms, which send multipart and
 * so can only send strings), or a plain comma-separated string. The Q&A routes
 * assumed the middle one and called JSON.parse directly, which threw a 500 on
 * the other two — an unhandled crash on input that is perfectly valid.
 */
function parseTags(input) {
    if (!input) return [];

    let list;
    if (Array.isArray(input)) {
        list = input;
    } else if (typeof input === 'string') {
        const trimmed = input.trim();
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                list = Array.isArray(parsed) ? parsed : [];
            } catch {
                list = trimmed.split(',');   // looked like JSON but wasn't
            }
        } else {
            list = trimmed.split(',');
        }
    } else {
        return [];
    }

    return [...new Set(
        list.map(t => String(t).trim()).filter(Boolean).slice(0, 10)
    )];
}

module.exports = parseTags;
