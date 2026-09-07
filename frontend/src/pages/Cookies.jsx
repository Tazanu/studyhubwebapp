import { Link } from 'react-router-dom';
import HomeFooter from '../components/home/HomeFooter';
import Seo from '../components/Seo';

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

export default function Cookies() {
    return (
        <>
            <Seo title="Cookie Policy" description="What StudyHub stores in your browser and why: sign-in token, theme preference, and cookieless analytics. No advertising cookies." path="/cookies" />
            <div className="min-h-screen pt-28 pb-20 px-6 bg-bg text-fg">
                <div className="max-w-2xl mx-auto">
                    <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">Legal</p>
                    <h1 className="font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '-0.02em' }}>
                        Cookie Policy
                    </h1>
                    <p className="text-sm mb-12 text-fg-muted">
                        Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>

                    <Section title="1. The short version">
                        <p>
                            StudyHub does not use advertising cookies, and we do not sell or share your
                            data with advertisers. We store a small amount of information in your browser
                            so the Platform can keep you signed in and remember your preferences, and we
                            measure traffic using a privacy-focused analytics tool that does not use
                            cookies or track you across other websites.
                        </p>
                    </Section>

                    <Section title="2. What we store in your browser">
                        <p>
                            Most of what StudyHub stores is not technically a cookie &mdash; it lives in
                            your browser&rsquo;s local storage, which works similarly but is never
                            transmitted automatically with every request.
                        </p>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-border-strong">
                                        <th className="py-2 pr-4 text-left font-semibold text-fg">Name</th>
                                        <th className="py-2 pr-4 text-left font-semibold text-fg">Purpose</th>
                                        <th className="py-2 text-left font-semibold text-fg">Lifetime</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <Row name="token" purpose="Keeps you signed in. Without it you would have to log in on every page load." life="Until logout" />
                                    <Row name="user" purpose="Your name, avatar and role, so the interface can render without waiting for a round trip." life="Until logout" />
                                    <Row name="theme" purpose="Remembers whether you chose the light or dark appearance." life="Persistent" />
                                    <Row name="rememberedLogin" purpose="Pre-fills your email on the login form, only if you ticked “Remember me”." life="Persistent" />
                                    <Row name="cookie-notice" purpose="Records that you have seen this notice, so it is not shown on every visit." life="Persistent" />
                                    <Row name="pwa-install-dismissed" purpose="Stops the “install the app” prompt reappearing after you dismiss it." life="Persistent" />
                                    <Row name="tutorMessages" purpose="Drafts of messages to tutors, kept on your device only." life="Persistent" />
                                    <Row name="tutors_cache" purpose="Briefly caches tutor listings so profile pages open instantly." life="Until tab closes" />
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    <Section title="3. Analytics">
                        <p>
                            We use <strong className="text-fg">Plausible Analytics</strong> to understand
                            which pages are used and roughly how many people visit. Plausible is
                            cookieless: it sets no cookie, stores nothing on your device, collects no
                            personal data, and cannot follow you to other websites. All measurements are
                            aggregated and anonymous, so we cannot identify an individual visitor from
                            them.
                        </p>
                        <p>
                            Because it collects no personal data and stores nothing on your device,
                            analytics does not require your consent under the GDPR or the ePrivacy
                            Directive. There is nothing to opt out of &mdash; but if you prefer, any
                            standard content blocker will stop it, with no effect on the Platform.
                        </p>
                    </Section>

                    <Section title="4. Third parties">
                        <p>
                            Fonts are served by Google Fonts, and files you upload are stored with
                            Cloudinary. These providers receive your IP address as a normal part of
                            serving the request. Payments are processed by MeSomb, which receives the
                            details required to complete a transaction you initiate. None of these
                            set advertising cookies through StudyHub.
                        </p>
                    </Section>

                    <Section title="5. Managing what is stored">
                        <p>
                            You can clear everything StudyHub has stored at any time through your
                            browser&rsquo;s &ldquo;clear site data&rdquo; or cookie settings. Doing so
                            will sign you out and reset your appearance preference; nothing else is
                            affected, and no account data is deleted.
                        </p>
                        <p>
                            Blocking the sign-in token entirely will prevent you from staying logged
                            in, since it is what identifies your session.
                        </p>
                    </Section>

                    <Section title="6. Related policies">
                        <p>
                            For how we handle personal data more broadly, see our{' '}
                            <Link to="/privacy" className="font-semibold text-primary hover:underline">Privacy Policy</Link>.
                            For the rules of using the Platform, see our{' '}
                            <Link to="/terms" className="font-semibold text-primary hover:underline">Terms of Service</Link>.
                        </p>
                    </Section>
                </div>
            </div>
            <HomeFooter />
        </>
    );
}
