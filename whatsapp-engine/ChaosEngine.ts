import { Redis } from 'ioredis';

export type ChaosType =
  | 'REDIS_LATENCY'
  | 'WORKER_CRASH'
  | 'DUPLICATION'
  | 'BACKLOG_EXPLOSION'
  | 'WHATSAPP_DISCONNECT'
  | 'PROXY_JITTER'
  | 'MEMORY_PRESSURE';

export class ChaosEngine {
  private static redis: Redis | null = null;
  private static localFailures: Map<ChaosType, number> = new Map();
  private static currentScenario: string = 'normal_operation';

  static registerRedis(redis: Redis) {
    this.redis = redis;
    console.log('[ChaosEngine] Redis client registered for horizontally scalable failure injection.');
  }

  static proxyRedis(originalRedis: Redis): Redis {
    return new Proxy(originalRedis, {
      get(target: any, prop: string | symbol, receiver: any) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function' && typeof prop === 'string') {
          return function (this: any, ...args: any[]) {
            const isChaosQuery = args[0] && typeof args[0] === 'string' && args[0].includes('chaos');
            if (process.env.CHAOS_MODE === 'true' && !isChaosQuery) {
              // Wrap in async to delay execution transparently
              return (async () => {
                try {
                  const intensity = await ChaosEngine.getFailureIntensity('REDIS_LATENCY');
                  if (intensity > 0) {
                    const delay = Math.floor(intensity * 10); // up to 10ms of injected delay for fast sandboxed stress test
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }
                } catch (e) {}
                return value.apply(this || target, args);
              })();
            }
            return value.apply(this || target, args);
          };
        }
        return value;
      }
    }) as any;
  }

  static async injectFailure(type: ChaosType, intensity: number): Promise<void> {
    const boundedIntensity = Math.min(1, Math.max(0, intensity));
    
    if (boundedIntensity <= 0) {
      this.localFailures.delete(type);
      if (this.redis) {
        await this.redis.hdel('whatsapp:chaos:failures', type);
      }
    } else {
      this.localFailures.set(type, boundedIntensity);
      if (this.redis) {
        await this.redis.hset('whatsapp:chaos:failures', type, boundedIntensity.toString());
      }
    }
    console.log(`[ChaosEngine] Injected failure: ${type} with intensity ${boundedIntensity}`);
  }

  static async getFailureIntensity(type: ChaosType): Promise<number> {
    if (this.redis) {
      const val = await this.redis.hget('whatsapp:chaos:failures', type);
      return val ? parseFloat(val) : 0;
    }
    return this.localFailures.get(type) || 0;
  }

  static async isFailureActive(type: ChaosType): Promise<boolean> {
    const intensity = await this.getFailureIntensity(type);
    return intensity > 0;
  }

  static async stopAll(): Promise<void> {
    this.localFailures.clear();
    this.currentScenario = 'normal_operation';
    if (this.redis) {
      await this.redis.del('whatsapp:chaos:failures');
      await this.redis.set('whatsapp:chaos:scenario', 'normal_operation');
    }
    console.log('[ChaosEngine] Stopped all chaos injections. System in normal_operation.');
  }

  static async runScenario(scenario: string): Promise<void> {
    await this.stopAll();
    this.currentScenario = scenario;
    if (this.redis) {
      await this.redis.set('whatsapp:chaos:scenario', scenario);
    }
    console.log(`[ChaosEngine] Starting scenario: ${scenario}`);
    
    switch (scenario) {
      case 'normal_operation':
        break;
      case 'high_load_10k_jobs':
        await this.injectFailure('BACKLOG_EXPLOSION', 1.0);
        break;
      case 'redis_degradation':
        await this.injectFailure('REDIS_LATENCY', 0.8);
        break;
      case 'whatsapp_throttle_simulation':
        await this.injectFailure('WHATSAPP_DISCONNECT', 0.5);
        await this.injectFailure('PROXY_JITTER', 0.4);
        break;
      case 'multi_failure_combination_stress':
        await this.injectFailure('REDIS_LATENCY', 0.5);
        await this.injectFailure('WORKER_CRASH', 0.3);
        await this.injectFailure('WHATSAPP_DISCONNECT', 0.3);
        await this.injectFailure('PROXY_JITTER', 0.5);
        break;
      default:
        console.warn(`[ChaosEngine] Unknown scenario: ${scenario}`);
    }
  }

  static async getScenario(): Promise<string> {
    if (this.redis) {
      return (await this.redis.get('whatsapp:chaos:scenario')) || 'normal_operation';
    }
    return this.currentScenario;
  }
}
