import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Send, UserX, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import TutorHero from '../components/tutor/TutorHero';
import TutorAbout from '../components/tutor/TutorAbout';
import SubjectTags from '../components/tutor/SubjectTags';
import BookingWidget from '../components/tutor/BookingWidget';
import PricingCards from '../components/tutor/PricingCards';
import SessionTools from '../components/tutor/SessionTools';
import ReviewSection from '../components/tutor/ReviewSection';
import SessionResources from '../components/tutor/SessionResources';
import SimilarTutorsCarousel from '../components/tutor/SimilarTutorsCarousel';
import HomeFooter from '../components/home/HomeFooter';
import { normalizeTutor } from '../data/normalizeTutor';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';

export default function TutorProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const [loading, setLoading] = useState(true);
  const [tutor, setTutor] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const bookingRef = useRef(null);
  const [tutorUserId, setTutorUserId] = useState(null);

  useEffect(() => {
    setLoading(true);
    // First check sessionStorage cache for the exact avatar/name shown on listing
    const cached = JSON.parse(sessionStorage.getItem('tutors_cache') || '[]');
    const cachedTutor = cached.find(t => String(t.id) === String(id));

    api.get(`/tutors/${id}`)
      .then(r => {
        const normalized = normalizeTutor(r.data);
        const userId = r.data.users?.id ?? r.data.user_id;
        setTutorUserId(userId);
        if (cachedTutor) {
          normalized.avatar = cachedTutor.avatar;
          normalized.name   = cachedTutor.name;
        } else if (routeState?.avatar) {
          normalized.avatar = routeState.avatar;
          normalized.name   = routeState.name;
        }
        setTutor(normalized);
      })
      // Showing a fabricated profile here meant a failed lookup rendered an
      // invented tutor, complete with reviews, as though they were real.
      .catch(() => setTutor(null))
      .finally(() => setLoading(false));
  }, [id]);

  const scrollToBooking = () => {
    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const openMessageModal = () => {
    if (!user) { toast.error('Please log in to message a tutor'); navigate('/login'); return; }
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setMessage('');
  };

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const messages = JSON.parse(localStorage.getItem('tutorMessages') || '[]');
    messages.push({
      tutorId: tutor.id,
      tutorName: tutor.name,
      message: message,
      timestamp: new Date().toISOString(),
      status: 'sent'
    });
    localStorage.setItem('tutorMessages', JSON.stringify(messages));

    toast.success('Message sent! The tutor will respond within 24 hours.');
    closeMessageModal();
  };

  const structuredData = tutor ? {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": tutor.name,
    "jobTitle": tutor.title,
    "description": tutor.bio,
    "image": tutor.avatar,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": tutor.rating,
      "reviewCount": tutor.totalReviews
    },
    "offers": {
      "@type": "Offer",
      "price": tutor.pricing.single.price,
      "priceCurrency": "XAF"
    }
  } : null;

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "/" },
      { "@type": "ListItem", "position": 2, "name": "Tutors", "item": "/tutors" },
      { "@type": "ListItem", "position": 3, "name": tutor?.name }
    ]
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  // A failed lookup previously rendered a fabricated tutor here. Say plainly
  // that the profile could not be found instead of inventing one.
  if (!tutor) {
    return (
      <>
        <main className="min-h-screen pt-28 pb-20 px-6 bg-bg text-fg flex items-center">
          <div className="max-w-md mx-auto w-full text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-surface-hover text-fg-muted">
              <UserX size={26} strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Tutor not found
            </h1>
            <p className="text-sm mb-7 text-fg-secondary">
              This profile does not exist, or the tutor is no longer accepting bookings.
            </p>
            <Button to="/tutors" icon={ArrowLeft}>Back to tutors</Button>
          </div>
        </main>
        <HomeFooter />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{tutor.name} - {tutor.title} | StudyHub</title>
        <meta name="description" content={tutor.bio} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbData)}</script>
      </Helmet>

      <div className="bg-bg min-h-screen tutor-page-wrapper">
        <TutorHero
          tutor={{
            ...tutor,
            isOwn: user && tutorUserId && String(user.id) === String(tutorUserId),
            onUpload: (u) => setTutor(prev => ({ ...prev, avatar: u.profile_picture || null })),
          }}
          scrollToBooking={scrollToBooking}
          openMessageModal={openMessageModal}
        />
        <TutorAbout tutor={tutor} />
        <SubjectTags tutor={tutor} />
        <div ref={bookingRef}>
          <BookingWidget tutor={tutor} />
        </div>
        <PricingCards pricing={tutor.pricing} tutorId={tutor.id} scrollToBooking={scrollToBooking} />
        <SessionTools tools={tutor.sessionTools} />
        <ReviewSection
          reviews={tutor.reviews}
          ratingBreakdown={tutor.ratingBreakdown}
          totalReviews={tutor.totalReviews}
          rating={tutor.rating}
        />
        <SessionResources resources={tutor.resources} tutorName={tutor.name} />
        <SimilarTutorsCarousel excludeId={tutor.id} />

        <Modal open={showMessageModal} onClose={closeMessageModal} title={`Message ${tutor.name}`} size="lg">
          <p className="text-sm -mt-3 mb-4 text-fg-secondary">Response time: ~2 hours</p>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! I'm interested in learning more about your tutoring services..."
            rows={5}
          />

          <div className="flex gap-3 mt-4">
            <Button onClick={closeMessageModal} variant="secondary" fullWidth>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} icon={Send} fullWidth className="hover:scale-[1.02]">
              Send Message
            </Button>
          </div>
        </Modal>
      </div>
      <HomeFooter />
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-bg min-h-screen tutor-page-wrapper">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <div className="flex gap-8">
            <Skeleton className="w-32 h-32 rounded-2xl" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-[60%]" />
              <Skeleton className="h-6 w-[40%]" />
              <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-8 w-24" />
                ))}
              </div>
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    </div>
  );
}
