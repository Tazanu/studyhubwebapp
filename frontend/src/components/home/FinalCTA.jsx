import { ArrowRight } from 'lucide-react';
import useInView from '../../hooks/useInView';
import Button from '../ui/Button';

export default function FinalCTA() {
    const [ref, inView] = useInView();

    return (
        <section
            aria-labelledby="final-cta-heading"
            className="py-20 sm:py-28 px-4 sm:px-6 text-center relative overflow-hidden"
            style={{ background: 'var(--gradient-primary)' }}
        >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 65%)' }} />
            </div>

            <div ref={ref} className={`relative max-w-2xl mx-auto fade-up ${inView ? 'in-view' : ''}`}>
                <h2
                    id="final-cta-heading"
                    className="font-bold mb-4 text-white"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.9rem, 4vw, 2.75rem)', letterSpacing: '-0.02em' }}
                >
                    Ready to study smarter?
                </h2>
                <p className={`mb-8 text-base fade-up delay-1 text-white/70`} style={{ lineHeight: 1.8 }}>
                    Join students already using StudyHub to get better results, together.
                </p>
                <Button
                    to="/register"
                    variant="inverse"
                    size="lg"
                    icon={ArrowRight}
                    iconPosition="right"
                    className={`shadow-xl hover:-translate-y-0.5 hover:shadow-2xl fade-up delay-2 ${inView ? 'in-view' : ''}`}
                >
                    Create your free account
                </Button>
                <p className={`mt-4 text-xs fade-up delay-3 text-white/50 ${inView ? 'in-view' : ''}`}>
                    Free to join · No credit card required
                </p>
            </div>
        </section>
    );
}
