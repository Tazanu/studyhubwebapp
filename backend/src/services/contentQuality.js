/**
 * Automated quality gate for paid content.
 *
 * IMPORTANT SCOPE NOTE: nothing here can tell whether the content is factually
 * correct. No heuristic distinguishes a correct derivation from a confidently
 * wrong one. What this catches is content that is obviously unfit to sell —
 * near-empty files, placeholder text, padding, unreadable scans, thin metadata.
 * Correctness is what the human review queue exists for; this only stops the
 * worst material from ever reaching a reviewer.
 */
const zlib = require('zlib');

// Tunables, gathered here so they can be adjusted without hunting through code.
const LIMITS = {
    minWords: 250,          // roughly a page of real prose
    minChars: 1200,
    minPdfPages: 2,
    minTitleChars: 12,
    minDescriptionChars: 60,
    maxRepeatRatio: 0.35,    // share of text made of one repeated line
    minUniqueWordRatio: 0.18, // unique words / total words
};

const PLACEHOLDER_PATTERNS = [
    /lorem ipsum/i,
    /dolor sit amet/i,
    /\bTODO\b/,
    /\bFIXME\b/,
    /placeholder text/i,
    /sample (?:document|text|content)/i,
    /the quick brown fox jumps over the lazy dog/i,
    /asdf{2,}|qwerty|zxcvb/i,
    /test{3,}/i,
];

/** Text-bearing types we can actually inspect. */
const TEXT_TYPES = new Set(['txt', 'md', 'markdown', 'csv']);

/**
 * Pull readable text out of a PDF without a third-party parser.
 *
 * Inflates FlateDecode streams with the built-in zlib, then reads the string
 * literals that PDF text-showing operators (Tj / TJ) take as arguments. This is
 * approximate — it will not handle every encoding — so a low yield is treated
 * as "could not read", never as "this document is empty".
 */
function extractPdfText(buffer) {
    let text = '';
    let pages = 0;

    const raw = buffer.toString('latin1');
    pages = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;

    // Walk every stream ... endstream pair and inflate the ones that will.
    const streamRe = /stream\r?\n?([\s\S]*?)endstream/g;
    let m;
    while ((m = streamRe.exec(raw)) !== null) {
        const chunk = Buffer.from(m[1], 'latin1');
        let inflated;
        try {
            inflated = zlib.inflateSync(chunk);
        } catch {
            try { inflated = zlib.inflateRawSync(chunk); } catch { continue; }
        }
        const s = inflated.toString('latin1');
        // (literal) Tj   and   [(a) -2 (b)] TJ
        for (const tj of s.matchAll(/\((?:\\.|[^\\()])*\)/g)) {
            text += tj[0]
                .slice(1, -1)
                .replace(/\\([()\\])/g, '$1')
                .replace(/\\[rn]/g, ' ') + ' ';
        }
    }

    return { text: text.replace(/\s+/g, ' ').trim(), pages: pages || 0 };
}

/** Readable text and page count for whatever type we were handed. */
function readContent(buffer, fileType) {
    const type = String(fileType || '').toLowerCase().replace('.', '');
    if (type === 'pdf') return { ...extractPdfText(buffer), inspectable: true };
    if (TEXT_TYPES.has(type)) {
        return { text: buffer.toString('utf8').replace(/\s+/g, ' ').trim(), pages: 1, inspectable: true };
    }
    // .docx is a zip, images are pixels — no cheap way in, so do not pretend.
    return { text: '', pages: 0, inspectable: false };
}

/** Fraction of the text taken up by its most-repeated non-trivial line. */
function repeatRatio(text) {
    const parts = text.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 25);
    if (parts.length < 4) return 0;
    const counts = new Map();
    for (const p of parts) counts.set(p, (counts.get(p) || 0) + 1);
    const worst = Math.max(...counts.values());
    return worst / parts.length;
}

/**
 * Assess an upload.
 *
 * @returns {{ ok: boolean, blocking: string[], warnings: string[], stats: object }}
 *   `blocking` is non-empty when the upload should be refused outright.
 *   `warnings` are surfaced to the human reviewer rather than blocking.
 */
function assessNoteQuality({ buffer, fileType, title, description, price }) {
    const blocking = [];
    const warnings = [];

    const titleText = String(title || '').trim();
    const descText = String(description || '').trim();

    if (titleText.length < LIMITS.minTitleChars) {
        blocking.push(`The title is too short to describe what a buyer is getting (minimum ${LIMITS.minTitleChars} characters).`);
    }
    if (descText.length < LIMITS.minDescriptionChars) {
        blocking.push(`The description is too short (minimum ${LIMITS.minDescriptionChars} characters). Explain what the note covers.`);
    }
    if (titleText && titleText === titleText.toUpperCase() && titleText.length > 20) {
        warnings.push('The title is entirely uppercase.');
    }

    const size = buffer?.length || 0;
    if (size < 2048) {
        blocking.push('The file is too small to contain usable study material.');
    }

    const { text, pages, inspectable } = readContent(buffer, fileType);
    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const stats = { bytes: size, pages, words: words.length, chars: text.length, inspectable };

    if (!inspectable) {
        // An unreadable format is not evidence of bad content, so route it to a
        // human rather than blocking or silently approving it.
        warnings.push(`Content of a .${fileType} file cannot be checked automatically — needs a closer look.`);
        return { ok: blocking.length === 0, blocking, warnings, stats };
    }

    if (fileType?.toLowerCase() === 'pdf' && words.length === 0) {
        warnings.push('No text could be extracted. This may be a scanned document, which is unreadable to search and to screen readers.');
    } else {
        if (words.length < LIMITS.minWords) {
            blocking.push(`Only ${words.length} words of readable content — paid notes need at least ${LIMITS.minWords}.`);
        }
        if (text.length < LIMITS.minChars) {
            blocking.push('There is not enough written material here to justify charging for it.');
        }

        const unique = new Set(words.map(w => w.toLowerCase().replace(/[^a-z0-9]/gi, ''))).size;
        const ratio = words.length ? unique / words.length : 0;
        stats.uniqueWordRatio = Number(ratio.toFixed(3));
        if (words.length > 100 && ratio < LIMITS.minUniqueWordRatio) {
            blocking.push('The text is highly repetitive, which usually means padding rather than content.');
        }

        const rr = repeatRatio(text);
        stats.repeatRatio = Number(rr.toFixed(3));
        if (rr > LIMITS.maxRepeatRatio) {
            blocking.push('The same sentence repeats throughout the document.');
        }
    }

    for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(text) || pattern.test(titleText) || pattern.test(descText)) {
            blocking.push('The content contains placeholder or filler text.');
            break;
        }
    }

    if (pages && pages < LIMITS.minPdfPages) {
        warnings.push(`Only ${pages} page. Buyers generally expect more from paid material.`);
    }

    const amount = Number(price) || 0;
    if (amount > 0 && words.length && words.length < 500 && amount > 1000) {
        warnings.push('The price is high relative to the amount of content.');
    }

    return { ok: blocking.length === 0, blocking, warnings, stats };
}

module.exports = { assessNoteQuality, LIMITS };
