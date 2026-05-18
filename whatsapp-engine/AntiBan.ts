import { subHours, startOfDay } from 'date-fns';
import db from './mongoService.js';

export class AntiBanService {
  private static DAILY_LIMIT = 50; // Starting limit
  private static WARMUP_INCREMENT = 5; // Increase limit by 5 every day
  private static MIN_INTERVAL = 30000; // 30s
  private static MAX_INTERVAL = 120000; // 120s

  public static async checkDailyLimit(userId: string): Promise<boolean> {
    const session = await db.whatsAppSession.findUnique({ where: { userId } });
    if (!session?.lastConnected) return false;

    // Calculate limit based on warmup
    const daysSinceStart = Math.floor(
      (new Date().getTime() - session.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentLimit = this.DAILY_LIMIT + (daysSinceStart * this.WARMUP_INCREMENT);

    const sentToday = await db.messageLog.count({
      where: {
        createdAt: { gte: startOfDay(new Date()) },
        status: { in: ['SENT', 'DELIVERED', 'READ'] }
      }
    });

    return sentToday < currentLimit;
  }

  public static getRandomDelay(): number {
    return Math.floor(Math.random() * (this.MAX_INTERVAL - this.MIN_INTERVAL + 1)) + this.MIN_INTERVAL;
  }

  public static async getHealthScore(userId: string): Promise<number> {
    const last100Logs = await db.messageLog.findMany({
      where: { createdAt: { gte: subHours(new Date(), 24) } },
      take: 100,
      orderBy: { createdAt: 'desc' }
    });

    if (last100Logs.length === 0) return 100;

    const failed = last100Logs.filter(l => l.status === 'FAILED').length;
    return 100 - (failed * 10); // Simple score
  }
}
