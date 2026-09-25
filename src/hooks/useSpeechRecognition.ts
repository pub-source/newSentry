import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptTimerRef = useRef<number | null>(null);
  const interimTimerRef = useRef<number | null>(null);

  const scheduleTranscriptClear = () => {
    if (transcriptTimerRef.current) window.clearTimeout(transcriptTimerRef.current);
    transcriptTimerRef.current = window.setTimeout(() => {
      setTranscript('');
      transcriptTimerRef.current = null;
    }, 3000);
  };

  const scheduleInterimClear = () => {
    if (interimTimerRef.current) window.clearTimeout(interimTimerRef.current);
    interimTimerRef.current = window.setTimeout(() => {
      setInterimTranscript('');
      interimTimerRef.current = null;
    }, 1500);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setTranscript(prev => (prev + ' ' + final).trim().split(' ').slice(-30).join(' '));
        scheduleTranscriptClear();
      }
      setInterimTranscript(interim);
      if (interim) scheduleInterimClear();
    };

    recognition.onerror = (event: any) => {
      console.warn('[SpeechRecognition] Error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      try { ref.stop(); } catch {}
      setIsListening(false);
      setInterimTranscript('');
      if (transcriptTimerRef.current) { window.clearTimeout(transcriptTimerRef.current); transcriptTimerRef.current = null; }
      if (interimTimerRef.current) { window.clearTimeout(interimTimerRef.current); interimTimerRef.current = null; }
    }
  }, []);

  const clear = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return { transcript, interimTranscript, isListening, supported, start, stop, clear };
}
