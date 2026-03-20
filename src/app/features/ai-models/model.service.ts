import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

import { AIModel, AI_MODELS } from '../../core/ai/model-registry/model-registry.data';
import { AppDatabaseService } from '../../core/db/app-database.service';
import { DownloadedModel, ModelDownloadState } from './model.types';

interface MetadataStorage {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: unknown): Promise<unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class AIModelService {
  private readonly MODELS_TABLE_KEY = 'ai_models_meta';
  private readonly ACTIVE_MODEL_KEY = 'active_ai_model';
  private readonly db = inject(AppDatabaseService);
  private readonly isNative = Capacitor.isNativePlatform();

  private downloadedModels: DownloadedModel[] = [];
  private readonly downloadedModelsSubject = new BehaviorSubject<DownloadedModel[]>([]);
  private readonly downloadStates = new Map<string, BehaviorSubject<ModelDownloadState>>();
  private currentDownloadingModelId: string | null = null;

  readonly activeModelId = signal<string>('tinyllama-1.1b');

  constructor() {
    void this.initModelSystem();
    this.setupProgressListeners();
  }

  private async initModelSystem(): Promise<void> {
    const storage = this.getStorage();
    const savedRaw = await storage.getItem(this.MODELS_TABLE_KEY);
    const saved = Array.isArray(savedRaw) ? savedRaw as DownloadedModel[] : [];
    const savedActiveModelRaw = await storage.getItem(this.ACTIVE_MODEL_KEY);
    const savedActiveModel = typeof savedActiveModelRaw === 'string' ? savedActiveModelRaw : null;

    if (savedActiveModel && AI_MODELS.some((model) => model.id === savedActiveModel)) {
      this.activeModelId.set(savedActiveModel);
    }

    if (!this.isNative) {
      this.downloadedModels = saved.map((model: DownloadedModel) => ({
        ...model,
        downloadDate: new Date(model.downloadDate),
        status: 'completed',
        progress: 100,
      }));
      this.downloadedModelsSubject.next(this.downloadedModels);
      return;
    }

    try {
      const { files } = await Filesystem.readdir({
        path: 'ai-models',
        directory: Directory.Data,
      }).catch(() => ({ files: [] }));

      const diskFiles = new Set(files.map((file) => file.name));
      const validated: DownloadedModel[] = [];

      for (const model of AI_MODELS) {
        const fileName = `${model.id}.gguf`;
        if (diskFiles.has(fileName)) {
          const meta = saved.find((entry: DownloadedModel) => entry.id === model.id);
          validated.push({
            ...model,
            localPath: meta?.localPath || `ai-models/${fileName}`,
            downloadDate: meta?.downloadDate ? new Date(meta.downloadDate) : new Date(),
            status: 'completed',
            progress: 100,
          });
        }
      }

      this.downloadedModels = validated;
      await this.saveMetadata();
      this.downloadedModelsSubject.next(this.downloadedModels);
    } catch {
      this.downloadedModels = saved.map((model: DownloadedModel) => ({
        ...model,
        downloadDate: new Date(model.downloadDate),
      }));
      this.downloadedModelsSubject.next(this.downloadedModels);
    }
  }

  async setActiveModel(modelId: string): Promise<void> {
    this.activeModelId.set(modelId);
    await this.getStorage().setItem(this.ACTIVE_MODEL_KEY, modelId);
  }

  getDownloadedModels$(): Observable<DownloadedModel[]> {
    return this.downloadedModelsSubject.asObservable();
  }

  getDownloadState$(modelId: string): Observable<ModelDownloadState> {
    if (!this.downloadStates.has(modelId)) {
      this.downloadStates.set(modelId, new BehaviorSubject<ModelDownloadState>({
        modelId,
        progress: this.isModelDownloaded(modelId) ? 100 : 0,
        status: this.isModelDownloaded(modelId) ? 'completed' : 'pending',
      }));
    }

    return this.downloadStates.get(modelId)!.asObservable();
  }

