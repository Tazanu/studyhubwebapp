import { useTranslation } from 'react-i18next';
import HomeFooter from '../components/home/HomeFooter';
import Seo from '../components/Seo';
import { CONTACT_EMAIL } from '../lib/contact';
import { formatDate } from '../lib/formatDate';

const Section = ({ title, children }) => (
    <div className="mb-10">
        <h2 className="text-lg font-bold mb-3 text-fg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {title}
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-fg-secondary">
            {children}
        </div>
    </div>
);

const Bullets = ({ items }) => (
    <ul className="list-disc pl-5 space-y-1.5">
        {items.map(item => <li key={item}>{item}</li>)}
    </ul>
);

export default function Terms() {
    const { t, i18n } = useTranslation();
    const list = key => t(key, { returnObjects: true });

    return (
        <>
            <Seo title={t('terms.seoTitle')} description={t('terms.seoDescription')} path="/terms" />
            <div className="min-h-screen pt-28 pb-20 px-6 bg-bg text-fg">
                <div className="max-w-2xl mx-auto">
                    <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">{t('legal.eyebrow')}</p>
                    <h1 className="font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '-0.02em' }}>
                        {t('terms.title')}
                    </h1>
                    <p className="text-sm mb-2 text-fg-muted">
                        {t('legal.lastUpdated', {
                            date: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' }),
                        })}
                    </p>

                    {/* Which language binds, since these are contractual terms. */}
                    {i18n.resolvedLanguage !== 'en'
                        ? <p className="text-xs mb-10 italic text-fg-muted">{t('legal.governingLanguage')}</p>
                        : <div className="mb-10" />}

                    <Section title={t('terms.s1Title')}>
                        <p>{t('terms.s1p1')}</p>
                        <p>{t('terms.s1p2')}</p>
                    </Section>

                    <Section title={t('terms.s2Title')}>
                        <p>{t('terms.s2p1')}</p>
                    </Section>

                    <Section title={t('terms.s3Title')}>
                        <p>{t('terms.s3p1')}</p>
                        <p>{t('terms.s3p2')}</p>
                    </Section>

                    <Section title={t('terms.s4Title')}>
                        <p>{t('terms.s4p1')}</p>
                        <Bullets items={list('terms.s4List')} />
                    </Section>

                    <Section title={t('terms.s5Title')}>
                        <p>{t('terms.s5p1')}</p>
                        <p>{t('terms.s5p2')}</p>
                    </Section>

                    <Section title={t('terms.s6Title')}>
                        <p>{t('terms.s6p1')}</p>
                        <p>{t('terms.s6p2')}</p>
                    </Section>

                    <Section title={t('terms.s7Title')}>
                        <p>{t('terms.s7p1')}</p>
                    </Section>

                    <Section title={t('terms.s8Title')}>
                        <p>{t('terms.s8p1')}</p>
                    </Section>

                    <Section title={t('terms.s9Title')}>
                        <p>{t('terms.s9p1')}</p>
                        <p>{t('terms.s9p2')}</p>
                    </Section>

                    <Section title={t('terms.s10Title')}>
                        <p>{t('terms.s10p1')}</p>
                    </Section>

                    <Section title={t('terms.s11Title')}>
                        <p>{t('terms.s11p1')}</p>
                    </Section>

                    <Section title={t('terms.s12Title')}>
                        <p>
                            {t('terms.s12p1')}{' '}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline text-primary">
                                {CONTACT_EMAIL}
                            </a>.
                        </p>
                    </Section>
                </div>
            </div>
            <HomeFooter />
        </>
    );
}
