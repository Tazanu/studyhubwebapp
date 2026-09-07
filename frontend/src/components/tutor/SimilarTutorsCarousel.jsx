import { ChevronRight } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { normalizeTutorList } from '../../data/normalizeTutor';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import StarRating from '../ui/StarRating';

export default function SimilarTutorsCarousel({ tutors: propTutors, excludeId }) {
  const scrollRef = useRef(null);
  const [tutors, setTutors] = useState(propTutors ?? []);

  useEffect(() => {
    api.get('/tutors')
      .then(r => {
        if (r.data?.length) {
          const all = r.data.map(normalizeTutorList);
          sessionStorage.setItem('tutors_cache', JSON.stringify(all));
          const list = all
            .filter(t => t.id !== String(excludeId))
            .slice(0, 8);
          if (list.length) setTutors(list);
        }
      })
      .catch(() => {});
  }, [excludeId]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="px-6 py-12 border-t border-border bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Similar Tutors</h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-lg border border-border transition-all hover:border-primary"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-lg border border-border transition-all hover:border-primary"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tutors.map(tutor => (
            <TutorCard key={tutor.id} tutor={tutor} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TutorCard({ tutor }) {
  const navigate = useNavigate();

  const handleViewProfile = () => {
    navigate(`/tutor/${tutor.id}`, { state: { name: tutor.name, avatar: tutor.avatar } });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      onClick={handleViewProfile}
      className="flex-shrink-0 w-72 p-5 rounded-xl border border-border bg-bg transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
    >
      <img src={tutor.avatar} alt={tutor.name} className="w-full h-48 object-cover rounded-xl mb-4" />
      <h3 className="font-bold text-lg mb-2">{tutor.name}</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {tutor.subjects.slice(0, 2).map((subject, i) => (
          <Badge key={i} tone="primary" size="sm">{subject.name || subject}</Badge>
        ))}
      </div>
      <div className="flex items-center justify-between mb-4">
        <StarRating value={tutor.rating} size={16} showValue />
        <div className="font-bold text-primary">{(tutor.pricing?.single?.price ?? 0).toLocaleString()} FCFA</div>
      </div>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleViewProfile();
        }}
        variant="secondary"
        fullWidth
      >
        View Profile
      </Button>
    </div>
  );
}
