'use client';

import React from 'react';
import { Mic } from 'lucide-react';

interface VoiceButtonProps {
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceButton({
  isListening,
  onToggle,
  disabled = false,
  className = '',
}: VoiceButtonProps) {
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      {isListening && (
        <>
          <span className="absolute -inset-1 rounded-full bg-sky-400/40 animate-ping pointer-events-none" />
          <span className="absolute -inset-2 rounded-full bg-sky-500/25 animate-pulse pointer-events-none" />
        </>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={isListening}
        aria-label={isListening ? 'Остановить запись голоса' : 'Голосовой поиск'}
        title={isListening ? 'Слушаю... Нажмите для завершения' : 'Голосовой ввод запроса'}
        className={`relative z-10 transition-all duration-200 flex items-center justify-center focus:outline-none p-1.5 shrink-0 cursor-pointer ${
          isListening
            ? 'h-9 px-3 rounded-full bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white shadow-voice-ring gap-1.5'
            : 'text-sky-500 hover:text-sky-700 hover:scale-110'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <Mic className={`w-4 h-4 sm:w-5 sm:h-5 ${isListening ? 'animate-pulse text-white' : 'text-sky-500'}`} />
        {isListening && (
          <div className="flex items-center gap-0.5 h-3 px-0.5">
            <span className="wave-bar w-0.5 bg-white rounded-full"></span>
            <span className="wave-bar w-0.5 bg-white/90 rounded-full"></span>
            <span className="wave-bar w-0.5 bg-white rounded-full"></span>
            <span className="wave-bar w-0.5 bg-white/80 rounded-full"></span>
          </div>
        )}
      </button>
    </div>
  );
}
