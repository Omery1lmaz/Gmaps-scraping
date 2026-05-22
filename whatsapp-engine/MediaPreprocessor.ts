import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { Readable } from 'stream';

export interface PreprocessedMedia {
  localPath?: string;
  bufferBase64?: string;
  mimeType: string;
  fileName: string;
  downloadDurationMs: number;
  size: number;
}

export class MediaPreprocessor {
  private static readonly LIMITS: Record<'IMAGE' | 'VIDEO' | 'DOCUMENT', number> = {
    IMAGE: 16 * 1024 * 1024,      // 16MB
    VIDEO: 16 * 1024 * 1024,      // 16MB
    DOCUMENT: 100 * 1024 * 1024,  // 100MB
  };

  static async streamToBase64(stream: NodeJS.ReadableStream, limit: number): Promise<string> {
    const chunks: Buffer[] = [];
    let size = 0;
    
    for await (const chunk of stream) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buf.length;
      if (size > limit) {
        throw new Error(`UNSUPPORTED_FORMAT: File size exceeded the limit of ${limit} bytes.`);
      }
      chunks.push(buf);

      if (process.env.CHAOS_MODE === 'true') {
        try {
          const { ChaosEngine } = await import('./ChaosEngine.js');
          const memoryPressure = await ChaosEngine.getFailureIntensity('MEMORY_PRESSURE');
          if (memoryPressure > 0) {
            const freezeDuration = Math.floor(memoryPressure * 100); // synchronously block the thread up to 100ms
            const start = Date.now();
            while (Date.now() - start < freezeDuration) {
              // Synchronous blocking loop (GC freeze simulation)
            }
          }
        } catch (e) {
          // Guard against import failures during bootstrap
        }
      }

      // Yield to the Node.js event loop to prevent event loop blocking
      await new Promise(resolve => setImmediate(resolve));
    }
    
    return Buffer.concat(chunks).toString('base64');
  }

  static async downloadAndValidate(
    type: 'IMAGE' | 'VIDEO' | 'DOCUMENT',
    mediaUrl: string,
    providedMime?: string,
    providedFileName?: string
  ): Promise<PreprocessedMedia> {
    const isRemote = mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://');
    const limit = this.LIMITS[type];
    let downloadDurationMs = 0;

    if (isRemote) {
      let fetchUrl = mediaUrl;
      // In Docker, localhost:3001 points to the wa-engine container itself.
      // We must map it to 'api:3001' to reach the backend server properly.
      if (fetchUrl.includes('localhost:3001')) {
        fetchUrl = fetchUrl.replace('localhost:3001', 'api:3001');
      }

      const startTime = Date.now();
      try {
        if (process.env.CHAOS_MODE === 'true') {
          try {
            const { ChaosEngine } = await import('./ChaosEngine.js');
            const proxyJitter = await ChaosEngine.getFailureIntensity('PROXY_JITTER');
            if (proxyJitter > 0) {
              // Apply dynamic jitter delay
              await new Promise(resolve => setTimeout(resolve, Math.random() * proxyJitter * 2000));
              // Simulate proxy/packet-loss dropout
              if (Math.random() < proxyJitter * 0.5) {
                throw new Error('PROXY_PACKET_LOSS: Artificial proxy packet loss / timeout simulated');
              }
            }
          } catch (e) {
            // Guard
          }
        }
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`Failed to download remote media. Status: ${response.status} from ${fetchUrl}`);
        }

        const contentLengthStr = response.headers.get('content-length');
        const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;

        if (contentLength > limit) {
          throw new Error(`UNSUPPORTED_FORMAT: File size ${contentLength} exceeds limit of ${limit} for ${type}.`);
        }

        const mimeType = providedMime || response.headers.get('content-type') || this.guessMime(type, mediaUrl);
        const fileName = providedFileName || this.extractFileName(mediaUrl) || `file${this.guessExtension(type, mimeType)}`;

        // Hybrid streaming: if >= 10MB or size unknown, stream it natively
        const isLarge = contentLength >= 10 * 1024 * 1024 || contentLength === 0;

        if (isLarge && response.body) {
          console.log(`[Preprocessor] Large remote file detected (${contentLength} bytes). Processing via stream to base64.`);
          const nodeStream = Readable.from(response.body as any);
          const base64 = await this.streamToBase64(nodeStream, limit);
          downloadDurationMs = Date.now() - startTime;
          return {
            bufferBase64: base64,
            mimeType,
            fileName,
            downloadDurationMs,
            size: Buffer.from(base64, 'base64').length
          };
        } else {
          // Smaller file: fetch full array buffer
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length > limit) {
            throw new Error(`UNSUPPORTED_FORMAT: File size ${buffer.length} exceeds limit of ${limit} for ${type}.`);
          }
          downloadDurationMs = Date.now() - startTime;
          return {
            bufferBase64: buffer.toString('base64'),
            mimeType,
            fileName,
            downloadDurationMs,
            size: buffer.length
          };
        }
      } catch (err) {
        throw new Error(`DOWNLOAD_FAILED: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Local file flow
    let stats;
    try {
      stats = await fs.stat(mediaUrl);
    } catch {
      throw new Error(`UNSUPPORTED_FORMAT: Media file at path ${mediaUrl} does not exist.`);
    }

    if (stats.size > limit) {
      throw new Error(`UNSUPPORTED_FORMAT: File size ${stats.size} exceeds the maximum limit of ${limit} bytes for ${type}.`);
    }

    const mimeType = providedMime || this.determineMime(type, mediaUrl);
    const fileName = providedFileName || path.basename(mediaUrl);

    // Hybrid local streaming if >= 10MB
    if (stats.size >= 10 * 1024 * 1024) {
      console.log(`[Preprocessor] Large local file detected (${stats.size} bytes). Processing via stream.`);
      const fileStream = createReadStream(mediaUrl);
      const base64 = await this.streamToBase64(fileStream, limit);
      return {
        bufferBase64: base64,
        mimeType,
        fileName,
        downloadDurationMs: 0,
        size: stats.size
      };
    } else {
      const buffer = await fs.readFile(mediaUrl);
      return {
        bufferBase64: buffer.toString('base64'),
        mimeType,
        fileName,
        downloadDurationMs: 0,
        size: stats.size
      };
    }
  }

  static async safeCleanup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log(`[Preprocessor] Cleaned up temporary file: ${filePath}`);
    } catch (err) {
      // Ignored if file doesn't exist
    }
  }

  private static guessExtension(type: string, mime?: string): string {
    if (mime) {
      if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
      if (mime.includes('png')) return '.png';
      if (mime.includes('mp4')) return '.mp4';
      if (mime.includes('pdf')) return '.pdf';
    }
    return type === 'IMAGE' ? '.jpg' : type === 'VIDEO' ? '.mp4' : '.bin';
  }

  private static guessMime(type: 'IMAGE' | 'VIDEO' | 'DOCUMENT', url: string): string {
    const rawExt = path.extname(url).split('?')[0];
    const ext = (rawExt || '').toLowerCase();
    if (type === 'IMAGE') {
      return ext === '.png' ? 'image/png' : 'image/jpeg';
    }
    if (type === 'VIDEO') {
      return 'video/mp4';
    }
    return ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';
  }

  private static determineMime(type: 'IMAGE' | 'VIDEO' | 'DOCUMENT', filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (type === 'IMAGE') {
      return ext === '.png' ? 'image/png' : 'image/jpeg';
    }
    if (type === 'VIDEO') {
      return 'video/mp4';
    }
    return ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';
  }

  private static extractFileName(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return path.basename(pathname);
    } catch {
      return '';
    }
  }
}
