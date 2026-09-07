import { useState, useEffect } from 'react';
import { Users, Clock, Globe, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from './PaymentModal';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { calcSessionPrice } from '../../data/normalizeTutor';
import { cn } from '../../lib/cn';

const sessionTypes = [
  { id: '1on1', label: '1-on-1', icon: Users },
  { id: 'group', label: 'Group', icon: Users },
  { id: 'trial', label: 'Free Trial', icon: Clock }
];

const durations = [1, 2, 3, 4, 5, 6, 7, 8]; // hours per day
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-lg text-sm font-medium border transition-all whitespace-nowrap',
        active ? 'border-primary bg-primary-subtle text-primary' : 'border-border bg-surface text-fg',
      )}
    >
      {children}
    </button>
  );
}

export default function BookingWidget({ tutor }) {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedTime, setSelectedTime] = useState(null);
  const [sessionType, setSessionType] = useState('1on1');
  const [duration, setDuration] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [pendingBookingId, setPendingBookingId] = useState(null);
  const [credits, setCredits] = useState(0);
  const navigate = useNavigate();

  // Prepaid sessions the student already holds with this tutor.
  useEffect(() => {
    if (!user || !tutor?.id) return;
    let cancelled = false;
    api.get(`/tutors/${tutor.id}/credits`)
      .then(({ data }) => { if (!cancelled) setCredits(data.balance || 0); })
      .catch(() => { /* credits are a bonus, not required to book */ });
    return () => { cancelled = true; };
  }, [user, tutor?.id]);

  const calculatePrice = () => calcSessionPrice(duration, sessionType);

  const handleBook = () => {
    if (!user) {
      toast.error('Please log in to book a session');
      navigate('/login');
      return;
    }
    if (!selectedTime) {
      toast.error('Please select a time slot');
      return;
    }

    const booking = {
      tutor: tutor.name,
      tutorId: tutor.id,
      day: selectedDay,
      time: selectedTime,
      sessionType,
      duration,
      price: calculatePrice(),
      date: new Date().toISOString()
    };

    setBookingData(booking);
    setShowModal(true);
  };

  const confirmBooking = async () => {
    try {
      const dayIndex = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(bookingData.day);
      const today = new Date();
      const diff = (dayIndex - today.getDay() + 7) % 7 || 7;
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() + diff);

      const [startH, startM] = bookingData.time.split(':').map(Number);
      const endHRaw = startH + bookingData.duration;
      // Cap at 23:59 so the time string is always valid
      const endH = Math.min(endHRaw, 23);
      const endM = endHRaw > 23 ? 59 : startM;
      const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;

      const { data } = await api.post(`/tutors/${tutor.id}/bookings`, {
        subject: tutor.subjects?.[0]?.name || 'General',
        sessionDate: sessionDate.toISOString().split('T')[0],
        startTime: bookingData.time,
        endTime,
        durationHours: bookingData.duration,
        totalAmount: bookingData.price,
      });

      setPendingBookingId(data.booking?.id ?? null);
      setShowModal(false);

      // A prepaid pack covers the session, so there is nothing left to pay.
      if (data.paidWithCredit) {
        setCredits(data.creditsRemaining ?? 0);
        toast.success(
          `Session booked with a prepaid credit. ${data.creditsRemaining} session${data.creditsRemaining === 1 ? '' : 's'} left.`
        );
        setSelectedTime(null);
        return;
      }

      if (bookingData.price === 0) {
        toast.success('Free trial session booked!');
        setSelectedTime(null);
        return;
      }
      setShowPayment(true);
    } catch (err) {
      const msg = apiError(err, 'Failed to create booking. Please try again.');
      toast.error(msg);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('Payment confirmed! Session booked. Check your dashboard.');
    setShowPayment(false);
    setSelectedTime(null);
    setSelectedDay('Monday');
    setPendingBookingId(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setBookingData(null);
  };

  return (
    <section className="px-4 sm:px-6 py-12 border-t border-border bg-surface">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Book a Session</h2>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Session Type</label>
              <div className="grid grid-cols-3 gap-2">
                {sessionTypes.map(type => (
                  <Pill key={type.id} active={sessionType === type.id} onClick={() => setSessionType(type.id)}>
                    {type.label}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium mb-2">Duration</label>
              <div className="flex flex-wrap gap-2">
                {durations.map(d => (
                  <Pill key={d} active={duration === d} onClick={() => setDuration(d)}>
                    {d}h
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 font-medium mb-2">
                <Globe className="w-4 h-4" />
                Timezone: {tutor.availability.timezone}
              </label>
            </div>

            <div className="p-4 rounded-xl bg-primary-subtle">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-2xl">{calculatePrice().toLocaleString()}</span>
                <span className="text-sm text-fg-secondary">FCFA</span>
              </div>
              <div className="text-sm text-fg-secondary">
                per {duration} hour{duration > 1 ? 's' : ''} {sessionType === '1on1' ? '1-on-1' : sessionType} session
              </div>
              {sessionType === 'trial' && (
                <div className="mt-2 text-xs font-medium text-success">🎉 First trial session is FREE!</div>
              )}
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">Select Day & Time</label>
            <div className="mb-4 overflow-x-auto">
              <div className="flex gap-2">
                {days.map(day => (
                  <Pill key={day} active={selectedDay === day} onClick={() => setSelectedDay(day)}>
                    {day.slice(0, 3)}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {tutor.availability.schedule[selectedDay]?.map(time => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    'p-2 rounded-lg border text-sm font-medium transition-all hover:shadow-sm',
                    selectedTime === time ? 'border-primary bg-primary-subtle text-primary' : 'border-border bg-surface text-fg',
                  )}
                >
                  {time}
                </button>
              )) || <p className="col-span-3 text-center py-4 text-fg-secondary">No available slots</p>}
            </div>

            <Button onClick={handleBook} disabled={!selectedTime} fullWidth size="lg" className="hover:scale-[1.02]">
              Book Now
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showModal && !!bookingData} onClose={closeModal} title="Confirm Booking" size="sm">
        {bookingData && (
          <>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-fg-secondary">Tutor</span>
                <span className="font-medium">{bookingData.tutor}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-fg-secondary">Date</span>
                <span className="font-medium">{bookingData.day}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-fg-secondary">Time</span>
                <span className="font-medium">{bookingData.time}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-fg-secondary">Duration</span>
                <span className="font-medium">{bookingData.duration} hour{bookingData.duration > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-fg-secondary">Session Type</span>
                <span className="font-medium capitalize">{bookingData.sessionType === '1on1' ? '1-on-1' : bookingData.sessionType}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Total Price</span>
                <span className="font-bold text-xl text-primary">
                  {credits > 0
                    ? 'Prepaid'
                    : bookingData.price === 0
                      ? 'FREE'
                      : `${bookingData.price.toLocaleString()} FCFA`}
                </span>
              </div>
              {credits > 0 && (
                <p className="text-sm text-fg-secondary pt-1">
                  Covered by your session pack — {credits} session{credits === 1 ? '' : 's'} remaining.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={closeModal} variant="secondary" fullWidth>
                Cancel
              </Button>
              <Button onClick={confirmBooking} icon={Check} fullWidth className="hover:scale-[1.02]">
                Confirm
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Payment modal */}
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
        amount={bookingData?.price ?? 0}
        description={`Session with ${tutor.name} · ${bookingData?.duration} min`}
        order={{ type: 'tutor_booking', bookingId: pendingBookingId }}
      />
    </section>
  );
}
