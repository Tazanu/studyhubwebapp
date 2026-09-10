const INTERVALS = [
    { key: 'yearsAgo',   seconds: 31536000 },
    { key: 'monthsAgo',  seconds: 2592000  },
    { key: 'weeksAgo',   seconds: 604800   },
    { key: 'daysAgo',    seconds: 86400    },
    { key: 'hoursAgo',   seconds: 3600     },
    { key: 'minutesAgo', seconds: 60       },
];

/**
 * Returns the translation key and count for "3 days ago".
 *
 * Deliberately not a formatted string: plural rules differ between languages
 * (French says "il y a 1 mois" *and* "il y a 3 mois"), so the count has to
 * reach i18next rather than being pluralised here with an appended "s".
 *
 * Use as: const { key, count } = relativeTime(date); t(key, { count })
 */
export function relativeTime(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    for (const interval of INTERVALS) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) return { key: `time.${interval.key}`, count };
    }
    return { key: 'time.justNow', count: 0 };
}
