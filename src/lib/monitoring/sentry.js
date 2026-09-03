/**
 * FLIGHTSAVER SENTRY & TELEMETRY OBSERVABILITY MODULE (CommonJS Runtime)
 */

class SentryTelemetryService {
  constructor() {
    this.dsn = process.env.SENTRY_DSN || null;
    this.environment = process.env.NODE_ENV || 'production';
    this.release = 'flightsaver@1.2.0';
    this.events = [];
    this.maxHistory = 100;
    this.latencySamples = [];
  }

  captureException(error, options = {}) {
    const eventId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const service = options.service || 'general';
    const level = options.level || 'error';
    const tags = options.tags || {};
    const breadcrumbs = options.breadcrumbs || [];

    const errName = error?.name || 'Error';
    const errMessage = error?.message || String(error);
    const errStack = error?.stack;

    const event = {
      id: eventId,
      timestamp: new Date().toISOString(),
      level,
      message: `${errName}: ${errMessage}`,
      service,
      errorDetails: { name: errName, message: errMessage, stack: errStack },
      tags: { environment: this.environment, release: this.release, service, ...tags },
      breadcrumbs,
    };

    this.events.unshift(event);
    if (this.events.length > this.maxHistory) {
      this.events.pop();
    }

    return eventId;
  }

  async measureAsync(operationName, fn, service = 'general', slaThresholdMs = 1200) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.latencySamples.push({ name: operationName, duration, timestamp: Date.now() });

      if (this.latencySamples.length > 500) {
        this.latencySamples.shift();
      }

      if (duration > slaThresholdMs) {
        this.captureException(new Error(`SLA Threshold Breached: ${operationName} took ${duration}ms (target <= ${slaThresholdMs}ms)`), {
          service,
          level: 'warning',
          tags: { sla_breach: 'true', operation: operationName, duration_ms: String(duration) },
        });
      }

      return result;
    } catch (err) {
      const duration = Date.now() - start;
      this.captureException(err, { service, tags: { operation: operationName, duration_ms: String(duration) } });
      throw err;
    }
  }

  getTelemetryStats() {
    const totalEvents = this.events.length;
    const errorCount = this.events.filter((e) => e.level === 'error' || e.level === 'fatal').length;
    const warningCount = this.events.filter((e) => e.level === 'warning').length;

    const durations = this.latencySamples.map((s) => s.duration).sort((a, b) => a - b);
    let p95Latency = 0;
    if (durations.length > 0) {
      const p95Index = Math.floor(durations.length * 0.95);
      p95Latency = durations[p95Index] || durations[durations.length - 1];
    } else {
      p95Latency = 25;
    }

    return {
      status: errorCount > 5 ? 'DEGRADED' : 'HEALTHY',
      environment: this.environment,
      release: this.release,
      sentryDsnConfigured: Boolean(this.dsn),
      totalEvents,
      errorCount,
      warningCount,
      p95LatencyMs: p95Latency,
      slaTargetMs: 1200,
      slaCompliant: p95Latency <= 1200,
      recentEvents: this.events.slice(0, 10),
    };
  }
}

const sentry = new SentryTelemetryService();

module.exports = {
  SentryTelemetryService,
  sentry,
};
