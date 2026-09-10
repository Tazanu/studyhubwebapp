import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ArrowLeft, Users, FileText, MessageCircleQuestion } from 'lucide-react';
import Button from '../components/ui/Button';
import HomeFooter from '../components/home/HomeFooter';
import Seo from '../components/Seo';
import { useTranslation } from 'react-i18next';

const SUGGESTIONS = [
    { to: '/groups', icon: Users,                 labelKey: 'footer.studyGroups',  hintKey: 'notFound.groupsHint' },
    { to: '/notes',  icon: FileText,              labelKey: 'footer.notesLibrary', hintKey: 'notFound.notesHint'  },
    { to: '/qa',     icon: MessageCircleQuestion, labelKey: 'footer.qaForum',      hintKey: 'notFound.qaHint'     },
];

export default function NotFound() {
    const { t } = useTranslation();
    const { pathname } = useLocation();

    return (
        <>
            <Seo title={t('notFound.title')} description={t('notFound.body')} noindex />
            <main className="min-h-screen pt-28 pb-20 px-6 bg-bg text-fg flex items-center">
                <div className="max-w-xl mx-auto w-full text-center">
                    <p
                        className="font-bold leading-none mb-4 gradient-text"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(4.5rem, 18vw, 9rem)', letterSpacing: '-0.04em' }}
                    >
                        404
                    </p>

                    <h1
                        className="font-bold mb-3"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '-0.02em' }}
                    >
                        {t('notFound.title')}
                    </h1>

                    <p className="text-sm leading-relaxed mb-2 text-fg-secondary">
                        {t('notFound.body')}
                    </p>

                    {/* Showing the attempted path makes a mistyped or stale link
                        obvious at a glance, and gives people something concrete
                        to quote if they report it. */}
                    <p className="text-xs mb-9 font-mono break-all text-fg-muted">{pathname}</p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
                        <Button to="/" icon={Home}>{t('notFound.backHome')}</Button>
                        <Button variant="secondary" icon={ArrowLeft} onClick={() => window.history.back()}>
                            {t('notFound.goBack')}
                        </Button>
                    </div>

                    <div className="pt-8 border-t border-border">
                        <p className="text-xs font-bold uppercase tracking-widest mb-5 text-fg-secondary">
                            <Search size={13} className="inline mr-1.5 -mt-0.5" />
                            {t('notFound.tryInstead')}
                        </p>
                        <div className="grid sm:grid-cols-3 gap-3">
                            {SUGGESTIONS.map(({ to, icon: Icon, labelKey, hintKey }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className="p-4 rounded-xl border border-border bg-surface text-left transition-all hover:border-primary hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-primary-subtle">
                                        <Icon size={17} className="text-primary" strokeWidth={1.75} />
                                    </div>
                                    <p className="text-sm font-semibold text-fg">{t(labelKey)}</p>
                                    <p className="text-xs mt-0.5 text-fg-muted">{t(hintKey)}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <HomeFooter />
        </>
    );
}
