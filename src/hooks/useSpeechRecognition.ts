'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API interface declarations for TypeScript
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (event: Event) => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: ISpeechRecognitionErrorEvent) => void;
  onend: (event: Event) => void;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      isFinal: boolean;
      length: number;
      item(index: number): {
        transcript: string;
        confidence: number;
      };
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
    [index: number]: {
      isFinal: boolean;
      length: number;
      item(index: number): {
        transcript: string;
        confidence: number;
      };
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export type SpeechLanguage = 'ru-RU' | 'en-US';

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  language: SpeechLanguage;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  setLanguage: (lang: SpeechLanguage) => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(initialLang: SpeechLanguage = 'ru-RU'): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [language, setLanguage] = useState<SpeechLanguage>(initialLang);

  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const windowWithSpeech = window as unknown as {
        SpeechRecognition?: new () => IWindowSpeechRecognition;
        webkitSpeechRecognition?: new () => IWindowSpeechRecognition;
      };

      const SpeechRecognitionClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        setIsSupported(true);
        const recognitionInstance = new SpeechRecognitionClass();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = language;
        recognitionInstance.maxAlternatives = 1;

        recognitionInstance.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognitionInstance.onresult = (event: ISpeechRecognitionEvent) => {
          let currentFinal = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const text = res[0].transcript;
            if (res.isFinal) {
              currentFinal += text;
            } else {
              currentInterim += text;
            }
          }

          if (currentFinal) {
            setTranscript(prev => (prev ? `${prev} ${currentFinal}` : currentFinal).trim());
          }
          setInterimTranscript(currentInterim);
        };

        recognitionInstance.onerror = (event: ISpeechRecognitionErrorEvent) => {
          setIsListening(false);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError('Доступ к микрофону заблокирован. Разрешите доступ в настройках браузера.');
          } else if (event.error === 'no-speech') {
            // standard timeout when silence is detected
            setError('Речь не обнаружена. Попробуйте сказать еще раз.');
          } else if (event.error === 'network') {
            setError('Сетевая ошибка при распознавании речи.');
          } else {
            setError(`Ошибка распознавания: ${event.error}`);
          }
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
        };

        recognitionRef.current = recognitionInstance;
      } else {
        setIsSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // clean up safe
        }
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    setError(null);
    if (!isSupported || !recognitionRef.current) {
      setError('Голосовой ввод не поддерживается данным браузером (рекомендуется Chrome / Edge).');
      return;
    }

    try {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
    } catch {
      // If already started or pending
      setIsListening(true);
    }
  }, [isSupported, language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // safe
      }
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    language,
    startListening,
    stopListening,
    toggleListening,
    setLanguage,
    resetTranscript,
  };
}
