import { AIModel } from '../../core/ai/model-registry/model-registry.data';

export interface DownloadedModel extends AIModel {
  localPath: string;
  downloadDate: Date;
  status: 'downloading' | 'completed' | 'error';
  progress?: number;
}

export interface ModelDownloadState {
  modelId: string;
  progress: number;
  bytesDownloaded?: number;
  totalBytes?: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
}
