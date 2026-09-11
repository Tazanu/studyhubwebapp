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

const MailLink = () => (
    <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline text-primary">
        {CONTACT_EMAIL}
    </a>
);

export default function Privacy() {
    const { t, i18n } = useTranslation();
    // Arrays come back as arrays, not a joined string.
    const list = key => t(key, { returnObjects: true });

    return (
        <>
            <Seo title={t('privacy.seoTitle')} description={t('privacy.seoDescription')} path="/privacy" />
            <div className="min-h-screen pt-28 pb-20 px-6 bg-bg text-fg">
                <div className="max-w-2xl mx-auto">
                    <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">{t('legal.eyebrow')}</p>
                    <h1 className="font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '-0.02em' }}>
                        {t('privacy.title')}
                    </h1>
                    <p className="text-sm mb-2 text-fg-muted">
                        {t('legal.lastUpdated', {
                            date: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' }),
                        })}
                    </p>

                    {/* The English text is the one that was drafted; a translation
                        of legal terms should not silently become the binding
                        version, so say which one governs. */}
                    {i18n.resolvedLanguage !== 'en' && (
                        <p className="text-xs mb-10 italic text-fg-muted">{t('legal.governingLanguage')}</p>
                    )}
                    {i18n.resolvedLanguage === 'en' && <div className="mb-10" />}

                    <Section title={t('privacy.s1Title')}>
                        <p>{t('privacy.s1p1')}</p>
                    </Section>

                    <Section title={t('privacy.s2Title')}>
                        <p>{t('privacy.s2p1')}</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li><strong className="text-fg">{t('privacy.s2ItemAccount')}</strong> {t('privacy.s2ItemAccountBody')}</li>
                            <li><strong className="text-fg">{t('privacy.s2ItemProfile')}</strong> {t('privacy.s2ItemProfileBody')}</li>
                            <li><strong className="text-fg">{t('privacy.s2ItemTutor')}</strong> {t('privacy.s2ItemTutorBody')}</li>
                            <li><strong className="text-fg">{t('privacy.s2ItemUsage')}</strong> {t('privacy.s2ItemUsageBody')}</li>
                            <li><strong className="text-fg">{t('privacy.s2ItemComms')}</strong> {t('privacy.s2ItemCommsBody')}</li>
                        </ul>
                    </Section>

                    <Section title={t('privacy.s3Title')}>
                        <p>{t('privacy.s3p1')}</p>
                        <Bullets items={list('privacy.s3List')} />
                    </Section>

                    <Section title={t('privacy.s4Title')}>
                        <p>{t('privacy.s4p1')}</p>
                        <Bullets items={list('privacy.s4List')} />
                    </Section>

                    <Section title={t('privacy.s5Title')}>
                        <p>{t('privacy.s5p1')}</p>
                        <p>{t('privacy.s5p2')}</p>
                    </Section>

                    <Section title={t('privacy.s6Title')}>
                        <p>{t('privacy.s6p1')}</p>
                    </Section>

                    <Section title={t('privacy.s7Title')}>
                        <p>{t('privacy.s7p1')}</p>
                        <p>{t('privacy.s7p2')}</p>
                    </Section>

                    <Section title={t('privacy.s8Title')}>
                        <p>{t('privacy.s8p1')}</p>
                        <Bullets items={list('privacy.s8List')} />
                        <p>{t('privacy.s8p2')} <MailLink />.</p>
                    </Section>

                    <Section title={t('privacy.s9Title')}>
                        <p>{t('privacy.s9p1')}</p>
                    </Section>

                    <Section title={t('privacy.s10Title')}>
                        <p>{t('privacy.s10p1')}</p>
                    </Section>

                    <Section title={t('privacy.s11Title')}>
                        <p>{t('privacy.s11p1')} <MailLink />.</p>
                    </Section>
                </div>
            </div>
            <HomeFooter />
        </>
    );
}
