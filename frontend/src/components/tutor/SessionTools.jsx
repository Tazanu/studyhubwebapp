import { Video, Presentation, Share2, Upload, Mic, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

const toolIcons = {
  'HD Video Call': Video,
  'Interactive Whiteboard': Presentation,
  'Screen Sharing': Share2,
  'File Upload & Storage': Upload,
  'Session Recording': Video,
  'Real-time Chat': MessageCircle
};

export default function SessionTools({ tools }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleTrialClick = () => {
    if (!user) { toast.error(t('booking.loginForTrial')); navigate('/login'); return; }
    toast.info(t('booking.trialHint'));
  };
  return (
    <section className="px-6 py-12 border-t border-border bg-surface">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('tutorProfile.toolsTitle')}</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="aspect-video rounded-xl mb-4 flex items-center justify-center bg-primary-subtle">
              <div className="text-center">
                <Presentation className="w-16 h-16 mx-auto mb-3 text-primary" />
                <p className="font-semibold">{t('tutorProfile.whiteboardPreview')}</p>
              </div>
            </div>
            <Button onClick={handleTrialClick} fullWidth className="hover:scale-[1.02]">
              Start Free Trial Session
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t('tutorProfile.supportedTools')}</h3>
            <div className="grid grid-cols-2 gap-3">
              {tools.map((tool, i) => {
                const Icon = toolIcons[tool] || Mic;
                return (
                  <div key={i} className="p-4 rounded-xl border border-border bg-bg">
                    <Icon className="w-6 h-6 mb-2 text-primary" />
                    <p className="text-sm font-medium">{tool}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
