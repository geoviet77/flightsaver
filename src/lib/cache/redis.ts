/**
 * FlightSaver L2 Cache Layer (Redis & In-Memory Fallback)
 * Подготовка фундамента для Спринта 5 (L2-кэширование поисковой выдачи, STPC-матрицы и котировок валют).
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService {
  private static memoryStore: Map<string, CacheEntry<any>> = new Map();

  /**
   * Получить значение из кэша (L1 In-Memory или L2 Redis)
   */
  static async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Записать значение в кэш с заданным временем жизни (TTL в секундах)
   */
  static async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryStore.set(key, { value, expiresAt });
  }

  /**
   * Удалить ключ из кэша
   */
  static async delete(key: string): Promise<boolean> {
    return this.memoryStore.delete(key);
  }

  /**
   * Очистить кэш
   */
  static async clear(): Promise<void> {
    this.memoryStore.clear();
  }

  /**
   * Обертка getOrSet: получение данных с автоматическим кэшированием при промахе
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<{ data: T; fromCache: boolean }> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }

    const data = await fetcher();
    await this.set<T>(key, data, ttlSeconds);
    return { data, fromCache: false };
  }
}
