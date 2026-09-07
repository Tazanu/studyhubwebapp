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

export default function Privacy() {
    return (
        <>
            <Seo title="Privacy Policy" description="What personal data StudyHub collects, how it is used and stored, who it is shared with, and the rights you have over it." path="/privacy" />
            <div className="min-h-screen pt-28 pb-20 px-6 bg-bg text-fg">
                <div className="max-w-2xl mx-auto">
                    <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">Legal</p>
                    <h1 className="font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '-0.02em' }}>
                        Privacy Policy
                    </h1>
                    <p className="text-sm mb-12 text-fg-muted">
                        Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>

                    <Section title="1. Introduction">
                        <p>
                            StudyHub ("we", "us", "our") is committed to protecting your personal information.
                            This Privacy Policy explains what data we collect, how we use it, and your rights
                            regarding that data.
                        </p>
                    </Section>

                    <Section title="2. Information We Collect">
                        <p>We collect the following information when you register or use the Platform:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li><strong className="text-fg">Account data:</strong> first name, last name, email address, and password (stored as a secure hash).</li>
                            <li><strong className="text-fg">Profile data:</strong> university, field of study, profile photo, and bio (optional).</li>
                            <li><strong className="text-fg">Tutor data:</strong> subjects, teaching bio, years of experience, hourly rate, availability, and any proof-of-expertise documents you upload.</li>
                            <li><strong className="text-fg">Usage data:</strong> pages visited, features used, and general interaction patterns to help us improve the Platform.</li>
                            <li><strong className="text-fg">Communications:</strong> messages sent in group chats and the Q&A forum.</li>
                        </ul>
                    </Section>

                    <Section title="3. How We Use Your Information">
                        <p>We use your data to:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>Create and manage your account.</li>
                            <li>Display your profile to other users where relevant (e.g. tutor listings).</li>
                            <li>Operate platform features such as study groups, notes, Q&A, and messaging.</li>
                            <li>Send you important service notifications (e.g. account activity, policy updates).</li>
                            <li>Improve and develop the Platform based on usage patterns.</li>
                            <li>Detect and prevent fraud, abuse, or violations of our Terms of Service.</li>
                        </ul>
                    </Section>

                    <Section title="4. Data Sharing">
                        <p>
                            We do not sell your personal data to third parties. We may share data only in the
                            following limited circumstances:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>With service providers who help us operate the Platform (e.g. hosting, analytics), under strict confidentiality agreements.</li>
                            <li>When required by law or to respond to valid legal processes.</li>
                            <li>To protect the rights, property, or safety of StudyHub, our users, or the public.</li>
                        </ul>
                    </Section>

                    <Section title="5. Data Retention">
                        <p>
                            We retain your data for as long as your account is active. If you delete your account,
                            we will delete your personal data within 30 days, except where we are required by law
                            to retain it longer.
                        </p>
                        <p>
                            Content you have posted publicly (e.g. notes, Q&A answers) may remain visible in
                            anonymised or aggregated form after account deletion.
                        </p>
                    </Section>

                    <Section title="6. Cookies & Local Storage">
                        <p>
                            StudyHub uses browser local storage to keep you signed in and to remember your
                            theme preference. We do not currently use third-party advertising cookies.
                        </p>
                    </Section>

                    <Section title="7. Security">
                        <p>
                            We use industry-standard measures to protect your data, including HTTPS encryption
                            in transit and hashed password storage. However, no system is completely secure and
                            we cannot guarantee absolute security.
                        </p>
                        <p>
                            Please use a strong, unique password and do not share your credentials with anyone.
                        </p>
                    </Section>

                    <Section title="8. Your Rights">
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>Access the personal data we hold about you.</li>
                            <li>Request correction of inaccurate data.</li>
                            <li>Request deletion of your account and associated data.</li>
                            <li>Withdraw consent for optional data processing at any time.</li>
                        </ul>
                        <p>
                            To exercise any of these rights, contact us at{' '}
                            <a href="mailto:support@studyhub.cm" className="hover:underline text-primary">
                                support@studyhub.cm
                            </a>.
                        </p>
                    </Section>

                    <Section title="9. Children's Privacy">
                        <p>
                            StudyHub is not directed at children under 13. We do not knowingly collect personal
                            data from children under 13. If you believe a child has provided us with their data,
                            please contact us and we will delete it promptly.
                        </p>
                    </Section>

                    <Section title="10. Changes to This Policy">
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of significant
                            changes via email or a prominent notice on the Platform. Continued use after changes
                            are posted constitutes acceptance of the updated policy.
                        </p>
                    </Section>

                    <Section title="11. Contact">
                        <p>
                            If you have any questions or concerns about this Privacy Policy, please reach out at{' '}
                            <a href="mailto:support@studyhub.cm" className="hover:underline text-primary">
                                support@studyhub.cm
                            </a>.
                        </p>
                    </Section>
                </div>
            </div>
            <HomeFooter />
        </>
    );
}
