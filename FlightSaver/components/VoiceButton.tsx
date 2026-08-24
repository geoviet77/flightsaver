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
    <div className="relative inline-flex items-center justify-center">
      {isListening && (
        <>
          <span className="absolute -inset-2 rounded-full bg-sky-500/40 animate-ping pointer-events-none" />
          <span className="absolute -inset-3.5 rounded-full bg-blue-500/30 animate-pulse pointer-events-none" />
        </>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={isListening}
        aria-label={isListening ? 'Остановить запись голоса' : 'Голосовой поиск'}
        title={isListening ? 'Слушаю... Нажмите для завершения' : 'Голосовой ввод запроса'}
        className={`relative z-10 p-3.5 rounded-full transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-4 ${
          isListening
            ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/40 ring-rose-200 animate-pulse'
            : 'bg-sky-50 hover:bg-sky-100 text-sky-700 ring-sky-200 border border-sky-200/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </div>
  );
}
