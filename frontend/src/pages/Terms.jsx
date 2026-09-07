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

export default function Terms() {
    return (
        <>
            <Seo title="Terms of Service" description="The terms governing your use of StudyHub, including account rules, uploaded content, payments and tutor bookings." path="/terms" />
            <div className="min-h-screen pt-28 pb-20 px-6 bg-bg text-fg">
                <div className="max-w-2xl mx-auto">
                    <p className="text-sm font-semibold uppercase tracking-widest mb-3 text-primary">Legal</p>
                    <h1 className="font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '-0.02em' }}>
                        Terms of Service
                    </h1>
                    <p className="text-sm mb-12 text-fg-muted">
                        Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>

                    <Section title="1. Acceptance of Terms">
                        <p>
                            By accessing or using StudyHub ("the Platform"), you agree to be bound by these Terms of Service.
                            If you do not agree, please do not use the Platform.
                        </p>
                        <p>
                            We reserve the right to update these terms at any time. Continued use of the Platform after
                            changes are posted constitutes your acceptance of the revised terms.
                        </p>
                    </Section>

                    <Section title="2. Eligibility">
                        <p>
                            You must be at least 13 years old to use StudyHub. By registering, you confirm that the
                            information you provide is accurate and that you are eligible to enter into this agreement.
                        </p>
                    </Section>

                    <Section title="3. User Accounts">
                        <p>
                            You are responsible for maintaining the confidentiality of your account credentials and for
                            all activity that occurs under your account. Notify us immediately of any unauthorised use.
                        </p>
                        <p>
                            You may not create accounts for others without their permission, impersonate any person, or
                            use another user's account.
                        </p>
                    </Section>

                    <Section title="4. Acceptable Use">
                        <p>You agree not to:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>Post content that is abusive, harassing, defamatory, or discriminatory.</li>
                            <li>Share copyrighted material you do not have the right to distribute.</li>
                            <li>Use the Platform to cheat, plagiarise, or engage in academic dishonesty.</li>
                            <li>Attempt to gain unauthorised access to any part of the Platform or its infrastructure.</li>
                            <li>Use automated tools (bots, scrapers) to access or collect data from the Platform.</li>
                            <li>Spam other users through messages, group chats, or the Q&A forum.</li>
                        </ul>
                    </Section>

                    <Section title="5. Tutor Conduct">
                        <p>
                            Tutors on StudyHub are independent users, not employees of StudyHub. By applying to become
                            a tutor, you agree to provide accurate information about your qualifications and experience.
                        </p>
                        <p>
                            StudyHub reserves the right to remove any tutor listing that violates these terms or that
                            receives consistent negative feedback from students.
                        </p>
                    </Section>

                    <Section title="6. User-Generated Content">
                        <p>
                            You retain ownership of content you post (notes, questions, answers, messages). By posting,
                            you grant StudyHub a non-exclusive, royalty-free licence to display and distribute that
                            content within the Platform for the purpose of operating the service.
                        </p>
                        <p>
                            You are solely responsible for the content you post. StudyHub does not endorse any
                            user-generated content and is not liable for it.
                        </p>
                    </Section>

                    <Section title="7. Intellectual Property">
                        <p>
                            All Platform design, branding, code, and original content created by StudyHub is the
                            exclusive property of StudyHub and may not be copied, reproduced, or distributed without
                            prior written permission.
                        </p>
                    </Section>

                    <Section title="8. Termination">
                        <p>
                            We may suspend or terminate your account at any time if you violate these terms or engage
                            in conduct we deem harmful to the Platform or its users. You may delete your account at
                            any time from your account settings.
                        </p>
                    </Section>

                    <Section title="9. Disclaimers">
                        <p>
                            StudyHub is provided "as is" without warranties of any kind. We do not guarantee that the
                            Platform will be uninterrupted, error-free, or that any content is accurate or complete.
                        </p>
                        <p>
                            StudyHub is not responsible for the quality, accuracy, or outcomes of tutoring sessions
                            arranged through the Platform.
                        </p>
                    </Section>

                    <Section title="10. Limitation of Liability">
                        <p>
                            To the fullest extent permitted by law, StudyHub shall not be liable for any indirect,
                            incidental, or consequential damages arising from your use of the Platform.
                        </p>
                    </Section>

                    <Section title="11. Governing Law">
                        <p>
                            These terms are governed by the laws of Cameroon. Any disputes shall be resolved in the
                            courts of Cameroon.
                        </p>
                    </Section>

                    <Section title="12. Contact">
                        <p>
                            If you have questions about these Terms, please contact us at{' '}
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
