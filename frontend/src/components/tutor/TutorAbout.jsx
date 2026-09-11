import { motion } from 'framer-motion';
import { GraduationCap, Award, Globe, Lightbulb, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Badge from '../ui/Badge';

export default function TutorAbout({ tutor }) {
    const { t } = useTranslation();
    return (
        <section className="px-4 sm:px-6 py-12">
            <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold mb-8" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t('tutorProfile.aboutTitle')}</h2>

                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Left: bio + philosophy */}
                    <div className="lg:col-span-3 space-y-6">
                        <p className="text-base leading-relaxed text-fg" style={{ lineHeight: 1.8 }}>
                            {tutor.bio}
                        </p>

                        <motion.div
                            initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }} transition={{ duration: 0.4 }}
                            className="p-5 rounded-2xl border border-l-4 border-primary bg-primary-subtle"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb size={16} className="text-primary" />
                                <span className="font-semibold text-sm">{t('tutorProfile.teachingPhilosophy')}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-fg-secondary" style={{ lineHeight: 1.7 }}>
                                {tutor.teachingPhilosophy}
                            </p>
                        </motion.div>

                        {/* Specializations */}
                        <div>
                            <h3 className="font-semibold text-sm mb-3 text-fg-secondary">{t('tutorProfile.specializationsCaps')}</h3>
                            <div className="flex flex-wrap gap-2">
                                {tutor.specializations.map((spec, i) => (
                                    <Badge key={i} tone="success" size="md" icon={CheckCircle}>{spec}</Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: education, certs, languages */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Languages */}
                        <div className="p-5 rounded-2xl border border-border bg-surface">
                            <div className="flex items-center gap-2 mb-3">
                                <Globe size={16} className="text-primary" />
                                <h3 className="font-semibold text-sm">{t('tutorProfile.languages')}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tutor.languages.map((lang, i) => (
                                    <span key={i} className="px-3 py-1 rounded-lg text-sm border border-border text-fg">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Education timeline */}
                        <div className="p-5 rounded-2xl border border-border bg-surface">
                            <div className="flex items-center gap-2 mb-4">
                                <GraduationCap size={16} className="text-primary" />
                                <h3 className="font-semibold text-sm">{t('tutorProfile.education')}</h3>
                            </div>
                            <div className="space-y-4">
                                {tutor.education.map((edu, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-primary" />
                                            {i < tutor.education.length - 1 && (
                                                <div className="w-px flex-1 mt-1 bg-border" />
                                            )}
                                        </div>
                                        <div className="pb-3">
                                            <div className="font-medium text-sm leading-snug">{edu.degree}</div>
                                            <div className="text-xs mt-0.5 text-fg-secondary">
                                                {edu.institution} · {edu.year}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Certifications */}
                        <div className="p-5 rounded-2xl border border-border bg-surface">
                            <div className="flex items-center gap-2 mb-3">
                                <Award size={16} className="text-warning" />
                                <h3 className="font-semibold text-sm">{t('tutorProfile.certifications')}</h3>
                            </div>
                            <div className="space-y-2">
                                {tutor.certifications.map((cert, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                        <Award size={13} className="shrink-0 text-warning" />
                                        {cert}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
