import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule, IonContent, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  arrowBackOutline,
  checkmarkCircle,
  closeOutline,
  downloadOutline,
  hardwareChipOutline,
  send,
  sparklesOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { firstValueFrom, Observable, of } from 'rxjs';

import { AIActionService } from '../../core/ai/actions/ai-action.service';
import { AICapabilityService } from '../../core/ai/capabilities/ai-capability.service';
import { AIChatService, ChatMessage, ChatSession } from '../../core/ai/chat/ai-chat.service';
import { ChatEntityPreview } from '../../core/ai/chat/chat-entity-preview.model';
import { AIWorkspaceContextService } from '../../core/ai/context/ai-workspace-context.service';
import { EntityNavigationService } from '../../core/services/entity-navigation.service';
import { AIEngineService } from '../../core/ai/engine/ai-engine.service';
import { AIModel, AI_MODELS } from '../../core/ai/model-registry/model-registry.data';
import { AIModelRegistryService } from '../../core/ai/model-registry/model-registry.service';
import { AIPromptService } from '../../core/ai/prompt/ai-prompt.service';
import { AIModelService } from '../ai-models/model.service';
import { ModelDownloadState } from '../ai-models/model.types';

addIcons({
  sparklesOutline,
  hardwareChipOutline,
  send,
  arrowBackOutline,
  downloadOutline,
  checkmarkCircle,
  addOutline,
  timeOutline,
  trashOutline,
  closeOutline,
  alertCircleOutline,
});

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.page.html',
  styleUrls: ['./ai-assistant.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class AIAssistantPage implements OnInit {
  @ViewChild('content') content!: IonContent;

  private readonly aiEngine = inject(AIEngineService);
  private readonly capabilityService = inject(AICapabilityService);
  private readonly promptService = inject(AIPromptService);
  private readonly actionService = inject(AIActionService);
  private readonly modelService = inject(AIModelService);
  private readonly chatService = inject(AIChatService);
  private readonly toastCtrl = inject(ToastController);
  private readonly modelRegistry = inject(AIModelRegistryService);
  private readonly workspaceContext = inject(AIWorkspaceContextService);
  private readonly navigation = inject(EntityNavigationService);

  userInput = '';
  isLoading = false;
  isModelLoaded = false;
  isDownloaded = false;
  showHistory = false;
  showBrainSwitcher = false;

  sessions$: Observable<ChatSession[]> = this.chatService.sessions$;
  activeSessionId: string | null = null;
  activeMessages: ChatMessage[] = [];

  availableModels: AIModel[] = AI_MODELS;
  selectedModelId = '';

  readonly quickQuestions = [
    'Which projects are ongoing?',
    'What are my today tasks?',
    'Am I forgetting something?',
    'What is overdue right now?',
    'Create a reminder for tomorrow at 10 AM',
    'Create a task for the active project',
  ];

  downloadState$: Observable<ModelDownloadState> = of({ modelId: '', progress: 0, status: 'pending' });

  get overlayTitle(): string {
    if (!this.selectedModelId) return 'Select Neural Core';
    if (this.isLoading && !this.isDownloaded) return 'Downloading...';
    if (this.isLoading) return 'Initializing...';
    return this.isDownloaded ? 'Ready to Start' : 'Download Required';
  }

  get overlaySubtitle(): string {
    if (!this.selectedModelId) return 'Please choose a brain for JARVIS to begin operations.';
    const model = this.availableModels.find((entry) => entry.id === this.selectedModelId);
    if (this.isLoading && !this.isDownloaded) return `Fetching ${model?.name || 'model'} assets.`;
    if (this.isLoading) return 'Loading the assistant runtime.';
    return this.isDownloaded
      ? `${model?.name} is ready. Initialize to start.`
      : `Download ${model?.name} (${model?.sizeMB}MB) to enable the assistant.`;
  }

  async ngOnInit(): Promise<void> {
    const activeId = this.modelService.activeModelId();
    this.selectedModelId = activeId && this.availableModels.some((model) => model.id === activeId)
      ? activeId
      : this.availableModels[0]?.id ?? '';

    this.showBrainSwitcher = !this.selectedModelId;
    await this.checkCurrentModelState();
    await this.autoLoadIfReady();

    this.chatService.activeSessionId$.subscribe((id) => {
      this.activeSessionId = id;
      void this.loadActiveMessages();
    });

    const sessions = await firstValueFrom(this.sessions$);
    if (sessions.length === 0) {
      await this.createNewChat();
    } else if (!this.activeSessionId) {
      this.chatService.setActiveSession(sessions[0].id);
    }
  }

  private async checkCurrentModelState(): Promise<void> {
    if (!this.selectedModelId) {
      this.isModelLoaded = false;
      this.isDownloaded = false;
      this.downloadState$ = of({ modelId: '', progress: 0, status: 'pending' });
      return;
    }

    this.isModelLoaded = this.aiEngine.isModelLoaded(this.selectedModelId);
    this.isDownloaded = this.modelService.isModelDownloaded(this.selectedModelId);
    this.downloadState$ = this.modelService.getDownloadState$(this.selectedModelId);
  }

  async switchBrain(modelId: string): Promise<void> {
    this.selectedModelId = modelId;
    await this.modelService.setActiveModel(modelId);

    if (this.modelService.isModelDownloaded(modelId)) {
      await this.aiEngine.loadModel(modelId);
    } else if (this.aiEngine.getCurrentModelId() !== modelId) {
      this.aiEngine.unloadCurrentModel();
    }

    await this.checkCurrentModelState();
    this.showBrainSwitcher = false;
  }

  private async autoLoadIfReady(): Promise<void> {
    if (!this.selectedModelId) {
      return;
    }

    if (this.modelService.isModelDownloaded(this.selectedModelId) && !this.aiEngine.isModelLoaded(this.selectedModelId)) {
      try {
        await this.aiEngine.loadModel(this.selectedModelId);
      } catch {
      }
      await this.checkCurrentModelState();
    }
  }

  private async loadActiveMessages(): Promise<void> {
    if (!this.activeSessionId) {
      this.activeMessages = [];
      return;
    }

    const sessions = await firstValueFrom(this.sessions$);
    const active = sessions.find((session) => session.id === this.activeSessionId);
    this.activeMessages = active ? active.messages : [];
    this.scrollToBottom();
  }

  async createNewChat(): Promise<void> {
    const session = await this.chatService.createSession();
    this.activeSessionId = session.id;
    this.showHistory = false;
  }

  selectSession(id: string): void {
    this.chatService.setActiveSession(id);
    this.showHistory = false;
  }

  async deleteSession(event: Event, id: string): Promise<void> {
    event.stopPropagation();
    await this.chatService.deleteSession(id);
  }

  async initializeEngine(): Promise<void> {
    if (!this.selectedModelId) {
      this.showBrainSwitcher = true;
      return;
    }

    this.isLoading = true;
    try {
      if (!this.isDownloaded) {
        const model = this.modelRegistry.getModelById(this.selectedModelId);
        if (model) {
          await this.modelService.downloadModel(model);
          this.isDownloaded = true;
        }
      }

      await this.aiEngine.loadModel(this.selectedModelId);
      this.isModelLoaded = true;
      await this.checkCurrentModelState();

      if (this.activeSessionId && this.activeMessages.length === 0) {
        await this.chatService.addMessage(this.activeSessionId, {
          role: 'assistant',
          content: 'JARVIS is online, Sir. I can create records, list ongoing projects, show today\'s tasks, and flag anything urgent you may be forgetting.',
        });
        await this.loadActiveMessages();
      }
    } catch (error: any) {
      const toast = await this.toastCtrl.create({ message: `Error: ${error?.message ?? 'Initialization failed'}`, duration: 3000, color: 'danger' });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  quickCommand(command: string): void {
    this.userInput = command;
    void this.sendMessage();
  }

  async openEntityPreview(preview: ChatEntityPreview): Promise<void> {
    await this.navigation.navigateToTarget(preview);
  }

  async sendMessage(): Promise<void> {
    const text = this.userInput.trim();
    if (!text || !this.activeSessionId || !this.isModelLoaded || this.isLoading) {
      return;
    }

    this.userInput = '';
    await this.chatService.addMessage(this.activeSessionId, { role: 'user', content: text });
    await this.loadActiveMessages();
    this.isLoading = true;
    this.scrollToBottom();

    try {
      const capabilities = this.capabilityService.getEnabledCapabilities();
      const workspaceSummary = await this.workspaceContext.buildContextSummary();
      const prompt = this.promptService.buildPrompt(text, capabilities, this.activeMessages, workspaceSummary);
      const rawResponse = await this.aiEngine.run(prompt);
      const safeResponse = this.aiEngine.ensureJsonSafety(rawResponse);
      const actionResult = await this.actionService.execute(safeResponse);

      let finalContent = 'I am ready for the next instruction, Sir.';
      try {
        const parsed = JSON.parse(safeResponse);
        finalContent = typeof parsed.response === 'string' && parsed.response.trim() ? parsed.response.trim() : finalContent;
      } catch {
        finalContent = rawResponse;
      }

      if (actionResult.error) {
        finalContent = `I hit a protocol issue, Sir: ${actionResult.error}`;
      }

      await this.chatService.addMessage(this.activeSessionId, {
        role: 'assistant',
        content: finalContent,
        actionPerformed: actionResult.actionPerformed,
        entityPreview: actionResult.entityPreview,
      });
      await this.loadActiveMessages();
    } catch (error: any) {
      await this.chatService.addMessage(this.activeSessionId, {
        role: 'system',
        content: `Error: ${error?.message ?? 'Assistant failure'}`,
      });
      await this.loadActiveMessages();
    } finally {
      this.isLoading = false;
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.content) {
        void this.content.scrollToBottom(300);
      }
    }, 100);
  }

  formatBytes(bytes?: number): string {
    if (bytes === undefined || bytes === 0) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}





