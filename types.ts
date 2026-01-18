export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface VideoJob {
  id: string;
  prompt: string;
  status: JobStatus;
  videoUrl?: string; // Object URL for the blob
  videoBlob?: Blob;
  fileName?: string;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface GenerateVideoResult {
  videoUrl: string;
  videoBlob: Blob;
}