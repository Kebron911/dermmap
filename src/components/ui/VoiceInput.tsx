import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, X } from 'lucide-react';
import clsx from 'clsx';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
  className?: string;
  /** If true shows only the mic button, no text area */
  buttonOnly?: boolean;
  value?: string;
}

// Augment the window type for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string; confidence: number } } };
  resultIndex: number;
}

export function VoiceInput({ onTranscript, placeholder, className, buttonOnly, value }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < Object.keys(event.results).length; i++) {
        const result = event.results[i];
        if (result[0]) {
          // Check if result is final — duck-type since isFinal may not be on the type
          const entry = event.results[i] as any;
          if (entry.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript.trim());
        setInterim('');
      } else {
        setInterim(interimTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInterim('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  if (!supported) {
    return null; // gracefully hide if browser doesn't support speech recognition
  }

  if (buttonOnly) {
    return (
      <button
        type="button"
        onClick={toggleListening}
        className={clsx(
          'p-2 rounded-lg transition-all',
          isListening
            ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-300'
            : 'bg-slate-100 text-slate-500 hover:bg-teal-50 hover:text-teal-600',
          className,
        )}
        title={isListening ? 'Stop dictating' : 'Start voice dictation'}
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      <div className="relative">
        <textarea
          value={value || ''}
          onChange={e => onTranscript(e.target.value)}
          placeholder={placeholder || 'Type or use voice input...'}
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
        />
        <button
          type="button"
          onClick={toggleListening}
          className={clsx(
            'absolute top-2 right-2 p-1.5 rounded-lg transition-all',
            isListening
              ? 'bg-red-100 text-red-600 animate-pulse'
              : 'bg-slate-100 text-slate-400 hover:text-teal-600 hover:bg-teal-50',
          )}
          title={isListening ? 'Stop dictating' : 'Start voice dictation'}
        >
          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      </div>
      {/* Listening indicator */}
      {isListening && (
        <div className="flex items-center gap-2 mt-1.5 text-xs text-red-500 font-medium">
          <Loader2 size={12} className="animate-spin" />
          Listening...
          {interim && <span className="text-slate-400 italic truncate">{interim}</span>}
        </div>
      )}
    </div>
  );
}
