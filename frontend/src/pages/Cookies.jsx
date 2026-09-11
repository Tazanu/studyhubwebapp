import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HomeFooter from '../components/home/HomeFooter';
import Seo from '../components/Seo';
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

const Row = ({ name, purpose, life }) => (
    <tr className="border-b border-border last:border-0">
        <td className="py-3 pr-4 align-top font-mono text-xs text-fg whitespace-nowrap">{name}</td>
        <td className="py-3 pr-4 align-top">{purpose}</td>
        <td className="py-3 align-top whitespace-nowrap text-fg-muted">{life}</td>
    </tr>
);

// The storage key is the literal name in localStorage, so it is never
// translated — only the description of what it is for.
const STORED = [
    { key: 'token',                 purpose: 'purposeToken',            life: 'lifeUntilLogout'    },
    { key: 'user',                  purpose: 'purposeUser',             life: 'lifeUntilLogout'    },
    { key: 'theme',                 purpose: 'purposeTheme',            life: 'lifePersistent'     },
    { key: 'language',              purpose: 'purposeLanguage',         life: 'lifePersistent'     },
    { key: 'rememberedLogin',       purpose: 'purposeRememberedLogin',  life: 'lifePersistent'     },
    { key: 'cookie-notice',         purpose: 'purposeCookieNotice',     life: 'lifePersistent'     },
    { key: 'pwa-install-dismissed', purpose: 'purposePwaDismissed',     life: 'lifePersistent'     },
    { key: 'tutorMessages',         purpose: 'purposeTutorMessages',    life: 'lifePersistent'     },
    { key: 'tutors_cache',          purpose: 'purposeTutorsCache',      life: 'lifeUntilTabCloses' },
];

export default function Cookies() {
    const { t, i18n } = useTranslation();

    return (
        <>
            <Seo title={t('cookiePolicy.seoTitle')} description={t('cookiePolicy.seoDescription')} path="/cookies" />
            <div className="min-h-screen pt-28 pb-20 px-6 bg-bg text-fg">
                <div className="max-w-2xl mx-auto">
                    <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">{t('legal.eyebrow')}</p>
                    <h1 className="font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '-0.02em' }}>
                        {t('cookiePolicy.title')}
                    </h1>
                    <p className="text-sm mb-2 text-fg-muted">
                        {t('legal.lastUpdated', {
                            date: formatDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' }),
                        })}
                    </p>

                    {i18n.resolvedLanguage !== 'en'
                        ? <p className="text-xs mb-10 italic text-fg-muted">{t('legal.governingLanguage')}</p>
                        : <div className="mb-10" />}

                    <Section title={t('cookiePolicy.s1Title')}>
                        <p>{t('cookiePolicy.s1p1')}</p>
                    </Section>

                    <Section title={t('cookiePolicy.s2Title')}>
                        <p>{t('cookiePolicy.s2p1')}</p>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-border-strong">
                                        <th className="py-2 pr-4 text-left font-semibold text-fg">{t('cookiePolicy.colName')}</th>
                                        <th className="py-2 pr-4 text-left font-semibold text-fg">{t('cookiePolicy.colPurpose')}</th>
                                        <th className="py-2 text-left font-semibold text-fg">{t('cookiePolicy.colLifetime')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {STORED.map(({ key, purpose, life }) => (
                                        <Row
                                            key={key}
                                            name={key}
                                            purpose={t(`cookiePolicy.${purpose}`)}
                                            life={t(`cookiePolicy.${life}`)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    <Section title={t('cookiePolicy.s3Title')}>
                        <p>
                            {t('cookiePolicy.s3p1pre')} <strong className="text-fg">Plausible Analytics</strong>{' '}
                            {t('cookiePolicy.s3p1post')}
                        </p>
                        <p>{t('cookiePolicy.s3p2')}</p>
                    </Section>

                    <Section title={t('cookiePolicy.s4Title')}>
                        <p>{t('cookiePolicy.s4p1')}</p>
                    </Section>

                    <Section title={t('cookiePolicy.s5Title')}>
                        <p>{t('cookiePolicy.s5p1')}</p>
                        <p>{t('cookiePolicy.s5p2')}</p>
                    </Section>

                    <Section title={t('cookiePolicy.s6Title')}>
                        <p>
                            {t('cookiePolicy.s6pre')}{' '}
                            <Link to="/privacy" className="font-semibold text-primary hover:underline">{t('footer.privacy')}</Link>.
                            {' '}{t('cookiePolicy.s6mid')}{' '}
                            <Link to="/terms" className="font-semibold text-primary hover:underline">{t('footer.terms')}</Link>.
                        </p>
                    </Section>
                </div>
            </div>
            <HomeFooter />
        </>
    );
}
