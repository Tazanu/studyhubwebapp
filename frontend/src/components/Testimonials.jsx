import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TESTIMONIALS as testimonials } from '../data/testimonials';

const LEN = testimonials.length;

export default function Testimonials() {
    const { t } = useTranslation();
    const [idx, setIdx]       = useState(0);
    const [visible, setVisible] = useState(true);
    const paused = useRef(false);

    // fade out → change index → fade in
    const go = useCallback((nextFn) => {
        setVisible(false);
        setTimeout(() => {
            setIdx(prev => {
                const next = typeof nextFn === 'function' ? nextFn(prev) : nextFn;
                return (next + LEN) % LEN;
            });
            setVisible(true);
        }, 250);
    }, []);

    // auto-advance — no stale closure because go is stable and setIdx uses functional update
    useEffect(() => {
        const timer = setInterval(() => {
            if (!paused.current) go(i => i + 1);
        }, 3000);
        return () => clearInterval(timer);
    }, [go]);

    const current = testimonials[idx];

    return (
        <section
            className="py-32 px-6 bg-bg"
            onMouseEnter={() => (paused.current = true)}
            onMouseLeave={() => (paused.current = false)}
        >
            <div className="max-w-5xl mx-auto">

                {/* header */}
                <div className="text-center mb-16">
                    <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">
                        {t('testimonials.eyebrow')}
                    </p>
                    <h2
                        className="font-bold text-fg"
                        style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {t('testimonials.title')}
                    </h2>
                </div>

                {/* card */}
                <div
                    className="rounded-2xl border border-border bg-surface overflow-hidden"
                    style={{
                        opacity: visible ? 1 : 0,
                        transform: visible ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'opacity 0.25s ease, transform 0.25s ease',
                    }}
                >
                    <div className="flex flex-col md:flex-row">

                        {/* photo */}
                        <div className="relative md:w-72 shrink-0" style={{ minHeight: 280 }}>
                            <img
                                key={current.photo}
                                src={current.photo}
                                alt={current.name}
                                className="w-full h-full object-cover"
                                style={{ minHeight: 280, display: 'block' }}
                            />
                            <div aria-hidden className="absolute inset-0 hidden md:block"
                                style={{ background: 'linear-gradient(to right, transparent 70%, var(--surface-card) 100%)' }} />
                            <div aria-hidden className="absolute inset-0 block md:hidden"
                                style={{ background: 'linear-gradient(to bottom, transparent 60%, var(--surface-card) 100%)' }} />
                        </div>

                        {/* quote */}
                        <div className="flex-1 flex flex-col justify-center px-8 py-10 md:pl-6 md:pr-12">
                            <Quote size={32} className="mb-5 text-primary opacity-40" />
                            <p
                                className="font-medium leading-relaxed mb-8 text-fg"
                                style={{
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                                    lineHeight: 1.75,
                                }}
                            >
                                {current.quote}
                            </p>
                            <div>
                                <p className="font-semibold text-base text-primary">
                                    {current.name}
                                </p>
                                <p className="text-sm mt-0.5 text-fg-secondary">
                                    {current.role}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* controls */}
                <div className="flex items-center justify-center gap-5 mt-8">
                    <button
                        onClick={() => go(i => i - 1)}
                        className="w-10 h-10 rounded-full border border-border text-fg-secondary flex items-center justify-center transition-all hover:border-primary hover:text-primary"
                        aria-label={t('testimonials.previous')}
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div className="flex gap-2 items-center">
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => go(i)}
                                aria-label={`Go to testimonial ${i + 1}`}
                                className="p-0 border-none cursor-pointer rounded-full transition-all"
                                style={{
                                    width: i === idx ? 24 : 8,
                                    height: 8,
                                    background: i === idx ? 'var(--brand-600)' : 'var(--border-color)',
                                }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => go(i => i + 1)}
                        className="w-10 h-10 rounded-full border border-border text-fg-secondary flex items-center justify-center transition-all hover:border-primary hover:text-primary"
                        aria-label={t('testimonials.next')}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

            </div>
        </section>
    );
}
