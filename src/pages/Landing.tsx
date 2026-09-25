import IdleHint from '@/components/IdleHint';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Eye, Wifi, Bell, Cpu, Users, ArrowRight, CheckCircle2, Lock, Zap, MonitorSmartphone, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Eye,
    title: 'Real-Time Object Detection',
    description: 'COCO-SSD powered detection identifies 80+ object types with adjustable sensitivity for precise monitoring.',
  },
  {
    icon: Cpu,
    title: 'Multimodal Saliency Engine',
    description: 'Fuses visual saliency, audio analysis, and object detection into a unified attention score.',
  },
  {
    icon: Bell,
    title: 'Smart Alert System',
    description: 'Instant alerts for detected activities, speech events, and custom wake words with household notifications.',
  },
  {
    icon: Users,
    title: 'Household Management',
    description: 'Invite family members, manage permissions, and share real-time monitoring across your household.',
  },
  {
    icon: Shield,
    title: 'Activity Recognition',
    description: 'AI-powered inference identifies what people are doing — eating, working, playing — in real time.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Live Speech Transcription',
    description: 'Built-in speech-to-text captures conversations and voice commands directly on the camera feed.',
  },
];

const securityBadges = [
  { icon: Lock, label: 'End-to-End Encryption', description: 'All data is encrypted in transit and at rest' },
  { icon: Shield, label: 'Privacy First', description: 'Video processed locally — never stored on external servers' },
  { icon: Wifi, label: 'Secure Connection', description: 'Authenticated sessions with role-based access control' },
  { icon: Zap, label: 'Real-Time Processing', description: 'Edge computing ensures zero-latency detection' },
];

const steps = [
  { step: '01', title: 'Create Household', description: 'Sign up and set up your household with a unique invite code for family members.' },
  { step: '02', title: 'Start Monitoring', description: 'Enable your camera and microphone — the system begins detecting objects and analyzing audio immediately.' },
  { step: '03', title: 'Get Smart Alerts', description: 'Receive real-time notifications when priority objects, speech, or unusual activity is detected.' },
  { step: '04', title: 'Review & Respond', description: 'Check the fused detection view, review alert history, and take action from anywhere.' },
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('safewatch-dark-mode');
    if (saved === 'true') return true;
    if (saved === 'false') return false;
    return document.documentElement.classList.contains('dark');
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">MSDSystem</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                document.documentElement.classList.toggle('dark');
                setDarkMode(prev => {
                  localStorage.setItem('safewatch-dark-mode', String(!prev));
                  return !prev;
                });
              }}
              className="p-2.5 rounded-xl hover:bg-muted transition-colors"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5 text-foreground" /> : <Moon className="w-5 h-5 text-foreground" />}
            </button>
            {!loading && (
              user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-base font-semibold bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/auth')}
                    className="text-base text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5"
                  >
                    Sign In
                  </button>
                  <div className="relative">
                    <IdleHint message="New here? Tap Get Started to create your account" placement="bottom" />
                    <button
                      onClick={() => navigate('/auth')}
                      className="text-base font-semibold bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
                    >
                      Get Started
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative hero-gradient">
        <div className="max-w-6xl mx-auto px-6 py-28 md:py-36 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
            <span className="inline-flex items-center gap-2 text-base font-semibold bg-primary/10 text-primary px-4 py-2 rounded-full mb-8">
              <Shield className="w-4 h-4" />
              Secure • Real-Time • Intelligent
            </span>
          </motion.div>
          <motion.h1
            className="text-5xl md:text-7xl font-extrabold text-foreground leading-tight tracking-tight mb-8"
            initial="hidden" animate="visible" variants={fadeIn} custom={1}
          >
            Multimodal Saliency
            <br />
            <span className="text-primary">Detection System</span>
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
            initial="hidden" animate="visible" variants={fadeIn} custom={2}
          >
            Advanced real-time monitoring that combines object detection, audio analysis, and visual saliency
            into one unified attention system — built for household safety and awareness.
          </motion.p>
          <motion.div
            className="flex items-center justify-center gap-4"
            initial="hidden" animate="visible" variants={fadeIn} custom={3}
          >
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="inline-flex items-center gap-2 text-lg font-semibold bg-primary text-primary-foreground px-10 py-4 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              {user ? 'Open Dashboard' : 'Get Started Free'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Security Badges */}
      <section className="border-y border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {securityBadges.map((badge, i) => (
              <motion.div
                key={badge.label}
                className="text-center space-y-3"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} custom={i}
              >
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
                  <badge.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-base font-bold text-foreground">{badge.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{badge.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5">
            Everything You Need for
            <span className="text-primary"> Smart Monitoring</span>
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            A comprehensive suite of detection and analysis tools working together in real time.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="bg-card rounded-2xl border border-border p-7 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} custom={i}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5">
              How It <span className="text-primary">Works</span>
            </h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Get up and running in minutes with a simple setup process.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                className="relative text-center"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} custom={i}
              >
                <div className="text-6xl font-extrabold text-primary/10 mb-4">{step.step}</div>
                <h3 className="text-lg font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">{step.description}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute -right-4 top-8 w-6 h-6 text-border" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <motion.div
          className="bg-primary/5 border border-primary/20 rounded-3xl p-14"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} custom={0}
        >
          <h2 className="text-4xl font-extrabold text-foreground mb-5">
            Ready to Secure Your Home?
          </h2>
          <p className="text-muted-foreground text-xl mb-10 max-w-2xl mx-auto">
            Start monitoring in minutes with our intelligent multimodal detection system.
          </p>
          <div className="relative inline-block">
            <IdleHint message={user ? 'Open your dashboard to start monitoring' : 'Create your free account here'} />
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="inline-flex items-center gap-2 text-lg font-semibold bg-primary text-primary-foreground px-10 py-4 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              {user ? 'Open Dashboard' : 'Create Free Account'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Eye className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold text-foreground">MSDSystem</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Multimodal Saliency Detection System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
