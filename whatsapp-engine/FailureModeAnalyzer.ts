export interface FailureMode {
  failureMode: string;
  systemLayer: 'queue' | 'worker' | 'cache' | 'network' | 'whatsapp';
  severity: number;      // 1-10
  probability: number;   // 1-10
  detectability: number; // 1-10
  rpnScore: number;      // Risk Priority Number (S * P * D)
  mitigationStrategy: string;
  recoveryMechanism: string;
}

export class FailureModeAnalyzer {
  private static readonly DATASET: Omit<FailureMode, 'rpnScore'>[] = [
    {
      failureMode: 'Redis Lock Collision',
      systemLayer: 'cache',
      severity: 6,
      probability: 4,
      detectability: 3,
      mitigationStrategy: 'Short TTLs (1 hour), unique sessionId+mediaUrl key namespaces, and exact match keys.',
      recoveryMechanism: 'Clean release on job failure / crash states. Release locks on worker startup.'
    },
    {
      failureMode: 'Duplicate Media Send',
      systemLayer: 'whatsapp',
      severity: 8,
      probability: 3,
      detectability: 2,
      mitigationStrategy: 'Distributed atomic idempotency check before pipeline execution.',
      recoveryMechanism: 'Skip execution and mark job as successful instantly to deduplicate.'
    },
    {
      failureMode: 'Circuit Breaker False Recovery',
      systemLayer: 'whatsapp',
      severity: 7,
      probability: 3,
      detectability: 4,
      mitigationStrategy: 'HALF_OPEN state connection checking before full state reset.',
      recoveryMechanism: 'Fast fallback to OPEN state on first error in HALF_OPEN.'
    },
    {
      failureMode: 'Queue Starvation',
      systemLayer: 'queue',
      severity: 7,
      probability: 4,
      detectability: 5,
      mitigationStrategy: 'Scale worker concurrency dynamically from 1 to 5 based on backlog queue lag.',
      recoveryMechanism: 'Automated container autoscaling / BullMQ worker dynamic thread scaling.'
    },
    {
      failureMode: 'Memory Leak in Streaming Pipeline',
      systemLayer: 'worker',
      severity: 9,
      probability: 3,
      detectability: 6,
      mitigationStrategy: 'Non-persistent chunked ReadableStream base64 encoder with setImmediate event loop yield.',
      recoveryMechanism: 'Graceful worker restart upon memory boundary breach (e.g. max-old-space-size).'
    },
    {
      failureMode: 'WhatsApp Session Silent Throttle',
      systemLayer: 'whatsapp',
      severity: 8,
      probability: 5,
      detectability: 7,
      mitigationStrategy: 'Track sliding-window failures in MetricsService to calculate session health score.',
      recoveryMechanism: 'Automatic circuit breaker trip, fail fast, and fallback session routing.'
    },
    {
      failureMode: 'DLQ Explosion Cascade',
      systemLayer: 'queue',
      severity: 8,
      probability: 3,
      detectability: 3,
      mitigationStrategy: 'DLQ rate spike detection to pause ingestion instantly at QueueService level.',
      recoveryMechanism: 'Temporary ingestion pause for 60 seconds followed by circuit cooling.'
    },
    {
      failureMode: 'Retry Storm Amplification',
      systemLayer: 'queue',
      severity: 7,
      probability: 5,
      detectability: 4,
      mitigationStrategy: 'Adaptive Retry delays scaling exponentially with randomized jitter (15%) and lag multipliers.',
      recoveryMechanism: 'Fail-fast under extreme load, increasing retry backoff intervals dynamically.'
    }
  ];

  static getFMEAReport(): FailureMode[] {
    return this.DATASET.map(mode => ({
      ...mode,
      rpnScore: mode.severity * mode.probability * mode.detectability
    })).sort((a, b) => b.rpnScore - a.rpnScore);
  }

  static printMarkdownTable(): string {
    const report = this.getFMEAReport();
    let md = '| Failure Mode | System Layer | Severity | Probability | Detectability | RPN | Mitigation | Recovery |\n';
    md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';
    for (const item of report) {
      md += `| **${item.failureMode}** | \`${item.systemLayer}\` | ${item.severity} | ${item.probability} | ${item.detectability} | **${item.rpnScore}** | ${item.mitigationStrategy} | ${item.recoveryMechanism} |\n`;
    }
    return md;
  }
}
