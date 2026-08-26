import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface ParseRequestBody {
  prompt?: string;
}

export type CabinClass = 'economy' | 'business';

export interface ParsedFlightParams {
  origin: string | null;
  destination: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengers: number;
  cabinClass: CabinClass;
  searchStpc: boolean;
  message: string;
}

export interface ParseSuccessResponse {
  success: true;
  data: ParsedFlightParams;
}

export interface ParseErrorResponse {
  success: false;
  error: string;
  details?: string;
}

const SYSTEM_INSTRUCTION = `Ты — профессиональный AI-консьерж сервиса FlightSaver (поиск авиабилетов и стыковочных программ STPC с бесплатным отелем).

Твоя задача — проанализировать запрос пользователя на естественном языке (русском или английском) и извлечь структурированные параметры перелета.

Правила извлечения параметров:
1. origin: 3-буквенный IATA-код города/аэропорта вылета (например: Москва -> MOW, Санкт-Петербург -> LED, Сочи -> AER, Екатеринбург -> SVX, Новосибирск -> OVB, Казань -> KZN, Минск -> MSQ, Алматы -> ALA, Ташкент -> TAS, Пхукет -> HKT, Бангкок -> BKK, Дубай -> DXB). Если город вылета не указан, верни null.
2. destination: 3-буквенный IATA-код города/аэропорта назначения (например: Бангкок -> BKK, Пхукет -> HKT, Дубай -> DXB, Стамбул -> IST, Анталья -> AYT, Бали/Денпасар -> DPS, Париж -> CDG, Рим -> FCO, Токио -> NRT, Сеул -> ICN, Нью-Йорк -> JFK, Сиэтл -> SEA, Ницца -> NCE). Если город назначения не указан, верни null.
3. departureDate: дата вылета в формате "YYYY-MM-DD". Если указана относительная дата (например: "завтра", "через неделю", "15 сентября"), рассчитай дату относительно текущего времени. Если дата не указана, верни null.
4. returnDate: дата возвращения в формате "YYYY-MM-DD". Если это билет в одну сторону или дата не указана, верни null.
5. passengers: число пассажиров (number, целое число >= 1). По умолчанию 1.
6. cabinClass: класс обслуживания — строго "economy" или "business". Если указан эконом, комфорт или не указано -> "economy". Если указан бизнес или первый класс -> "business".
7. searchStpc: булево значение (boolean). Установи true, если пользователь упомянул длительную стыковку, пересадку с отдыхом, отель от авиакомпании, программу STPC или бесплатную гостиницу при пересадке; иначе false.
8. message: краткий, дружелюбный и вежливый ответ консьержа на русском языке (1-2 предложения), подтверждающий найденные параметры или уточняющий недостающую информацию (например, город вылета или даты).

Ответ верни СТРОГО в формате JSON со следующей структурой:
{
  "origin": "MOW",
  "destination": "BKK",
  "departureDate": "2026-09-15",
  "returnDate": null,
  "passengers": 1,
  "cabinClass": "economy",
  "searchStpc": false,
  "message": "Принято! Подбираю билеты из Москвы в Бангкок на 15 сентября в эконом-классе для 1 пассажира."
}`;

export async function POST(req: NextRequest): Promise<NextResponse<ParseSuccessResponse | ParseErrorResponse>> {
  try {
    let body: ParseRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Некорректный формат JSON в теле запроса.',
        },
        { status: 400 }
      );
    }

    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Поле prompt обязательно для заполнения и должно быть непустой строкой.',
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Серверная конфигурация не завершена: отсутствует GEMINI_API_KEY.',
        },
        { status: 500 }
      );
    }

    // Инициализация GoogleGenAI SDK
    const ai = new GoogleGenAI({ apiKey });

    // Вызов модели gemini-2.0-flash с JSON-режимом
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt.trim(),
      config: {
        responseMimeType: 'application/json',
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      },
    });

    const responseText = response.text?.trim() || '';

    if (!responseText) {
      return NextResponse.json(
        {
          success: false,
          error: 'Модель Gemini вернула пустой ответ.',
        },
        { status: 502 }
      );
    }

    // Извлечение и парсинг JSON из ответа модели
    let rawParsed: Record<string, unknown>;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      rawParsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (parseErr: unknown) {
      return NextResponse.json(
        {
          success: false,
          error: 'Не удалось распарсить структурированный ответ от модели.',
          details: parseErr instanceof Error ? parseErr.message : String(parseErr),
        },
        { status: 502 }
      );
    }

    // Нормализация и валидация извлеченных параметров
    const origin = typeof rawParsed.origin === 'string' && rawParsed.origin.trim()
      ? rawParsed.origin.trim().toUpperCase()
      : null;

    const destination = typeof rawParsed.destination === 'string' && rawParsed.destination.trim()
      ? rawParsed.destination.trim().toUpperCase()
      : null;

    const departureDate = typeof rawParsed.departureDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawParsed.departureDate.trim())
      ? rawParsed.departureDate.trim()
      : null;

    const returnDate = typeof rawParsed.returnDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawParsed.returnDate.trim())
      ? rawParsed.returnDate.trim()
      : null;

    const rawPassengers = Number(rawParsed.passengers);
    const passengers = Number.isFinite(rawPassengers) && rawPassengers >= 1
      ? Math.floor(rawPassengers)
      : 1;

    const cabinClass: CabinClass = rawParsed.cabinClass === 'business' ? 'business' : 'economy';
    const searchStpc = Boolean(rawParsed.searchStpc);

    const defaultMessage = origin && destination
      ? `Маршрут ${origin} → ${destination}${departureDate ? `, вылет ${departureDate}` : ''} успешно распознан.`
      : 'Запрос принят. Уточните, пожалуйста, города вылета и назначения для точного поиска.';

    const message = typeof rawParsed.message === 'string' && rawParsed.message.trim()
      ? rawParsed.message.trim()
      : defaultMessage;

    const parsedData: ParsedFlightParams = {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
      searchStpc,
      message,
    };

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: unknown) {
    console.error('[API /api/ai/parse] Ошибка обработки запроса:', error);
    const errorMessage = error instanceof Error ? error.message : 'Внутренняя ошибка сервера при обработке AI-запроса';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
