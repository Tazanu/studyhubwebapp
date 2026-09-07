import HeroSection       from '../components/home/HeroSection';
import TrustBar          from '../components/home/TrustBar';
import WhySection        from '../components/home/WhySection';
import CourseDiscovery   from '../components/home/CourseDiscovery';
import HowItWorks        from '../components/home/HowItWorks';
import TestimonialsSection from '../components/home/TestimonialsSection';
import FinalCTA          from '../components/home/FinalCTA';
import HomeFooter        from '../components/home/HomeFooter';
import Seo from '../components/Seo';

export default function Home() {
    return (
        <main id="main-content" tabIndex={-1} className="bg-bg text-fg">
            <Seo description="StudyHub is a peer-to-peer learning platform for students: join study groups, share course notes, ask questions in the Q&amp;A forum and book verified tutors. Free to join." path="/" />
            <HeroSection />
            <TrustBar />
            <WhySection />
            <CourseDiscovery />
            <HowItWorks />
            <TestimonialsSection />
            <FinalCTA />
            <HomeFooter />
        </main>
    );
}
