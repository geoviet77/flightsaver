/**
 * FlightSaver Structured Logger & Performance Monitor
 * Модуль изолированного структурированного логирования, замера SLA и перехвата ошибок.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface PerformanceMetric {
  endpoint: string;
  durationMs: number;
  statusCode: number;
  timestamp: string;
  isSlaCompliant: boolean; // SLA: p95 < 1200ms
}

export class Logger {
  private static sanitize(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const sensitiveKeys = ['password', 'token', 'secret', 'cardNumber', 'cvv', 'passportNumber'];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '***MASKED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = Logger.sanitize(sanitized[key]);
      }
    }
    return sanitized;
  }

  static info(message: string, context?: Record<string, any>) {
    const logObj = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context: Logger.sanitize(context),
    };
    console.log(`[INFO] ${logObj.timestamp} - ${message}`, context ? JSON.stringify(Logger.sanitize(context)) : '');
    return logObj;
  }

  static warn(message: string, context?: Record<string, any>) {
    const logObj = {
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      context: Logger.sanitize(context),
    };
    console.warn(`[WARN] ${logObj.timestamp} - ${message}`, context ? JSON.stringify(Logger.sanitize(context)) : '');
    return logObj;
  }

  static error(message: string, error?: any, context?: Record<string, any>) {
    const logObj = {
      level: 'error',
      message,
      errorMessage: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      context: Logger.sanitize(context),
    };
    console.error(`[ERROR] ${logObj.timestamp} - ${message}`, error, context ? JSON.stringify(Logger.sanitize(context)) : '');
    return logObj;
  }

  /**
   * Замер времени выполнения асинхронной серверной операции и валидация SLA
   */
  static async measurePerformance<T>(
    endpoint: string,
    operation: () => Promise<T>,
    slaThresholdMs: number = 1200
  ): Promise<{ result: T; metric: PerformanceMetric }> {
    const start = performance.now();
    let statusCode = 200;
    try {
      const result = await operation();
      const durationMs = Math.round(performance.now() - start);
      const metric: PerformanceMetric = {
        endpoint,
        durationMs,
        statusCode,
        timestamp: new Date().toISOString(),
        isSlaCompliant: durationMs <= slaThresholdMs,
      };
      if (!metric.isSlaCompliant) {
        Logger.warn(`[SLA Alert] Endpoint ${endpoint} took ${durationMs}ms (threshold: ${slaThresholdMs}ms)`, metric);
      }
      return { result, metric };
    } catch (err: any) {
      statusCode = err?.statusCode || 500;
      const durationMs = Math.round(performance.now() - start);
      const metric: PerformanceMetric = {
        endpoint,
        durationMs,
        statusCode,
        timestamp: new Date().toISOString(),
        isSlaCompliant: durationMs <= slaThresholdMs,
      };
      Logger.error(`[Performance Failure] Endpoint ${endpoint} failed after ${durationMs}ms`, err, metric);
      throw err;
    }
  }
}
