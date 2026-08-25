import ConciergeChat from '@/components/ConciergeChat';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Умный поиск перелётов одной фразой
        </h1>
        <p className="text-slate-500 mt-2">
          Напишите или скажите голосом куда, когда и как вы хотите полететь
        </p>
      </div>

      {/* Живой компонент с прямым обращением к Gemini API */}
      <ConciergeChat />
    </main>
  );
}
