import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { AIModelRegistryService } from '../../core/ai/model-registry/model-registry.service';
import { AIModelService } from './model.service';
import { AIEngineService } from '../../core/ai/engine/ai-engine.service';
import { AIModel } from '../../core/ai/model-registry/model-registry.data';
import { ModelDownloadState } from './model.types';
import { Observable } from 'rxjs';
import { arrowBackOutline, hardwareChipOutline, trashOutline, downloadOutline, checkmarkCircle } from 'ionicons/icons';
import { addIcons } from 'ionicons';

addIcons({ arrowBackOutline, hardwareChipOutline, trashOutline, downloadOutline, checkmarkCircle });

@Component({
  selector: 'app-ai-models',
  templateUrl: './models.page.html',
  styleUrls: ['./models.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class AIModelsPage implements OnInit {
  private registry = inject(AIModelRegistryService);
  private modelService = inject(AIModelService);
  private aiEngine = inject(AIEngineService);
  private toastCtrl = inject(ToastController);

  models: AIModel[] = [];

  constructor() {}

  ngOnInit(): void {
    this.models = this.registry.getAllModels();
  }

  getDownloadState(modelId: string): Observable<ModelDownloadState> {
    return this.modelService.getDownloadState$(modelId);
  }

  isDownloaded(modelId: string): boolean {
    return this.modelService.isModelDownloaded(modelId);
  }

  isActive(modelId: string): boolean {
    return this.modelService.activeModelId() === modelId;
  }

  async useModel(modelId: string): Promise<void> {
    await this.modelService.setActiveModel(modelId);
    if (this.modelService.isModelDownloaded(modelId)) {
      await this.aiEngine.loadModel(modelId);
    } else {
      this.aiEngine.unloadCurrentModel();
    }
  }

  async download(model: AIModel): Promise<void> {
    try {
      await this.modelService.downloadModel(model);
    } catch (error: any) {
      const toast = await this.toastCtrl.create({ message: error?.message ?? 'Download failed', duration: 2200, color: 'danger' });
      await toast.present();
    }
  }

  async delete(modelId: string): Promise<void> {
    await this.modelService.deleteModel(modelId);
    this.aiEngine.invalidateModel(modelId);
  }

  formatBytes(bytes?: number): string {
    if (bytes === undefined || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  }
}


