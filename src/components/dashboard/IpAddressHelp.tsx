import { useEffect, useState } from 'react';
import { AlertCircle, X, Smartphone, Settings2, Wifi, Copy } from 'lucide-react';

const STEPS = [
  {
    icon: Smartphone,
    title: 'Open your camera app',
    body: 'Open the phone app that came with the camera (V380 Pro, CamHi, Cam720…) on the same Wi-Fi as this computer.',
  },
  {
    icon: Settings2,
    title: 'Open device settings',
    body: 'Tap your camera, then the gear icon. Look for "Device information", "Network" or "About device".',
  },
  {
    icon: Wifi,
    title: 'Find the IP address',
    body: 'The line named "IP address" shows numbers like 192.168.18.98. That is the address of your camera.',
  },
  {
    icon: Copy,
    title: 'Type it here',
    body: 'Type those numbers into the "Camera IP address" box. The stream link is created for you automatically.',
  },
];

export default function IpAddressHelp() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Animated auto-advance while the tutorial is open
  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => setStep(s => (s + 1) % STEPS.length), 3800);
    return () => window.clearInterval(t);
  }, [open]);

  useEffect(() => { if (open) setStep(0); }, [open]);

  const Active = STEPS[step].icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How to find the camera IP address in the camera app"
        title="How do I get the IP address from the camera app?"
        className="flex-shrink-0 w-7 h-7 rounded-full border border-primary/50 bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-transform hover:scale-110 animate-pulse"
      >
        <AlertCircle className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-7 shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="How to find your camera IP address"
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <h3 className="text-[26px] font-bold">How to get the IP address</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-2 rounded-lg border border-border hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Animated phone mockup */}
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="relative w-[190px] h-[340px] flex-shrink-0 rounded-[28px] border-4 border-border bg-background overflow-hidden">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-2 rounded-full bg-border" />
                <div className="absolute inset-x-0 top-8 h-[220px] overflow-hidden">
                  <div
                    className="transition-transform duration-500 ease-out"
                    style={{ transform: `translateY(-${step * 72}px)` }}
                  >
                    {STEPS.map((s, i) => (
                      <div
                        key={s.title}
                        className={`h-[64px] mx-2.5 mb-2 rounded-xl border px-2.5 flex items-center gap-2 transition-colors ${
                          i === step ? 'border-primary bg-primary/15' : 'border-border bg-secondary/30'
                        }`}
                      >
                        <s.icon className={`w-5 h-5 flex-shrink-0 ${i === step ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-[13px] font-semibold leading-tight">{s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-3 inset-x-3 rounded-lg bg-primary/20 border border-primary/40 px-2 py-1.5 text-center">
                  <span className="text-[14px] font-bold text-primary">192.168.18.98</span>
                </div>
              </div>

              <div key={step} className="flex-1 min-w-0 animate-fade-in">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                    <Active className="w-5 h-5" />
                  </span>
                  <span className="text-[17px] font-bold">Step {step + 1} of {STEPS.length}</span>
                </div>
                <p className="text-[21px] font-bold mb-2">{STEPS[step].title}</p>
                <p className="text-[18px] text-muted-foreground leading-relaxed">{STEPS[step].body}</p>
              </div>

            </div>

            <div className="mt-4 flex gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => setStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="text-[15px] font-semibold px-4 py-2.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40"
              >
                Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="text-[15px] font-bold px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => setOpen(false)}
                  className="text-[15px] font-bold px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
