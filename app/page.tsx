import HeroSection from '@/components/HeroSection';
import LandingSections from '@/components/LandingSections';

export const metadata = {
  title: 'QuizForge AI - Study Smarter, Not Harder',
  description:
    'Upload any study material and QuizForge instantly crafts AI-powered MCQs, tracks your performance, and turns revision into results.',
};

export default function Home() {
  return (
    <>
      <HeroSection />
      <LandingSections />
    </>
  );
}
