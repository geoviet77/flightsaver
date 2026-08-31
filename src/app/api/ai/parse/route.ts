import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// Инициализация Google Gen AI SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Схема ответа для нейросети
const flightSearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    origin: {
      type: Type.STRING,
      description: '3-буквенный IATA код вылета (например, MOW, DAD, BKK).',
    },
    destination: {
      type: Type.STRING,
      description: '3-буквенный IATA код назначения (например, FCO, IST, DXB).',
    },
    departureDate: {
      type: Type.STRING,
      description: 'Дата вылета YYYY-MM-DD.',
    },
    returnDate: {
      type: Type.STRING,
      description: 'Дата возврата YYYY-MM-DD или null.',
      nullable: true,
    },
    passengers: {
      type: Type.INTEGER,
      description: 'Количество пассажиров (по умолчанию 1).',
    },
    cabinClass: {
      type: Type.STRING,
      enum: ['economy', 'premium_economy', 'business', 'first'],
      description: 'Класс обслуживания.',
    },
    budget: {
      type: Type.NUMBER,
      description: 'Бюджет поездки, если указан.',
      nullable: true,
    },
    searchStpc: {
      type: Type.BOOLEAN,
      description: 'true, если упомянут отель, пересадка или транзит.',
    },
    preferredHubs: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Предпочитаемые хабы (например, IST, DXB).',
    },
  },
  required: ['origin', 'destination', 'departureDate', 'passengers', 'searchStpc'],
};

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Поисковый запрос обязателен' },
        { status: 400 }
      );
    }

    const currentDate = new Date().toISOString().split('T')[0];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Запрос пользователя: "${query}". Текущая дата: ${currentDate}.`,
      config: {
        systemInstruction: `Ты — тревел-консьерж FlightSaver. Преобразуй запрос в строгий JSON.
Правила:
1. Города переводи в 3-значные IATA коды (Москва -> MOW, Дананг -> DAD, Рим -> FCO, Стамбул -> IST, Бангкок -> BKK).
2. Относительные даты считай от сегодняшней (${currentDate}).
3. При упоминании отеля или длинной пересадки ставь searchStpc: true.`,
        responseMimeType: 'application/json',
        responseSchema: flightSearchSchema,
        temperature: 0.1,
      },
    });

    const parsedData = JSON.parse(response.text || '{}');

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Ошибка в /api/ai/parse:', error);
    return NextResponse.json(
      { error: 'Ошибка обработки запроса', details: error.message },
      { status: 500 }
    );
  }
}