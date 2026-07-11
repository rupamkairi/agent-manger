import { EventEmitter } from "node:events";
import type { Job } from "@weave/shared";

export interface LogEvent {
  jobId: string;
  stream: "stdout" | "stderr";
  chunk: string;
  offset: number;
}

export class WorkflowEvents {
  private readonly emitter = new EventEmitter();

  emitState(job: Job, channelId = job.id): void { this.emitter.emit(`state:${channelId}`, job); }
  emitLog(event: LogEvent, channelId = event.jobId): void {
    this.emitter.emit(`log:${channelId}`, event);
    this.emitter.emit(`log:*`, event);
  }
  onState(jobId: string, listener: (job: Job) => void): () => void {
    this.emitter.on(`state:${jobId}`, listener);
    return () => this.emitter.off(`state:${jobId}`, listener);
  }
  onLog(jobId: string, listener: (event: LogEvent) => void): () => void {
    this.emitter.on(`log:${jobId}`, listener);
    return () => this.emitter.off(`log:${jobId}`, listener);
  }
}
