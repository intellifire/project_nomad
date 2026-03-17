/**
 * JobLogEmitter — in-process pub/sub bridge for FireSTARR log lines.
 *
 * FireSTARREngine pushes stdout/stderr lines via emit().
 * SSE routes subscribe per connection to stream lines to the browser.
 * Buffers all lines per model for replay when a new SSE client connects.
 */

type LogSubscriber = (line: string) => void;

class JobLogEmitter {
  private subscribers = new Map<string, Set<LogSubscriber>>();
  private buffers = new Map<string, string[]>();

  /**
   * Emit a log line for a model. Buffers it and notifies all subscribers.
   */
  emit(modelId: string, line: string): void {
    // Buffer
    let buffer = this.buffers.get(modelId);
    if (!buffer) {
      buffer = [];
      this.buffers.set(modelId, buffer);
    }
    buffer.push(line);

    // Notify subscribers
    const subs = this.subscribers.get(modelId);
    if (subs) {
      for (const callback of subs) {
        try {
          callback(line);
        } catch {
          // Don't let a broken subscriber crash the engine
        }
      }
    }
  }

  /**
   * Subscribe to log lines for a model. Returns an unsubscribe function.
   */
  subscribe(modelId: string, callback: LogSubscriber): () => void {
    let subs = this.subscribers.get(modelId);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(modelId, subs);
    }
    subs.add(callback);

    return () => {
      subs!.delete(callback);
      if (subs!.size === 0) {
        this.subscribers.delete(modelId);
      }
    };
  }

  /**
   * Get all buffered log lines for a model (for replay on SSE connect).
   */
  getBuffer(modelId: string): string[] {
    return this.buffers.get(modelId) ?? [];
  }

  /**
   * Clean up buffer and subscribers for a model.
   * Call after all SSE connections have closed.
   */
  cleanup(modelId: string): void {
    this.buffers.delete(modelId);
    this.subscribers.delete(modelId);
  }
}

// Singleton
const jobLogEmitter = new JobLogEmitter();

export function getJobLogEmitter(): JobLogEmitter {
  return jobLogEmitter;
}

export { JobLogEmitter };
