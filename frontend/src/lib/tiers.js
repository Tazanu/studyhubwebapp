export const MILESTONES = [100, 250, 500, 1000, 2500];

export const TIERS = [
    { label: 'Newcomer', color: '#888',    min: 0    },
    { label: 'Bronze',   color: '#cd7f32', min: 100  },
    { label: 'Silver',   color: '#94a3b8', min: 250  },
    { label: 'Gold',     color: '#fbbf24', min: 500  },
    { label: 'Platinum', color: '#60a5fa', min: 1000 },
    { label: 'Elite',    color: '#8b5cf6', min: 2500 },
];

export function getRepInfo(rep) {
    const tier = [...TIERS].reverse().find(t => rep >= t.min) || TIERS[0];
    const next = MILESTONES.find(m => m > rep);
    const prev = MILESTONES.filter(m => m <= rep).at(-1) ?? 0;
    const pct  = next ? Math.round(((rep - prev) / (next - prev)) * 100) : 100;
    return { tier, next, pct };
}
