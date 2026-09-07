import { Check, Zap, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PaymentModal from './PaymentModal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { cn } from '../../lib/cn';

export default function PricingCards({ pricing, tutorId, scrollToBooking }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentPlan, setPaymentPlan] = useState(null);

  const handleChoosePlan = (plan) => {
    if (!user) { toast.error('Please log in to choose a plan'); navigate('/login'); return; }
    setPaymentPlan(plan);
  };

  const handlePaymentSuccess = (result) => {
    setSelectedPlan(paymentPlan.key);
    const sessions = result?.sessions ?? paymentPlan.sessions;
    toast.success(`${paymentPlan.name} activated — ${sessions} session${sessions === 1 ? '' : 's'} ready to book.`);
    setPaymentPlan(null);
    if (scrollToBooking) setTimeout(() => scrollToBooking(), 500);
  };

  const plans = [
    { key: 'single',   name: 'Single Session', ...pricing.single,   price: Math.round(pricing.single.price)   },
    { key: 'monthly',  name: 'Monthly Pack',   ...pricing.monthly,  price: Math.round(pricing.monthly.price)  },
    { key: 'semester', name: 'Semester Bundle',...pricing.semester,  price: Math.round(pricing.semester.price) },
  ];

  return (
    <section className="px-4 sm:px-6 py-12 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pricing Plans</h2>
          <p className="text-fg-secondary">Choose the plan that works best for you</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div
              key={plan.key}
              className={cn(
                'p-6 rounded-2xl border bg-surface transition-all hover:shadow-xl relative',
                plan.badge ? 'border-2 border-primary scale-[1.03]' : 'border-border',
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge tone="primary" size="sm" icon={Zap} className="!bg-[image:var(--gradient-primary)] !text-white">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold mb-1 text-primary">
                  {plan.price.toLocaleString()}
                  <span className="text-lg font-normal text-fg-secondary"> FCFA</span>
                </div>
                <p className="text-sm text-fg-secondary">{plan.sessions} session{plan.sessions > 1 ? 's' : ''}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-success" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {selectedPlan === plan.key ? (
                <Button variant="secondary" fullWidth disabled className="!opacity-100 !text-success !border-success">
                  ✓ Active
                </Button>
              ) : (
                <Button
                  onClick={() => handleChoosePlan(plan)}
                  variant={plan.badge ? 'primary' : 'outline'}
                  fullWidth
                  className="hover:scale-[1.02]"
                >
                  Pay {plan.price.toLocaleString()} FCFA
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm flex items-center justify-center gap-1.5 text-fg-secondary">
          <Lock size={13} /> Secured by MeSomb · MTN MoMo & Orange Money
        </div>
      </div>

      <PaymentModal
        open={!!paymentPlan}
        onClose={() => setPaymentPlan(null)}
        onSuccess={handlePaymentSuccess}
        amount={paymentPlan?.price ?? 0}
        description={paymentPlan ? `${paymentPlan.name} · ${paymentPlan.sessions} session${paymentPlan.sessions > 1 ? 's' : ''}` : ''}
        order={{ type: 'pricing_plan', tutorId, planKey: paymentPlan?.key }}
      />
    </section>
  );
}
