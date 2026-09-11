import { useState } from 'react';
import { Shield, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/formatDate';
import Select from '../ui/Select';
import Button from '../ui/Button';
import StarRating from '../ui/StarRating';

export default function ReviewSection({ reviews, ratingBreakdown, totalReviews, rating }) {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState('recent');
  const [showAll, setShowAll] = useState(false);

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'highest') return b.rating - a.rating;
    return 0;
  });

  const displayReviews = showAll ? sortedReviews : sortedReviews.slice(0, 4);

  return (
    <section className="px-6 py-12 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('tutorProfile.reviewsTitle')}</h2>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="text-center p-6 rounded-xl bg-surface">
            <div className="text-5xl font-bold mb-2">{rating}</div>
            <div className="flex justify-center mb-2">
              <StarRating value={rating} size={20} />
            </div>
            <p className="text-sm text-fg-secondary">{t('tutorProfile.totalReviews', { count: totalReviews ?? 0 })}</p>
          </div>

          <div className="md:col-span-2">
            <RatingBreakdown breakdown={ratingBreakdown} total={totalReviews} />
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold">{t('tutorProfile.studentReviews')}</h3>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto">
            <option value="recent">{t('tutorProfile.sortRecent')}</option>
            <option value="highest">{t('tutorProfile.sortHighest')}</option>
          </Select>
        </div>

        <div className="space-y-4">
          {displayReviews.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        {reviews.length > 4 && (
          <Button
            onClick={() => setShowAll(!showAll)}
            variant="secondary"
            icon={ChevronDown}
            className="mt-6 mx-auto"
          >
            {showAll ? 'Show Less' : 'Load More Reviews'}
          </Button>
        )}
      </div>
    </section>
  );
}

function RatingBreakdown({ breakdown, total }) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map(stars => {
        const count = breakdown[stars] || 0;
        const percentage = (count / total) * 100;
        return (
          <div key={stars} className="flex items-center gap-3">
            <span className="text-sm font-medium w-8">{stars}★</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-surface">
              <div className="h-full transition-all bg-warning" style={{ width: `${percentage}%` }} />
            </div>
            <span className="text-sm w-12 text-right text-fg-secondary">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReviewCard({ review }) {
  const { t } = useTranslation();
  return (
    <div className="p-6 rounded-xl border border-border bg-surface">
      <div className="flex items-start gap-4">
        <img src={review.avatar} alt={review.studentName} className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{review.studentName}</span>
                {review.verified && (
                  <Shield className="w-4 h-4 text-success" title={t('tutorProfile.verifiedStudent')} />
                )}
              </div>
              <div className="text-sm text-fg-secondary">
                {t(`subjectName.${review.subject}`, { defaultValue: review.subject })} · {formatDate(review.date, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <StarRating value={review.rating} size={16} />
          </div>
          <p className="leading-relaxed">{review.text}</p>
        </div>
      </div>
    </div>
  );
}
