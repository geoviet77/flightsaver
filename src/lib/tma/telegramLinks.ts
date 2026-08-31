/**
 * FlightSaver Telegram Deeplink & Sharing Utilities
 * Генерация прямых ссылок для шеринга сплит-маршрутов и карточек билетов в Telegram.
 */

export interface ShareFlightPayload {
  flightId: string;
  origin: string;
  destination: string;
  priceRub: number;
  savingsRub?: number;
  stpcHotel?: string;
}

export class TelegramLinkService {
  private static readonly BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'FlightSaverBot';

  /**
   * Генерация startapp deeplink для открытия билета в Telegram Mini App
   * Пример: https://t.me/FlightSaverBot/app?startapp=fl_001
   */
  static generateMiniAppDeeplink(flightId: string): string {
    const cleanId = encodeURIComponent(flightId);
    return `https://t.me/${this.BOT_USERNAME}/app?startapp=flight_${cleanId}`;
  }

  /**
   * Генерация share url для кнопки «Поделиться билетом в Telegram»
   */
  static generateShareMessageUrl(payload: ShareFlightPayload): string {
    const text = [
      `✈️ Я нашел выгодный сплит-авиабилет на FlightSaver!`,
      `📍 Маршрут: ${payload.origin} → ${payload.destination}`,
      `💰 Цена: ${payload.priceRub.toLocaleString('ru-RU')} ₽`,
      payload.savingsRub ? `🔥 Экономия: ${payload.savingsRub.toLocaleString('ru-RU')} ₽` : '',
      payload.stpcHotel ? `🏨 Включен бесплатный транзитный отель: ${payload.stpcHotel}` : '',
      `👉 Открыть в Telegram: ${this.generateMiniAppDeeplink(payload.flightId)}`
    ].filter(Boolean).join('\n');

    return `https://t.me/share/url?url=${encodeURIComponent(this.generateMiniAppDeeplink(payload.flightId))}&text=${encodeURIComponent(text)}`;
  }
}
