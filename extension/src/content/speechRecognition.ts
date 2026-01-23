/**
 * Speech Recognition for Content Script
 * 
 * This runs in the webpage context where Web Speech API has proper permissions.
 */

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface ContentSpeechRecognition {
  isSupported: boolean;
  isListening: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/**
 * Create a speech recognition instance for the content script
 */
export function createSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks = {}
): ContentSpeechRecognition {
  const { onStart, onResult, onError, onEnd } = callbacks;

  // Check support
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = !!SpeechRecognitionAPI;

  let recognition: SpeechRecognitionInstance | null = null;
  let isListening = false;

  if (isSupported && SpeechRecognitionAPI) {
    recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isListening = true;
      onStart?.();
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        onResult?.(finalTranscript, true);
      } else if (interimTranscript) {
        onResult?.(interimTranscript, false);
      }
    };

    recognition.onerror = (event) => {
      let errorMessage = 'Speech recognition error';

      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please connect a microphone.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          // User aborted, not really an error
          return;
        default:
          errorMessage = `Speech error: ${event.error}`;
      }

      isListening = false;
      onError?.(errorMessage);
    };

    recognition.onend = () => {
      isListening = false;
      onEnd?.();
    };
  }

  return {
    get isSupported() {
      return isSupported;
    },
    get isListening() {
      return isListening;
    },
    start() {
      if (!recognition || isListening) return;
      try {
        recognition.start();
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    },
    stop() {
      if (!recognition || !isListening) return;
      try {
        recognition.stop();
      } catch (err) {
        console.warn('Failed to stop speech recognition:', err);
      }
    },
    abort() {
      if (!recognition) return;
      try {
        recognition.abort();
        isListening = false;
      } catch (err) {
        console.warn('Failed to abort speech recognition:', err);
      }
    },
  };
}
