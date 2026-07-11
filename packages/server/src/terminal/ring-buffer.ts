/**
 * Fixed-capacity byte ring buffer used to replay recent terminal output to a
 * client that (re)attaches to a running session. Stores whole chunks as
 * pushed and evicts the oldest chunks (never splits one) once the total
 * size exceeds capacity.
 */
export class ByteRingBuffer {
  private readonly chunks: Uint8Array[] = [];
  private total = 0;

  constructor(private readonly capacity = 64 * 1024) {}

  push(chunk: Uint8Array): void {
    if (chunk.length === 0) return;
    this.chunks.push(chunk);
    this.total += chunk.length;
    while (this.total > this.capacity && this.chunks.length > 0) {
      const evicted = this.chunks.shift()!;
      this.total -= evicted.length;
    }
  }

  snapshot(): Uint8Array {
    const out = new Uint8Array(this.total);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  get size(): number {
    return this.total;
  }

  clear(): void {
    this.chunks.length = 0;
    this.total = 0;
  }
}
