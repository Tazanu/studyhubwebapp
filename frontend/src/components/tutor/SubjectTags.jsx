import { BookOpen } from 'lucide-react';
import Badge from '../ui/Badge';

const LEVEL_TONE = {
    Expert: 'premium',
    Advanced: 'primary',
    Intermediate: 'info',
    Beginner: 'success',
};

export default function SubjectTags({ tutor }) {
  return (
    <section className="px-6 py-12 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Subjects & Expertise</h2>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {tutor.subjects.map((subject, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-surface transition-all hover:shadow-md">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">{subject.name}</h3>
                </div>
                <Badge tone={LEVEL_TONE[subject.level] ?? 'neutral'} size="sm">{subject.level}</Badge>
              </div>
              <p className="text-sm text-fg-secondary">{subject.grades}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold mb-3">Specializations</h3>
          <div className="flex flex-wrap gap-2">
            {tutor.specializations.map((spec, i) => (
              <Badge key={i} tone="success" size="md">{spec}</Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
