import { useState, useCallback, useRef, useEffect } from 'react';
import { Moon, Sun, Home, LogOut, LogIn, Shield, Clock, Wifi, X, Flame, HelpCircle, Menu, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CameraFeed from '@/components/dashboard/CameraFeed';
import FusedDetectionView from '@/components/dashboard/FusedDetectionView';
import AlertLog from '@/components/dashboard/AlertLog';
import ControlsPanel from '@/components/dashboard/ControlsPanel';
import AttentionGauge from '@/components/dashboard/AttentionGauge';
import DetectionFeedback from '@/components/dashboard/DetectionFeedback';

import PerformanceMonitor from '@/components/dashboard/PerformanceMonitor';

import TutorialOverlay, { type TutorialStep } from '@/components/dashboard/TutorialOverlay';
import ExpertMode, { type AlgorithmId } from '@/components/dashboard/ExpertMode';

import { useCamera } from '@/hooks/useCamera';
import { useAudioAnalysis } from '@/hooks/useAudioAnalysis';
import { useObjectDetection } from '@/hooks/useObjectDetection';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { useIpCamera } from '@/hooks/useIpCamera';
import { announce } from '@/lib/voiceGuide';
import { useCctvSpeech } from '@/hooks/useCctvSpeech';
import { AI_RATES, perfMonitor, now as perfNow } from '@/lib/performance';
import { sendAlertEmail } from '@/lib/alertEmail';
import type { CameraRuntime, DetectionEvent } from '@/types/multicam';

import { useCctvTalk } from '@/hooks/useCctvTalk';
import { loadServerHost, serverUrlFor, useCameraSlots } from '@/hooks/useCameraSlots';
import { stopAll as stopAllCameras, stopCamera } from '@/lib/multiCamServer';
import { matchWakeWord } from '@/lib/safetyLexicon';
import CameraSlotSelector, { SlotPipelineView } from '@/components/dashboard/CameraSlotSelector';


import AccessibilityPanel from '@/components/dashboard/AccessibilityPanel';
import MultiCameraConnect from '@/components/dashboard/MultiCameraConnect';
import IdleHint, { setHintsSuppressed } from '@/components/IdleHint';




import { useFaceDistress } from '@/hooks/useFaceDistress';
import { useYamnet } from '@/hooks/useYamnet';
import { detectFire, createFireState } from '@/lib/fireDetection';
import { useWakeLock } from '@/hooks/useWakeLock';
import type { SaliencyBreakdown } from '@/lib/fireDetection';
import type { SaliencyMode, QualityMode, Alert, DetectedObject } from '@/types/dashboard';
import { DEFAULT_PRIORITY_OBJECTS } from '@/types/dashboard';

// Repeated low-value events (speech / person present / ambient noise) get a
// much longer cooldown so they cannot flood state and the alert log.
// Emergency, fire and wake-word events keep the original fast cooldown.
const LOW_VALUE_ALERTS = /^(Speech detected|Person detected|High noise level|Clap detected)$/;

/** Survives route changes so the camera/detection session is not restarted. */
const monitoringSession = { running: false };

const ALGORITHM_TOURS: Record<AlgorithmId, TutorialStep[]> = {
  vision: [
    {
      selector: '#tour-fused-view', placement: 'bottom', title: 'Visual saliency',
      body: 'Each camera frame is changed to grayscale. Sobel edges or frame-to-frame motion reveal the parts that deserve attention.',
      implementation: 'src/lib/saliency.ts',
      code: `const saliency = computeSaliency(frame, previousFrame, 'sobel', 40);\nconst score = computeSaliencyScore(saliency);`,
    },
    {
      selector: '#tour-fused-view', placement: 'bottom', title: 'Object detection',
      body: 'COCO-SSD with MobileNet v2 identifies people and common objects. A confidence threshold removes uncertain boxes.',
      implementation: 'src/lib/detectionEngine.ts',
      code: `const predictions = await model.detect(frame, 20, minimumConfidence);`,
    },
  ],
  fire: [
    {
      selector: '#tour-fire-analysis', placement: 'top', title: 'Fire and smoke analysis',
      body: 'The system combines fire-colored pixels, movement over recent frames, smoke color, and visibility. TV, phone, laptop, poster, and static-red false alarms are rejected.',
      implementation: 'src/lib/fireDetection.ts',
      code: `confidence = fireColor + flicker + smoke + lowVisibility;\nif (insideScreen || staticRedObject) rejectCandidate();`,
    },
  ],
  face: [
    {
      selector: '#tour-face-distress', placement: 'top', title: 'Facial distress',
      body: 'TinyFaceDetector finds the nearest face. Expression scores are weighted for safety and averaged across five samples to prevent flickering alerts.',
      implementation: 'src/hooks/useFaceDistress.ts',
      code: `distress = sad + 1.4*fearful + 0.8*angry + 0.7*disgusted;\nscore = average(lastFiveSamples);`,
    },
  ],
  speech: [
    {
      selector: '#tour-live-transcription', placement: 'bottom', title: 'CCTV speech transcription',
      body: 'Sound comes from the CCTV RTSP stream. FFmpeg creates 16 kHz mono WAV chunks, then local Whisper returns the complete English or Tagalog sentence.',
      implementation: 'local-server/msds/camera.py · local-server/msds/whisper_engine.py',
      code: `RTSP audio → FFmpeg WAV chunks → Whisper sentence`,
    },
    {
      selector: '#tour-live-transcription', placement: 'bottom', title: 'Safety phrase matching',
      body: 'The complete sentence stays visible. Separately, the safety library checks phrases such as “help me”, “call police”, “tulong”, and “tumawag kayo ng pulis” for alert logic.',
      implementation: 'src/lib/safetyLexicon.ts',
      code: `const safetyMatch = matchWakeWord(fullTranscript);`,
    },
  ],
  audio: [
    {
      selector: '#tour-audio-distress', placement: 'top', title: 'Sound distress',
      body: 'YAMNet examines short sound windows and scores safety sounds such as screaming, crying, shouting, and wailing while suppressing ordinary sounds.',
      implementation: 'src/hooks/useYamnet.ts',
      code: `distress = weightedSafetySounds - 0.5 * ordinarySounds;`,
    },
  ],
  hybrid: [
    {
      selector: '#tour-fused-view', placement: 'bottom', title: '1. Observe every signal',
      body: 'The hybrid system watches visual saliency and objects while listening for sound distress and English or Tagalog safety speech. It also checks faces, fire, smoke, and visibility.',
      implementation: 'src/hooks/useCameraPipeline.ts',
      code: `vision + objects + sound + speech + face + fire + smoke`,
    },
    {
      selector: '#tour-saliency-score', placement: 'top', title: '2. Combine attention',
      body: 'The main attention score combines visual saliency, audio activity, and object confidence. Other critical detectors can independently raise a safety event.',
      implementation: 'src/pages/Index.tsx',
      code: `attention = 0.40*visual + 0.30*audio + 0.30*objects;`,
    },
    {
      selector: '#tour-alert-log', placement: 'left', title: '3. Record the result',
      body: 'Only meaningful safety events become alerts. The system applies cooldowns, records the source and time, and shows the result in the event log.',
      implementation: 'src/pages/Index.tsx · src/components/dashboard/AlertLog.tsx',
      code: `if (safetyEvent && cooldownReady) addAlert(event);`,
    },
  ],
};


export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { householdId, wakeWords, members, checkForWakeWord, logAlert, logNotification } = useHousehold(user?.id);
  const { cameras, devices, startCameras, stopCameras, updateCamera, attachStream, enumerateDevices } = useCamera();
  // Always-current camera snapshot for analysis loops, so throttled timers do
  // not have to restart every time an object list changes.
  const camerasRef = useRef(cameras);
  camerasRef.current = cameras;

  const { audioFeatures, startAudio, stopAudio } = useAudioAnalysis();
  const { loadModel, detect, stats: detectionStats } = useObjectDetection();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('safewatch-dark-mode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
      return true;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('safewatch-dark-mode', String(darkMode));
  }, [darkMode]);

  // Auto-launch onboarding tutorial once per signed-in user
  useEffect(() => {
    if (authLoading) return;
    const key = user ? `msds-tutorial-done-${user.id}` : 'msds-tutorial-done-guest';
    if (!localStorage.getItem(key)) {
      // Small delay so panels have mounted and refs exist
      const t = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(t);
    }
  }, [authLoading, user]);

  const tutorialSteps: TutorialStep[] = [
    {
      selector: '#tour-header',
      placement: 'bottom',
      title: 'Welcome to MSDSystem',
      body: 'This is your Multimodal Saliency Detection dashboard. I will walk you through the key panels and what each one does.',
      narration: 'Welcome to the Multimodal Saliency Detection dashboard. I will guide you through each part.',
    },
    {
      selector: '#tour-start',
      placement: 'left',
      title: 'Start Monitoring',
      body: 'Press this to activate the full detection pipeline: camera capture, saliency, object detection, audio, and emergency reasoning.',
      narration: 'Press Start Monitoring to activate the full detection pipeline.',
    },
    {
      selector: '#tour-cams',
      childIndex: 1,
      placement: 'bottom',
      title: 'CAM 1 — Raw Feed',
      body: 'Your live camera stream. Bounding boxes and low-level saliency overlays are drawn here so you can see what the system is seeing.',
      narration: 'This is the raw live feed. Bounding boxes appear here as objects are detected.',
    },
    {
      selector: '#tour-cams',
      childIndex: 2,
      placement: 'bottom',
      title: 'CAM 2 — Fused Detection',
      body: 'The fused detection view combines vision, audio, speech, and face analysis to infer activity, distress, fire, and emergencies.',
      narration: 'This panel fuses vision, audio, speech and face signals to infer the current situation.',
    },
    {
      selector: '#tour-sidebar',
      childIndex: 2,
      placement: 'left',
      title: 'Attention Score',
      body: 'A single 0 to 100 score summarising how much the system currently believes something important is happening. Higher means more attention needed.',
      narration: 'This is the attention score, a summary of how urgent the current scene looks.',
    },
    {
      selector: '#tour-sidebar',
      childIndex: 3,
      placement: 'left',
      title: 'Audio Meter & Talking AI',
      body: 'Live decibel, speech, and distress sound analysis. Wake words and screams are picked up here and can trigger the emergency response.',
      narration: 'The audio meter listens for speech, wake words, and distress sounds like screams.',
    },
    {
      selector: '#tour-sidebar',
      childIndex: 4,
      placement: 'left',
      title: 'Alert Log',
      body: 'Every important event lands here with a timestamp, severity, and snapshot. Click an alert to review the moment it was captured.',
      narration: 'All events and alerts are logged here for review.',
    },
    {
      selector: '#tour-sidebar',
      childIndex: 6,
      placement: 'left',
      title: 'Controls',
      body: 'Toggle bounding boxes, heatmap, alerts, quality, and which objects the system should treat as priority. You can also export a session as CSV here.',
      narration: 'Use the controls to tune detection, choose priority objects, and export session data.',
    },
    {
      selector: '#tour-header',
      placement: 'center',
      title: 'You are ready',
      body: 'Connect a camera, press Start Monitoring, and the system will begin listening and watching. You can replay this tour anytime from the help icon.',
      narration: 'You are ready. Connect a camera and press Start Monitoring to begin.',
    },
  ];
  const { transcript, interimTranscript, isListening: speechListening, supported: speechSupported, start: startSpeech, stop: stopSpeech, clear: clearSpeech } = useSpeechRecognition();
  const [showEmergency, setShowEmergency] = useState(false);

  // Monitoring keeps running while the user visits other pages: the flag lives
  // outside React so returning to the dashboard resumes the live session.
  const [running, setRunningState] = useState(monitoringSession.running);
  const setRunning = useCallback((v: boolean) => {
    monitoringSession.running = v;
    setRunningState(v);
  }, []);

  // Keep the device/tab awake while monitoring so detection isn't suspended
  useWakeLock(running);

  const [showTutorial, setShowTutorial] = useState(false);
  const [showExpert, setShowExpert] = useState(false);
  const [activeTutorialSteps, setActiveTutorialSteps] = useState<TutorialStep[]>(tutorialSteps);
  const [saliencyMode, setSaliencyMode] = useState<SaliencyMode>('sobel');
  const [threshold, setThreshold] = useState(15);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [quality, setQuality] = useState<QualityMode>('SD');
  const [mirror, setMirror] = useState(false);
  const [heatmapOpacity, setHeatmapOpacity] = useState(50);
  const [simulationMode, setSimulationMode] = useState(false);
  const [priorityObjects, setPriorityObjects] = useState<string[]>(DEFAULT_PRIORITY_OBJECTS);
  const [minConfidence, setMinConfidence] = useState(45); // percentage 0-100
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors] = useState<string[]>([]);
  const [attentionScore, setAttentionScore] = useState(0);
  const [globalSaliencyScore, setGlobalSaliencyScore] = useState(0);
  const [slotMetrics, setSlotMetrics] = useState<Record<number, Pick<CameraRuntime, 'attentionScore' | 'saliencyScore'>>>({});

  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [cam2SourceCanvas, setCam2SourceCanvas] = useState<HTMLCanvasElement | null>(null);

  // Camera-connection gating: detection only runs while at least one
  // webcam or IP/CCTV stream is connected. UI message reflects state.
  const [cameraStatusMsg, setCameraStatusMsg] = useState<string>(
    'No camera connected. Please connect a webcam or CCTV/IP camera.'
  );

  // Auto-detect available cameras on mount so the Connect picker is populated
  // before the user clicks Start. Browsers won't expose device labels until
  // permission is granted, but deviceIds are enough to count availability.
  useEffect(() => {
    enumerateDevices().then(list => {
      if (!list || list.length === 0) {
        setCameraStatusMsg('No camera detected. Connect a webcam or CCTV/IP camera.');
      }
    }).catch(() => {});
    if (navigator.mediaDevices && 'addEventListener' in navigator.mediaDevices) {
      const onChange = () => { enumerateDevices(); };
      navigator.mediaDevices.addEventListener('devicechange', onChange);
      return () => navigator.mediaDevices.removeEventListener('devicechange', onChange);
    }
  }, [enumerateDevices]);

  // IP camera state
  const [showIpDialog, setShowIpDialog] = useState(false);
  const [ipUrl, setIpUrl] = useState('');
  const [ipKind, setIpKind] = useState<'hls' | 'mjpeg' | 'image'>('hls');
  // Single-camera mode: everything runs on CAM 2 (slot index 0 internally as the
  // sole detection source). We keep constants so downstream logic stays intact.
  const ipTargetSlot = 1;
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const ipCam = useIpCamera();

  // CAM 1..4 selector for the main frame (display only — never disconnects).
  const { slots: camSlots, updateSlot: updateCamSlot } = useCameraSlots();
  const [selectedCam, setSelectedCam] = useState(1);
  const [camListOpen, setCamListOpen] = useState(true);

  const openAlgorithmTutorial = useCallback((algorithmId: AlgorithmId) => {
    const steps = ALGORITHM_TOURS[algorithmId];
    setShowExpert(false);
    setSelectedCam(1);
    if (steps.some(step => step.selector.startsWith('#tour-') && step.selector !== '#tour-fused-view' && step.selector !== '#tour-live-transcription')) {
      setSidebarOpen(true);
    }
    setActiveTutorialSteps(steps);
    window.setTimeout(() => {
      document.querySelector(steps[0]?.selector ?? '#tour-cams')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShowTutorial(true);
    }, 180);
  }, []);

  // Once monitoring is live or a camera is connected, stop every idle hint animation app-wide.
  useEffect(() => { setHintsSuppressed(running || ipCam.connected); return () => setHintsSuppressed(false); }, [running, ipCam.connected]);

  // Audio in/out always goes through the CCTV, never the laptop mic:
  //  - listening: Whisper transcripts of the camera's RTSP audio (only while the
  //    CCTV speaker/microphone toggle is ON)
  //  - talking:   push-to-talk from the laptop mic out of the camera speaker
  const cctvServer = serverUrlFor(loadServerHost());
  // INPUT pipeline (microphone / Whisper wake words) is independent from the
  // OUTPUT pipeline (speaker playback). Muting the speaker never stops listening.
  // Listening starts as soon as the camera is connected — it does not wait for
  // the monitoring switch, and muting the speaker never stops it.
  const cctvListenEnabled = ipCam.connected;
  // Camera Management registers camera 1 as `slot-1` (its MediaMTX path is
  // `cam1`, but API routes use the camera ID, not the path).
  const cctvCameraId = 'slot-1';
  const cctvSpeech = useCctvSpeech(cctvServer, cctvCameraId, cctvListenEnabled);
  const cctvTalk = useCctvTalk(cctvServer, cctvCameraId);
  const listenTranscript = ipCam.connected ? cctvSpeech.transcript : transcript;
  const listenInterim = ipCam.connected ? '' : interimTranscript;
  const listening = ipCam.connected ? cctvSpeech.listening : speechListening;
  const cctvAudioMessage = ipCam.connected ? cctvSpeech.diagnostics.message : '';
  const cctvAudioTone = ipCam.connected ? cctvSpeech.diagnostics.tone : 'wait';
  const cctvAudioDiagnostic = ipCam.connected
    ? [
        cctvSpeech.diagnostics.threadRunning ? 'worker on' : 'worker off',
        cctvSpeech.diagnostics.audioConnected ? 'audio in' : 'no audio',
        cctvSpeech.diagnostics.audioSource ? `via ${cctvSpeech.diagnostics.audioSource}` : '',
        `${cctvSpeech.diagnostics.chunksReceived} chunks`,
        cctvSpeech.diagnostics.whisperState
          ?? (cctvSpeech.diagnostics.backendReachable ? '—' : 'offline'),
        cctvSpeech.diagnostics.lastTranscriptionAt
          ? new Date(cctvSpeech.diagnostics.lastTranscriptionAt).toLocaleTimeString()
          : '',
      ].filter(Boolean).join(' · ')
    : '';




  // Fire detection state
  const fireStateRef = useRef(createFireState());
  const [fireStatus, setFireStatus] = useState<{
    detected: boolean;
    fireDetected: boolean;
    smokeEmergency: boolean;
    confidence: number;
    smokeRatio: number;
    visibility: number;
    reason?: string;
    bbox?: [number, number, number, number];
    frameWidth?: number;
    frameHeight?: number;
    saliency?: SaliencyBreakdown;
  }>({
    detected: false,
    fireDetected: false,
    smokeEmergency: false,
    confidence: 0,
    smokeRatio: 0,
    visibility: 100,
  });

  // Facial distress (cam 2)
  const faceDistress = useFaceDistress(running);
  const yamnet = useYamnet(running);

  const alertCooldownRef = useRef<Record<string, number>>({});
  const snapshotCooldownRef = useRef(0);
  const [snapshots, setSnapshots] = useState<{ id: string; timestamp: Date; dataUrl: string; reason: string }[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<{ id: string; timestamp: Date; dataUrl: string; reason: string } | null>(null);
  /**
   * Central alert sink.
   *
   * `detail` carries the extra detection context (confidence, trigger, model
   * values) that is rendered inside the notification email. High and critical
   * alerts are emailed through the backend Brevo function, which applies the
   * household's own severity threshold and recipient list on top of the local
   * cooldown/dedup in `sendAlertEmail`.
   */
  const addAlert = useCallback((
    message: string,
    severity: Alert['severity'],
    cameraId: number,
    snapshotId?: string,
    detail?: {
      alertType?: string;
      confidence?: number;
      saliencyScore?: number;
      trigger?: string;
      cameraLabel?: string;
      details?: Record<string, string | number | boolean | null | undefined>;
    },
  ) => {
    const key = `${message}-${cameraId}`;
    const now = Date.now();
    const cooldown = severity === 'critical' ? 3000 : LOW_VALUE_ALERTS.test(message) ? 20000 : 6000;
    if (alertCooldownRef.current[key] && now - alertCooldownRef.current[key] < cooldown) return;
    alertCooldownRef.current[key] = now;

    const alertId = `${now}-${Math.random().toString(36).slice(2, 6)}`;
    setAlerts(prev => [{
      id: alertId,
      timestamp: new Date(),
      message,
      severity,
      cameraId,
      snapshotId,
    }, ...prev].slice(0, 200));
    // Talking accessibility: read important events out loud for blind users.
    if (severity === 'critical' || severity === 'high') announce(`Alert. ${message}`, true);
    else announce(message);

    if ((severity === 'critical' || severity === 'high') && householdId) {
      void sendAlertEmail({
        householdId,
        alertId,
        alertType: detail?.alertType ?? message.split(':')[0].slice(0, 80),
        message,
        severity,
        cameraLabel: detail?.cameraLabel ?? `CAM ${cameraId || 1}`,
        occurredAt: new Date(now).toISOString(),
        confidence: detail?.confidence,
        saliencyScore: detail?.saliencyScore,
        trigger: detail?.trigger,
        details: detail?.details,
      });
    }
  }, [householdId]);

  /** Alerts raised by the independent CAM 2..4 pipelines. */
  const handleSlotEvent = useCallback((evt: Omit<DetectionEvent, 'id'>) => {
    const severity: Alert['severity'] =
      evt.type === 'fire' || evt.type === 'smoke' ? 'critical'
      : evt.type === 'face-distress' || evt.type === 'audio-distress' ? 'high'
      : evt.type === 'saliency' ? 'high'
      : 'medium';
    if (severity === 'medium' && evt.type !== 'human') return; // keep the log readable
    const camIndex = Number(evt.cameraId.replace('slot-', '')) || 1;
    addAlert(`${evt.cameraName}: ${evt.label}`, severity, camIndex, undefined, {
      alertType: evt.type,
      confidence: evt.confidence,
      cameraLabel: `${evt.cameraName} (CAM ${camIndex})`,
      trigger: `${evt.type} detected by the independent pipeline of ${evt.cameraName}`,
      details: { Location: evt.location || undefined, Detection: evt.label },
    });
  }, [addAlert]);

  const handleSlotMetrics = useCallback((cameraIndex: number, runtime: CameraRuntime) => {
    setSlotMetrics(previous => {
      const current = previous[cameraIndex];
      if (current?.attentionScore === runtime.attentionScore && current.saliencyScore === runtime.saliencyScore) return previous;
      return {
        ...previous,
        [cameraIndex]: {
          attentionScore: runtime.attentionScore,
          saliencyScore: runtime.saliencyScore,
        },
      };
    });
  }, []);

  const displayedAttentionScore = selectedCam === 1
    ? attentionScore
    : slotMetrics[selectedCam]?.attentionScore ?? 0;
  const displayedSaliencyScore = selectedCam === 1
    ? globalSaliencyScore
    : slotMetrics[selectedCam]?.saliencyScore ?? 0;


  const lastMatchedPhraseRef = useRef<string>('');
  const lastMatchedTimeRef = useRef<number>(0);
  const [wakeWordDiagnostic, setWakeWordDiagnostic] = useState('Waiting for CCTV transcript');

  // Low-latency wake word detection — checks both transcript and interim
  useEffect(() => {
    if (!running) return;
    const combinedText = `${listenTranscript} ${listenInterim}`.trim();
    if (!combinedText) {
      setWakeWordDiagnostic('Waiting for CCTV transcript');
      return;
    }
    
    // Household wake words first, then the built-in Tagalog + English safety
    // and awareness library. Only words in one of those two lists are treated
    // as recognised speech — everything else stays plain transcription.
    const household = checkForWakeWord(combinedText);
    const safety = matchWakeWord(combinedText);
    const match = household.matched
      ? household
      : safety.matched
        ? {
            matched: true,
            phrase: safety.phrase,
            isEmergency: safety.severity === 'critical',
            actionType: 'email' as const,
            wakeWordId: '',
          }
        : household;

    setWakeWordDiagnostic(
      match.matched
        ? `Matched: ${match.phrase}${safety.matched && !household.matched ? ` (${safety.category}, ${safety.lang === 'tl' ? 'Tagalog' : 'English'})` : ''}`
        : 'Transcript received — no safety phrase matched',
    );
    console.info('[Wake word check]', { source: ipCam.connected ? 'CCTV' : 'browser fallback', matched: match.matched, phrase: match.phrase });
    const now = Date.now();
    if (match.matched && (match.phrase !== lastMatchedPhraseRef.current || now - lastMatchedTimeRef.current > 5000)) {
      lastMatchedPhraseRef.current = match.phrase;
      lastMatchedTimeRef.current = now;
        addAlert(`Wake word: "${match.phrase}"`, match.isEmergency ? 'critical' : 'high', 0);
      logAlert('wake_word', `Wake word detected: "${match.phrase}"`);
      logNotification(match.wakeWordId, match.phrase, match.actionType, match.isEmergency);
      if (match.isEmergency) {
        setShowEmergency(true);
        logAlert('emergency_trigger', `Emergency phrase triggered: "${match.phrase}"`);
      }
    }
  }, [listenTranscript, listenInterim, running, checkForWakeWord, addAlert, logAlert, logNotification, ipCam.connected]);

  const handleStart = useCallback(async () => {
    const detected = await enumerateDevices();
    // Require a connected camera (webcam OR IP/CCTV) before enabling any
    // detection pipeline. Simulation mode bypasses the requirement.
    let hasCamera = simulationMode || ipCam.connected;
    if (!simulationMode) {
      try {
        const started = await startCameras(quality);
        if (started.some(c => c.active)) hasCamera = true;
      } catch (err) {
        console.warn('[handleStart] Cameras failed to start:', err);
      }
    }
    if (!hasCamera) {
      const msg = (!detected || detected.length === 0) && !ipCam.connected
        ? 'No camera detected. Connect a webcam or CCTV/IP camera.'
        : 'No camera connected. Open Connect to choose a camera.';
      setCameraStatusMsg(msg);
      addAlert(msg, 'medium', 1);
      return;
    }
    loadModel(); // Start loading COCO-SSD model
    // Wake words come from the CCTV's own audio when a camera stream is live;
    // the laptop microphone is only a fallback when no CCTV is connected.
    if (speechSupported && !ipCam.connected) startSpeech();
    await startAudio().catch((err) => {
      console.warn('[handleStart] Audio failed to start:', err);
    });
    setCameraStatusMsg('');
    perfMonitor.reset();
    setRunning(true);
  }, [simulationMode, quality, startCameras, startAudio, enumerateDevices, loadModel, speechSupported, startSpeech, ipCam.connected, addAlert]);

  const handleStop = useCallback(() => {
    setRunning(false);
    stopCameras();
    stopAudio();
    stopSpeech();
    clearSpeech();
    // Stopping monitoring also drops the CCTV/IP stream so nothing keeps
    // running in the background after the operator presses Stop.
    if (ipCam.connected) {
      ipCam.disconnect();
      attachStream(ipTargetSlot, null);
    }
    // Stop means stop: every connected camera (CAM 1–4) is disconnected on the
    // local service too, so no stream or audio worker keeps running.
    const server = serverUrlFor(loadServerHost());
    void (async () => {
      for (const slot of camSlots) {
        if (!slot.connected && !slot.streamUrl) continue;
        try { await stopCamera(server, `slot-${slot.index}`); } catch { /* service offline */ }
        updateCamSlot(slot.index, { connected: false, streamUrl: '' });
      }
      try { await stopAllCameras(server); } catch { /* service offline */ }
    })();
    setAttentionScore(0);
    setGlobalSaliencyScore(0);
    perfMonitor.reset();
  }, [stopCameras, stopAudio, stopSpeech, clearSpeech, ipCam, attachStream, ipTargetSlot, camSlots, updateCamSlot]);

  // Watch for camera disconnect mid-run: if no active webcam and no IP cam,
  // stop detection and surface a reconnect message in the existing feed area.
  useEffect(() => {
    if (!running) return;
    if (simulationMode) return;
    const anyActive = cameras.some(c => c.active) || ipCam.connected;
    if (!anyActive) {
      const more = devices.length > 0;
      const msg = more
        ? 'Camera disconnected. Open Connect to switch to another available camera.'
        : 'Camera disconnected. No other cameras detected — reconnect to continue.';
      setCameraStatusMsg(msg);
      addAlert(msg, 'high', 1);
      handleStop();
    }
  }, [running, simulationMode, cameras, ipCam.connected, handleStop, addAlert, devices.length]);

  // Listen for underlying MediaStreamTrack ended events (USB unplug, IP cam drop)
  useEffect(() => {
    const tracks: MediaStreamTrack[] = [];
    cameras.forEach(c => {
      if (c.stream) c.stream.getTracks().forEach(t => tracks.push(t));
    });
    if (ipCam.stream) ipCam.stream.getTracks().forEach(t => tracks.push(t));
    if (tracks.length === 0) return;
    const onEnded = () => {
      // Force a re-evaluation: mark camera inactive if its track ended.
      cameras.forEach(c => {
        if (c.stream && c.stream.getTracks().every(t => t.readyState === 'ended')) {
          updateCamera(c.id, { active: false, stream: null, fps: 0 });
        }
      });
    };
    tracks.forEach(t => t.addEventListener('ended', onEnded));
    return () => tracks.forEach(t => t.removeEventListener('ended', onEnded));
  }, [cameras, ipCam.stream, updateCamera]);

  // Speech recognition is always on when running — no toggle needed
  // It auto-starts in handleStart and auto-stops in handleStop

  const handleFpsUpdate = useCallback((cameraId: number, fps: number) => {
    updateCamera(cameraId, { fps });
  }, [updateCamera]);

  const handleObjectsUpdate = useCallback((cameraId: number, objects: DetectedObject[]) => {
    updateCamera(cameraId, { objects });
    objects.forEach(obj => {
      if (obj.label === 'person' && obj.confidence > 0.7) {
        addAlert('Person detected', 'medium', cameraId);
      }
      // Everyday objects (chair, books, plants…) are information only —
      // they are logged quietly and never raise a red alert.
      if (priorityObjects.includes(obj.label) && obj.label !== 'person') {
        addAlert(`Seen: ${obj.label}`, 'low', cameraId);
      }
    });
  }, [updateCamera, addAlert, priorityObjects]);

  const handleCameraSaliencyScore = useCallback((cameraId: number, score: number) => {
    updateCamera(cameraId, { saliencyScore: score });

    // The FUSED pipeline runs on CAM 2's frame if CAM 2 has its own source,
    // otherwise it falls back to CAM 1 (raw feed).
    const fusedCamId = cameras[1].active ? 2 : 1;

    // Update global saliency from the fused source only.
    if (cameraId === fusedCamId) {
      setGlobalSaliencyScore(score);
    }

    // Compute fused attention: α = 0.4×S + 0.3×A + 0.3×O — from fused source.
    if (cameraId === fusedCamId) {
      const saliencyComponent = score;
      const audioComponent = audioFeatures.speechDetected
        ? Math.min(100, Math.abs(audioFeatures.decibel) + 20)
        : Math.min(100, Math.max(0, (audioFeatures.decibel + 50) * 1.5));
      const fusedObjs = cameras[fusedCamId - 1].objects;
      const objectComponent = fusedObjs.length > 0
        ? Math.min(100, fusedObjs.reduce((sum, o) => sum + o.confidence * 100, 0) / fusedObjs.length)
        : 0;
      
      const fused = Math.min(100, Math.round(
        0.4 * saliencyComponent + 0.3 * audioComponent + 0.3 * objectComponent
      ));
      setAttentionScore(fused);
    }

    // Audio event classification alerts (only from the fused cam to avoid duplicates)
    if (cameraId === fusedCamId) {
      if (audioFeatures.audioEvent === 'clap') {
        addAlert('Clap detected', 'medium', 0);
      }
      if (audioFeatures.audioEvent === 'scream') {
        addAlert('Scream detected!', 'high', 0);
        logAlert('scream', 'Scream detected by audio analysis');
      }
      if (audioFeatures.audioEvent === 'bang') {
        addAlert('Bang/impact detected!', 'critical', 0);
        logAlert('bang', 'Bang/impact detected by audio analysis');
      }
      if (audioFeatures.speechDetected) {
        addAlert('Speech detected', 'low', 0);
      }
      if (audioFeatures.decibel > -10) {
        addAlert('High noise level', 'medium', 0);
      }
      if (audioFeatures.speechDetected && score > 50) {
        const now = Date.now();
        let snapId: string | undefined;
        if (now - snapshotCooldownRef.current > 5000 && sourceCanvas) {
          snapshotCooldownRef.current = now;
          try {
            const dataUrl = sourceCanvas.toDataURL('image/png');
            snapId = `snap-${now}`;
            const snap = {
              id: snapId,
              timestamp: new Date(),
              dataUrl,
              reason: 'Person + loud speech (HIGH ATTENTION)',
            };
            setSnapshots(prev => [snap, ...prev].slice(0, 50));
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            a.click();
            logAlert('high_attention', 'Person + loud speech = HIGH ATTENTION');
          } catch (err) {
            console.error('[AutoSnapshot] Failed:', err);
          }
        }
        addAlert('Person + loud speech = HIGH ATTENTION', 'critical', 1, snapId);
      }
    }
  }, [audioFeatures, addAlert, updateCamera, sourceCanvas, logAlert, wakeWords, cameras]);

  const handleSaliencyViewScore = useCallback((score: number) => {
    setGlobalSaliencyScore(score);
  }, []);

  const handleDetectFrame = useCallback(async (video: HTMLVideoElement): Promise<DetectedObject[]> => {
    // Always include screens so fire-inside-TV/phone can be flagged as false alarm
    const forced = ['tv', 'cell phone', 'laptop'];
    const merged = Array.from(new Set([...priorityObjects, ...forced]));
    return detect(video, merged, minConfidence / 100);
  }, [detect, priorityObjects, minConfidence]);

  const handleFrameCapture = useCallback((canvas: HTMLCanvasElement) => {
    setSourceCanvas(prev => prev === canvas ? prev : canvas);
  }, []);

  const handleCam2FrameCapture = useCallback((canvas: HTMLCanvasElement) => {
    setCam2SourceCanvas(prev => prev === canvas ? prev : canvas);
  }, []);

  // Attach IP camera stream into the chosen camera slot
  useEffect(() => {
    if (ipCam.stream && ipCam.connected) {
      attachStream(ipTargetSlot, ipCam.stream, `IP Cam (${ipKind.toUpperCase()})`);
    }
  }, [ipCam.stream, ipCam.connected, ipTargetSlot, ipKind, attachStream]);

  // Fire detection — throttled to AI_RATES.fire on the shared source canvas.
  // The effect deliberately does not depend on `cameras`, otherwise every
  // object update would tear down and rebuild the timer.
  useEffect(() => {
    const target = cam2SourceCanvas || sourceCanvas;
    if (!running || !target) return;
    const fireCooldown = { current: 0 };
    let busy = false;
    const tick = () => {
      if (busy) { perfMonitor.markDropped(); return; }
      busy = true;
      const started = perfNow();
      try {
        const cams = camerasRef.current;
        const fusedObjs = cams[1].active ? cams[1].objects : cams[0].objects;
        const ctx = target.getContext('2d');
        if (!ctx || target.width === 0 || target.height === 0) return;
        const frame = ctx.getImageData(0, 0, target.width, target.height);
        const result = detectFire(frame, fireStateRef.current, fusedObjs);
        setFireStatus({
          detected: result.detected,
          fireDetected: result.fireDetected,
          smokeEmergency: result.smokeEmergency,
          confidence: result.confidence,
          smokeRatio: result.smokeRatio,
          visibility: result.visibility,
          reason: result.rejectedReason,
          bbox: result.smoothedBbox ?? result.bbox,
          frameWidth: target.width,
          frameHeight: target.height,
          saliency: result.saliency,
        });
        if (result.detected && Date.now() - fireCooldown.current > 3000) {
          fireCooldown.current = Date.now();
          if (result.fireDetected) {
            addAlert(`Fire detected (${Math.round(result.confidence * 100)}% conf)`, 'critical', 1);
            logAlert('fire', `Fire signature confirmed (ratio ${result.firePixelRatio.toFixed(3)}, flicker ${result.flickerScore.toExponential(2)}, smoke ${(result.smokeRatio * 100).toFixed(1)}%, visibility ${result.visibility}/100)`);
            setShowEmergency(true);
          } else if (result.smokeEmergency) {
            addAlert(`Heavy smoke - visibility ${result.visibility}/100`, 'high', 1);
            logAlert('smoke', `Smoke emergency: coverage ${(result.smokeRatio * 100).toFixed(1)}%, visibility ${result.visibility}/100`);
          }
        }
        perfMonitor.markAiFrame(perfNow() - started);
      } catch (err) {
        // Canvas may be tainted by cross-origin IP cam — skip silently
      } finally {
        busy = false;
      }
    };
    const interval = window.setInterval(tick, 1000 / AI_RATES.fire);
    return () => window.clearInterval(interval);
  }, [running, sourceCanvas, cam2SourceCanvas, addAlert, logAlert]);

  // Facial distress — throttled to AI_RATES.face; the hook already guards
  // against overlapping inference so stale frames are simply skipped.
  useEffect(() => {
    if (!running || !faceDistress.ready) return;
    const target = cam2SourceCanvas || sourceCanvas;
    if (!target) return;
    const analyze = faceDistress.analyze;
    const interval = window.setInterval(() => {
      const started = perfNow();
      void Promise.resolve(analyze(target)).then(() => {
        perfMonitor.markAiFrame(perfNow() - started);
      });
    }, 1000 / AI_RATES.face);
    return () => window.clearInterval(interval);
  }, [running, faceDistress.ready, faceDistress.analyze, cam2SourceCanvas, sourceCanvas]);


  // Alert on facial distress (mild + severe)
  useEffect(() => {
    if (!running) return;
    const lvl = faceDistress.distress.distressLevel;
    if (lvl === 'severe') {
      addAlert(`Facial distress: ${faceDistress.distress.expression} (${faceDistress.distress.distressScore}%)`, 'critical', 2);
      logAlert('facial_distress', `Severe facial distress: ${faceDistress.distress.expression}`);
      setShowEmergency(true);
    } else if (lvl === 'mild') {
      addAlert(`Possible distress: ${faceDistress.distress.expression} (${faceDistress.distress.distressScore}%)`, 'high', 2);
    }
  }, [faceDistress.distress.distressLevel, faceDistress.distress.expression, faceDistress.distress.distressScore, running, addAlert, logAlert]);

  // Alert on YAMNet audio distress (screams, crying, wails)
  useEffect(() => {
    if (!running) return;
    if (yamnet.distressScore >= 60) {
      addAlert(`Audio distress: ${yamnet.topLabel} (${yamnet.distressScore}%)`, 'critical', 0);
      logAlert('audio_distress', `YAMNet distress: ${yamnet.topLabel} (${yamnet.distressScore}%)`);
      setShowEmergency(true);
    } else if (yamnet.distressScore >= 35) {
      addAlert(`Elevated audio: ${yamnet.topLabel} (${yamnet.distressScore}%)`, 'high', 0);
    }
  }, [yamnet.distressScore, yamnet.topLabel, running, addAlert, logAlert]);

  const exportCSV = useCallback(() => {
    const rows = [
      ['Timestamp', 'Message', 'Severity', 'Camera'],
      ...alerts.map(a => [a.timestamp.toISOString(), a.message, a.severity, `CAM ${a.cameraId}`]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saliency-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [alerts]);

  // Active camera count for layout
  const activeCameras = cameras.filter(c => c.active || (simulationMode && running));
  const maxSaliencyCamera = cameras.reduce((max, c) => c.saliencyScore > max.saliencyScore ? c : max, cameras[0]);

  // Emergency is now a floating overlay, not a full-screen takeover

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* IP Camera connect dialog */}
      {showIpDialog && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowIpDialog(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl p-6 md:p-8 space-y-5 max-h-[92vh] overflow-y-auto overscroll-contain"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Wifi className="w-5 h-5 text-primary" /> Connect CCTV / IP Camera
              </h3>
              <button onClick={() => setShowIpDialog(false)} className="p-2 rounded hover:bg-muted" aria-label="Close camera connection panel">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>


            <MultiCameraConnect
              onStream={async (url) => {
                setIpUrl(url);
                setIpKind('hls');
                const ok = await ipCam.connect({ url, kind: 'hls' });
                if (ok) {
                  if (!running) setTimeout(() => { void handleStart(); }, 300);
                }
              }}
              playbackError={ipCam.error}
              playing={ipCam.connected}
            />

            <p className="text-[14px] text-muted-foreground">
              The camera server publishes the stream through MediaMTX — the dashboard picks up the
              HLS link automatically. This feed streams into CAM 2 and drives all detection.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowIpDialog(false)}
                className="flex-1 text-[15px] font-semibold py-2.5 rounded-lg border border-border hover:bg-muted transition-all"
              >
                Close
              </button>
            </div>


          </div>
        </div>
      )}

      {/* Floating Emergency Popup */}
      {showEmergency && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-destructive/95 backdrop-blur-md text-destructive-foreground rounded-xl shadow-2xl border-2 border-destructive p-4 space-y-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-mono font-bold">EMERGENCY DETECTED</h3>
            <button
              onClick={() => setShowEmergency(false)}
              aria-label="Close emergency alert"
              title="Close"
              className="shrink-0 rounded-full p-1 hover:bg-destructive-foreground/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs font-mono opacity-90">
            An emergency wake word was triggered. Household members notified.
          </p>
          <a
            href="tel:911"
            className="block w-full py-2.5 px-4 bg-background text-destructive font-mono font-bold text-sm rounded-lg text-center hover:bg-background/90 transition-all"
          >
            CALL 911
          </a>
          <button
            onClick={() => setShowEmergency(false)}
            className="w-full text-[10px] font-mono opacity-70 hover:opacity-100 transition-opacity"
          >
            Dismiss (false alarm)
          </button>
        </div>
      )}
      {/* Header */}
      <header id="tour-header" className="border-b border-border bg-card/60 backdrop-blur-sm px-2 sm:px-4 py-2 sm:py-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        {/* Left: Brand — clickable, goes to landing */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 group"
          title="Back to home"
        >
          <Shield className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          <h1 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            MSDSystem
          </h1>
        </button>

        {/* Center: Status + Home */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
            running
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          }`}>
            <div className={`w-2 h-2 rounded-full ${running ? 'bg-success animate-pulse' : 'bg-muted-foreground/50'}`} />
            {running ? 'Live' : 'Standby'}
          </div>
          {user && (
            <button
              onClick={() => navigate('/household')}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
              title="Go to Household"
            >
              <Home className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
            </button>
          )}
          <button
            onClick={() => navigate('/monitoring')}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
            title="Multi-camera monitoring"
          >
            <Wifi className="w-4 h-4" /> <span className="hidden sm:inline">Cameras</span>
          </button>

        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mr-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{new Date().toLocaleTimeString()}</span>
          </div>

          <button
            onClick={() => setShowExpert(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-accent bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-full transition-colors"
            title="Expert Mode — how algorithms work"
          >
            <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Expert</span>
          </button>

          <button
            onClick={() => {
              document.documentElement.classList.toggle('dark');
              setDarkMode(prev => !prev);
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
          </button>

          <AccessibilityPanel />

          <button

            onClick={() => setShowTutorial(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Replay tutorial"
          >
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
          </button>

          {user && (
            <>
              <div className="hidden sm:block h-5 w-px bg-border" />
              <span className="hidden sm:inline text-sm text-muted-foreground max-w-[160px] truncate">{user.email}</span>
              <button
                onClick={signOut}
                className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5 text-muted-foreground hover:text-destructive" />
              </button>
            </>
          )}
          {!user && !authLoading && (
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            title="Open controls"
            aria-label="Open controls"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
        </div>
      </header>


      {/* Main content */}
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-57px)] min-h-[calc(100vh-57px)]">
        {/* Left: Specialized camera grid + fusion */}
         <div className="flex-1 min-w-0 p-2 flex flex-col gap-2 lg:overflow-y-auto">
          {/* Live camera view */}
          <div id="tour-cams">
            {/* CAM 1 kept hidden as the detection source pipeline */}
            <div className="hidden">
              <CameraFeed
                camera={cameras[0]}
                mirror={mirror}
                showBoundingBoxes={false}
                showHeatmap={false}
                heatmapOpacity={0}
                saliencyMode={saliencyMode}
                threshold={threshold}
                simulationMode={simulationMode && running}
                priorityObjects={priorityObjects}
                detectionStats={detectionStats}
                onFpsUpdate={handleFpsUpdate}
                onObjectsUpdate={handleObjectsUpdate}
                onSaliencyScoreUpdate={handleCameraSaliencyScore}
                onFrameCapture={handleFrameCapture}
                onDetectFrame={handleDetectFrame}
              />
            </div>

            {/* CAM 1..4 selector + main frame. Switching only changes what is
                shown — CAM 2..4 keep streaming and keep running their own
                independent saliency + CCTV audio pipelines in the background. */}
            <div className="flex flex-col lg:flex-row gap-2">
              <CameraSlotSelector
                slots={camSlots}
                selected={selectedCam}
                onSelect={setSelectedCam}
                primaryLive={ipCam.connected || cameras.some(c => c.active)}
                open={camListOpen}
                onToggleOpen={setCamListOpen}
              />
              <div className="flex-1 min-w-0 relative">
                {selectedCam === 1 && (
                  <FusedDetectionView
                    sourceCanvas={cam2SourceCanvas || sourceCanvas}
                    objects={cameras[1].active ? cameras[1].objects : cameras[0].objects}
                    audioFeatures={audioFeatures}
                    attentionScore={attentionScore}
                    saliencyScore={globalSaliencyScore}
                    active={running}
                    transcript={listenTranscript}
                    interimTranscript={listenInterim}
                    speechListening={listening}
                    audioMessage={cctvAudioMessage}
                    audioTone={cctvAudioTone}
                    audioDiagnostic={cctvAudioDiagnostic}

                    onToggleSpeech={() => {}}
                    talking={cctvTalk.talking}
                    talkError={cctvTalk.error}
                    onTalkStart={cctvTalk.startTalk}
                    onTalkStop={cctvTalk.stopTalk}
                    fireBbox={fireStatus.fireDetected ? fireStatus.bbox : undefined}
                    fireFrameWidth={fireStatus.frameWidth}
                    fireFrameHeight={fireStatus.frameHeight}
                    cctvAudioEnabled={ipCam.audioEnabled}
                    cctvAudioAvailable={ipCam.connected}
                    onToggleCctvAudio={() => ipCam.setAudioEnabled(!ipCam.audioEnabled)}
                  />
                )}
                {camSlots.filter(s => s.index > 1).map(slot => (
                  <SlotPipelineView
                    key={slot.index}
                    slot={slot}
                    monitoring={running}
                    visible={selectedCam === slot.index}
                    onEvent={handleSlotEvent}
                    onMetrics={handleSlotMetrics}
                  />
                ))}
              </div>
            </div>

          </div>


          {/* Hidden CAM 2 raw capture — only when cam 2 has its own stream */}
          {cameras[1].active && (
            <div className="hidden">
              <CameraFeed
                camera={cameras[1]}
                mirror={false}
                showBoundingBoxes={false}
                showHeatmap={false}
                heatmapOpacity={0}
                saliencyMode={saliencyMode}
                threshold={threshold}
                simulationMode={false}
                priorityObjects={priorityObjects}
                detectionStats={detectionStats}
                onFpsUpdate={handleFpsUpdate}
                onObjectsUpdate={handleObjectsUpdate}
                onSaliencyScoreUpdate={handleCameraSaliencyScore}
                onFrameCapture={handleCam2FrameCapture}
                onDetectFrame={handleDetectFrame}
              />
            </div>
          )}

          {/* IP / CCTV camera connect */}
          <div className="bg-card rounded-md border border-border panel-glow p-3 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono text-foreground flex-1">
              {ipCam.connected
                ? `IP Cam connected -> CAM ${ipTargetSlot}`
                : cameras.some(c => c.active)
                  ? `Webcam active -> ${cameras.find(c => c.active)?.label || 'CAM 1'}`
                  : devices.length > 0
                    ? `${devices.length} local camera(s) detected — click Connect to choose, or use a CCTV/IP URL`
                    : 'No camera detected — connect a CCTV / IP camera (HLS .m3u8 or MJPEG/snapshot URL)'}
            </span>
            {ipCam.connected ? (
              <button
                onClick={() => { ipCam.disconnect(); attachStream(ipTargetSlot, null); }}
                className="text-[10px] font-mono px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30"
              >
                Disconnect
              </button>
            ) : (
              <div className="relative">
                <IdleHint message="Click + Connect to add your CCTV camera" disabled={ipCam.connected} />
                <button
                  onClick={async () => {
                    setShowIpDialog(true);
                    // Prime camera permission so built-in / USB device labels
                    // become visible in the picker (browsers hide labels until
                    // permission is granted at least once).
                    try {
                      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                      s.getTracks().forEach(t => t.stop());
                    } catch { /* user denied — enumeration still returns deviceIds */ }
                    enumerateDevices();
                  }}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
                >
                  + Connect
                </button>
              </div>
            )}
          </div>

          {/* Saliency score — result only, no per-component breakdown */}
          <div id="tour-saliency-score" className="bg-card rounded-md border border-primary/30 panel-glow p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-primary uppercase tracking-wider">
                Saliency Score
              </span>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold tabular-nums ${displayedSaliencyScore > 70 ? 'text-destructive' : displayedSaliencyScore > 40 ? 'text-warning' : 'text-success'}`}>
                  {displayedSaliencyScore}%
                </span>
                <span className={`text-[12px] font-semibold px-2 py-0.5 rounded ${displayedSaliencyScore > 70 ? 'bg-destructive/20 text-destructive' : displayedSaliencyScore > 40 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                  {displayedSaliencyScore > 70 ? 'ALERT' : displayedSaliencyScore > 40 ? 'ELEVATED' : 'NORMAL'}
                </span>
              </div>
            </div>
            <div className="mt-2 h-2 bg-secondary/50 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all ${displayedSaliencyScore > 70 ? 'bg-destructive' : displayedSaliencyScore > 40 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${displayedSaliencyScore}%` }}
              />
            </div>

            {/* Fire, then Sound + Facial distress side by side */}
            <div className="mt-3 space-y-2">
              <div id="tour-fire-analysis" className={`rounded p-2.5 border ${fireStatus.detected ? 'border-destructive/60 bg-destructive/10' : 'border-border bg-secondary/20'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <Flame className={`w-4 h-4 ${fireStatus.detected ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                    <span className="text-[13px] font-semibold text-foreground">Fire &amp; Smoke</span>
                  </span>
                  <span className={`text-[14px] font-bold tabular-nums ${fireStatus.saliency && fireStatus.saliency.total > 50 ? 'text-destructive' : fireStatus.saliency && fireStatus.saliency.total > 20 ? 'text-warning' : 'text-muted-foreground'}`}>
                    {fireStatus.saliency ? `${fireStatus.saliency.total}/100` : `${Math.round(fireStatus.confidence * 100)}%`}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {fireStatus.fireDetected
                    ? 'Real fire signature detected'
                    : fireStatus.smokeEmergency
                      ? `Smoke emergency — visibility ${fireStatus.visibility}/100`
                      : fireStatus.reason || 'No fire signature'}
                </p>
                {fireStatus.detected && (
                  <DetectionFeedback
                    householdId={householdId}
                    eventType="fire"
                    confidence={fireStatus.confidence}
                    visualContext={{ reason: fireStatus.reason }}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                <div id="tour-audio-distress" className={`rounded p-2.5 border ${yamnet.distressScore >= 60 ? 'border-destructive/60 bg-destructive/10' : yamnet.distressScore >= 30 ? 'border-warning/60 bg-warning/10' : 'border-border bg-secondary/20'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground">Sound Distress</span>
                    <span className="text-[14px] font-bold tabular-nums text-foreground">{yamnet.distressScore}%</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {yamnet.error ? yamnet.error :
                     !yamnet.ready ? 'Loading sound model…' :
                     `${yamnet.topLabel} (${Math.round(yamnet.topScore * 100)}%)`}
                  </p>
                  {yamnet.distressScore >= 30 && (
                    <DetectionFeedback
                      householdId={householdId}
                      eventType="audio_scream"
                      confidence={yamnet.topScore}
                      audioEvent={yamnet.topLabel}
                    />
                  )}
                </div>

                <div id="tour-face-distress" className={`rounded p-2.5 border ${faceDistress.distress.distressLevel === 'severe' ? 'border-destructive/60 bg-destructive/10' : faceDistress.distress.distressLevel === 'mild' ? 'border-warning/60 bg-warning/10' : 'border-border bg-secondary/20'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground">Facial Distress</span>
                    <span className="text-[14px] font-bold tabular-nums text-foreground">{faceDistress.distress.distressScore}%</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {!faceDistress.ready ? 'Loading model…' :
                     faceDistress.error ? faceDistress.error :
                     !faceDistress.distress.hasFace ? 'No face detected' :
                     `${faceDistress.distress.expression} (${Math.round(faceDistress.distress.probability * 100)}%)`}
                  </p>
                  {faceDistress.distress.distressLevel !== 'none' && (
                    <DetectionFeedback
                      householdId={householdId}
                      eventType="facial_distress"
                      confidence={faceDistress.distress.probability}
                      audioEvent={audioFeatures.audioEvent}
                      visualContext={{
                        expression: faceDistress.distress.expression,
                        score: faceDistress.distress.distressScore,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* Bottom: Timeline */}
          <div className="bg-card rounded-md border border-border panel-glow p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Timeline</span>
              <span className="text-[9px] font-mono text-muted-foreground">{alerts.length} events</span>
            </div>
            <div className="flex gap-0.5 overflow-x-auto pb-1 items-end h-8">
              {alerts.slice(0, 80).map(alert => {
                const hasSnap = alert.snapshotId || snapshots.some(s => Math.abs(s.timestamp.getTime() - alert.timestamp.getTime()) < 5000);
                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      const snap = alert.snapshotId
                        ? snapshots.find(s => s.id === alert.snapshotId)
                        : snapshots.find(s => Math.abs(s.timestamp.getTime() - alert.timestamp.getTime()) < 5000);
                      if (snap) setSelectedSnapshot(snap);
                    }}
                    className={`flex-shrink-0 w-1 rounded-t-full transition-all ${
                      hasSnap ? 'cursor-pointer hover:opacity-70 ring-1 ring-primary/50' : ''
                    } ${
                      alert.severity === 'critical' ? 'bg-destructive h-8' :
                      alert.severity === 'high' ? 'bg-destructive/60 h-6' :
                      alert.severity === 'medium' ? 'bg-warning h-4' :
                      'bg-primary/40 h-2'
                    }`}
                    title={`${alert.message} - ${alert.timestamp.toLocaleTimeString()}${hasSnap ? ' - Click to view' : ''}`}
                  />
                );
              })}
              {alerts.length === 0 && (
                <span className="text-[9px] font-mono text-muted-foreground">No events recorded</span>
              )}
            </div>
            {/* Selected snapshot viewer */}
            {selectedSnapshot && (
              <div className="mt-2 p-2 bg-secondary/50 rounded border border-primary/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-primary">
                    Playback — {selectedSnapshot.timestamp.toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => setSelectedSnapshot(null)}
                    className="text-[9px] font-mono text-muted-foreground hover:text-destructive"
                  >
                    Close
                  </button>
                </div>
                <img
                  src={selectedSnapshot.dataUrl}
                  alt={selectedSnapshot.reason}
                  className="w-full max-h-48 object-contain rounded border border-border"
                />
                <span className="text-[8px] font-mono text-destructive">{selectedSnapshot.reason}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Right sidebar — drawer on mobile, fixed panel on lg+ */}
        <div
          id="tour-sidebar"
          className={`${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 fixed lg:static right-0 top-0 lg:top-auto z-50 lg:z-auto h-full lg:h-auto w-72 lg:w-72 xl:w-80 lg:shrink-0 max-w-[90vw] border-l border-border p-2 space-y-2 overflow-y-auto bg-card lg:bg-transparent transition-transform duration-200 ease-out`}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-full flex items-center justify-end p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close controls"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Start/Stop */}
          <div id="tour-start" className="bg-card rounded-md border border-border panel-glow p-3 relative">
            <IdleHint message="Press ▶ Start Monitoring to begin detection" disabled={running} />
            <button
              onClick={running ? handleStop : handleStart}
              className={`w-full text-xs font-mono py-2.5 px-3 rounded-md transition-all font-semibold ${
                running
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80'
                  : 'bg-primary text-primary-foreground hover:bg-primary/80'
              }`}
            >
              {running ? '■ Stop Monitoring' : '▶ Start Monitoring'}
            </button>
            <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
              {running ? 'Live analysis is running.' : 'Press to start watching, listening, and detecting.'}
            </p>
          </div>

          <AttentionGauge score={displayedAttentionScore} />

          <div id="tour-alert-log">
            <AlertLog alerts={alerts} visible={showAlerts} snapshots={snapshots} />
          </div>

          <ControlsPanel
            running={running}
            threshold={threshold}
            showBoundingBoxes={showBoundingBoxes}
            showHeatmap={showHeatmap}
            showAlerts={showAlerts}
            quality={quality}
            mirror={mirror}
            heatmapOpacity={heatmapOpacity}
            simulationMode={simulationMode}
            priorityObjects={priorityObjects}
            onStart={handleStart}
            onStop={handleStop}
            onThresholdChange={setThreshold}
            onToggleBoundingBoxes={() => setShowBoundingBoxes(p => !p)}
            onToggleHeatmap={() => setShowHeatmap(p => !p)}
            onToggleAlerts={() => setShowAlerts(p => !p)}
            onQualityChange={setQuality}
            onToggleMirror={() => setMirror(p => !p)}
            onHeatmapOpacityChange={setHeatmapOpacity}
            onToggleSimulation={() => setSimulationMode(p => !p)}
            onPriorityObjectsChange={setPriorityObjects}
            minConfidence={minConfidence}
            onMinConfidenceChange={setMinConfidence}
            onExportCSV={exportCSV}
          />

          <PerformanceMonitor />




          {/* Auto-Snapshots */}
          {snapshots.length > 0 && (
            <div className="bg-card rounded-md border border-border panel-glow p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider">
                  Auto-Snapshots ({snapshots.length})
                </span>
                <button
                  onClick={() => setSnapshots([])}
                  className="text-[9px] font-mono text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {snapshots.slice(0, 10).map(snap => (
                  <div key={snap.id} className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {snap.timestamp.toLocaleTimeString()}
                      </span>
                      <a
                        href={snap.dataUrl}
                        download={`snapshot-${snap.id}.png`}
                        className="text-[9px] font-mono text-primary hover:underline"
                      >
                        ↓ Save
                      </a>
                    </div>
                    <img
                      src={snap.dataUrl}
                      alt={snap.reason}
                      className="w-full rounded border border-border"
                    />
                    <span className="text-[8px] font-mono text-destructive">{snap.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <TutorialOverlay
        steps={activeTutorialSteps}
        open={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          setActiveTutorialSteps(tutorialSteps);
        }}
        onFinish={() => {
          const key = user ? `msds-tutorial-done-${user.id}` : 'msds-tutorial-done-guest';
          try { localStorage.setItem(key, '1'); } catch { /* noop */ }
        }}
      />

      <ExpertMode open={showExpert} onClose={() => setShowExpert(false)} onSelectAlgorithm={openAlgorithmTutorial} />
    </div>
  );
}
