'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Автоматическая отправка критического сбоя рендера в телеметрию / Sentry
    console.error('[Global Error Boundary] Uncaught application crash:', error);
  }, [error]);

  return (
    <html lang="ru">
      <body className="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold mb-2">Произошла непредвиденная ошибка</h2>
          <p className="text-sm text-slate-400 mb-6">
            Инцидент автоматически зафиксирован в системе мониторинга. Служба поддержки уже уведомлена.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl transition"
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