  async downloadModel(model: AIModel): Promise<void> {
    if (this.currentDownloadingModelId && this.currentDownloadingModelId !== model.id) {
      throw new Error('Another model download is already in progress.');
    }

    const state$ = this.getOrCreateState(model.id);
    this.currentDownloadingModelId = model.id;
    state$.next({ modelId: model.id, progress: 0, status: 'downloading' });

    try {
      if (!this.isNative) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        const downloaded = this.toDownloadedModel(model, `web-cache/${model.id}.gguf`);
        this.upsertDownloadedModel(downloaded);
        state$.next({ modelId: model.id, progress: 100, status: 'completed', bytesDownloaded: model.sizeMB * 1024 * 1024, totalBytes: model.sizeMB * 1024 * 1024 });
        return;
      }

      await Filesystem.mkdir({ path: 'ai-models', directory: Directory.Data, recursive: true }).catch(() => undefined);
      const result = await Filesystem.downloadFile({
        url: model.downloadUrl,
        path: `ai-models/${model.id}.gguf`,
        directory: Directory.Data,
        progress: true,
      });

      const downloaded = this.toDownloadedModel(model, result.path || `ai-models/${model.id}.gguf`);
      this.upsertDownloadedModel(downloaded);
      state$.next({ modelId: model.id, progress: 100, status: 'completed', bytesDownloaded: model.sizeMB * 1024 * 1024, totalBytes: model.sizeMB * 1024 * 1024 });
    } catch (error: any) {
      state$.next({ modelId: model.id, progress: 0, status: 'error', error: error?.message ?? 'Download failed' });
    } finally {
      if (this.currentDownloadingModelId === model.id) {
        this.currentDownloadingModelId = null;
      }
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    if (this.isNative) {
      try {
        await Filesystem.deleteFile({ path: `ai-models/${modelId}.gguf`, directory: Directory.Data });
      } catch {
      }
    }

    this.downloadedModels = this.downloadedModels.filter((model) => model.id !== modelId);
    await this.saveMetadata();
    this.downloadedModelsSubject.next(this.downloadedModels);
    this.getOrCreateState(modelId).next({ modelId, progress: 0, status: 'pending' });

    if (this.activeModelId() === modelId) {
      const fallback = AI_MODELS[0]?.id ?? '';
      if (fallback) {
        await this.setActiveModel(fallback);
      }
    }
  }

  isModelDownloaded(modelId: string): boolean {
    return this.downloadedModels.some((model) => model.id === modelId && model.status === 'completed');
  }

  private getOrCreateState(modelId: string): BehaviorSubject<ModelDownloadState> {
    if (!this.downloadStates.has(modelId)) {
      this.downloadStates.set(modelId, new BehaviorSubject<ModelDownloadState>({ modelId, progress: 0, status: 'pending' }));
    }

    return this.downloadStates.get(modelId)!;
  }

  private toDownloadedModel(model: AIModel, localPath: string): DownloadedModel {
    return {
      ...model,
      localPath,
      downloadDate: new Date(),
      status: 'completed',
      progress: 100,
    };
  }

  private upsertDownloadedModel(model: DownloadedModel): void {
    this.downloadedModels = [
      ...this.downloadedModels.filter((entry) => entry.id !== model.id),
      model,
    ];
    void this.saveMetadata();
    this.downloadedModelsSubject.next(this.downloadedModels);
  }

  private async saveMetadata(): Promise<void> {
    await this.getStorage().setItem(this.MODELS_TABLE_KEY, this.downloadedModels);
  }

  private setupProgressListeners(): void {
    if (!this.isNative) {
      return;
    }

    Filesystem.addListener('progress', (progress) => {
      if (!this.currentDownloadingModelId) {
        return;
      }

      const state$ = this.downloadStates.get(this.currentDownloadingModelId);
      const current = state$?.getValue();
      if (!state$ || !current || current.status !== 'downloading') {
        return;
      }

      const totalBytes = progress.contentLength || current.totalBytes || 1;
      state$.next({
        ...current,
        progress: Math.min(100, Math.round((progress.bytes / totalBytes) * 100)),
        bytesDownloaded: progress.bytes,
        totalBytes,
      });
    });
  }

  private getStorage(): MetadataStorage {
    return (this.db as any)['storage'] as MetadataStorage;
  }
}
