export const MILESTONES = [100, 250, 500, 1000, 2500];

// `id` is the stable identity used for translation lookup; `label` stays as the
// English fallback so a missing translation degrades to a readable word.
export const TIERS = [
    { id: 'newcomer', label: 'Newcomer', color: '#888',    min: 0    },
    { id: 'bronze',   label: 'Bronze',   color: '#cd7f32', min: 100  },
    { id: 'silver',   label: 'Silver',   color: '#94a3b8', min: 250  },
    { id: 'gold',     label: 'Gold',     color: '#fbbf24', min: 500  },
    { id: 'platinum', label: 'Platinum', color: '#60a5fa', min: 1000 },
    { id: 'elite',    label: 'Elite',    color: '#8b5cf6', min: 2500 },
];

export function getRepInfo(rep) {
    const tier = [...TIERS].reverse().find(t => rep >= t.min) || TIERS[0];
    const next = MILESTONES.find(m => m > rep);
    const prev = MILESTONES.filter(m => m <= rep).at(-1) ?? 0;
    const pct  = next ? Math.round(((rep - prev) / (next - prev)) * 100) : 100;
    return { tier, next, pct };
}
