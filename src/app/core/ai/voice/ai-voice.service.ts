import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import {
  QueueStrategy,
  TextToSpeech,
  type SpeechSynthesisVoice as NativeTtsVoice,
} from '@capacitor-community/text-to-speech';
import { firstValueFrom } from 'rxjs';

import { AIActionService } from '../actions/ai-action.service';
import { AICapabilityService } from '../capabilities/ai-capability.service';
import { AIChatService } from '../chat/ai-chat.service';
import { ChatEntityPreview } from '../chat/chat-entity-preview.model';
import { AIWorkspaceContextService } from '../context/ai-workspace-context.service';
import { AIEngineService } from '../engine/ai-engine.service';
import { AIPromptService } from '../prompt/ai-prompt.service';
import { AIModelService } from '../../../features/ai-models/model.service';

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

@Injectable({
  providedIn: 'root',
})
export class AIVoiceService {
  private static readonly WAKE_MODE_KEY = 'app.ai.voice.wake-mode';
  private static readonly CONTINUOUS_MODE_KEY = 'app.ai.voice.continuous-mode';
  private static readonly WAKE_PATTERN = /\b(?:hey\s+)?jarvis\b[\s,.:;-]*/i;

  private readonly aiEngine = inject(AIEngineService);
  private readonly capabilityService = inject(AICapabilityService);
  private readonly promptService = inject(AIPromptService);
  private readonly actionService = inject(AIActionService);
  private readonly chatService = inject(AIChatService);
  private readonly workspaceContext = inject(AIWorkspaceContextService);
  private readonly modelService = inject(AIModelService);

  private recognition: SpeechRecognitionLike | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private nativeTtsVoices: NativeTtsVoice[] = [];
  private autoResumeHandle: ReturnType<typeof setTimeout> | null = null;
  private currentListeningMode: 'wake' | 'command' = 'command';
  private nativeListeners: PluginListenerHandle[] = [];
  private nativeListenersReady = false;
  private nativeTranscriptFinalized = false;

  readonly isNativePlatform = Capacitor.isNativePlatform();
  readonly isOpen = signal(false);
  readonly isListening = signal(false);
  readonly isProcessing = signal(false);
  readonly isSpeaking = signal(false);
  readonly isAwaitingWakeWord = signal(false);
  readonly isWakeModeEnabled = signal(this.readPersistedBoolean(AIVoiceService.WAKE_MODE_KEY, this.isNativePlatform));
  readonly isContinuousModeEnabled = signal(this.readPersistedBoolean(AIVoiceService.CONTINUOUS_MODE_KEY, this.isNativePlatform));
  readonly transcript = signal('');
  readonly response = signal('');
  readonly error = signal<string | null>(null);
  readonly entityPreview = signal<ChatEntityPreview | null>(null);

  readonly isNativeSpeechPreferred = this.isNativePlatform && Capacitor.isPluginAvailable('SpeechRecognition');
  readonly isNativeTtsPreferred = this.isNativePlatform && Capacitor.isPluginAvailable('TextToSpeech');

  readonly statusLabel = computed(() => {
    if (this.isProcessing()) return 'JARVIS is thinking';
    if (this.isSpeaking()) return 'JARVIS is replying';
    if (this.isListening() && this.isAwaitingWakeWord()) return 'Waiting for "Hey JARVIS"';
    if (this.isListening()) return 'Listening for your command';
    if (this.error()) return 'Needs attention';
    if (this.isWakeModeEnabled()) return 'Hands-free standby';
    return 'Voice standby';
  });

  constructor() {
    this.primeVoices();
  }

  open(): void {
    this.isOpen.set(true);
    this.error.set(null);
    void this.beginVoiceLoop();
  }

  close(): void {
    this.clearAutoResume();
    this.stopListening();
    void this.stopSpeaking();
    this.isOpen.set(false);
    this.error.set(null);
    this.isAwaitingWakeWord.set(false);
  }

  async toggle(): Promise<void> {
    if (!this.isOpen()) {
      this.open();
      return;
    }

    if (this.isListening()) {
      this.stopListening();
      return;
    }

    await this.beginVoiceLoop();
  }

  async startListening(mode: 'wake' | 'command' = 'command'): Promise<void> {
    this.clearAutoResume();
    this.error.set(null);
    this.entityPreview.set(null);
    this.currentListeningMode = mode;
    this.isAwaitingWakeWord.set(mode === 'wake');

    if (this.isNativeSpeechPreferred) {
      await this.startNativeListening(mode);
      return;
    }

    const SpeechRecognitionCtor = this.getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      this.error.set('Voice input is not available on this device/browser yet.');
      return;
    }

    this.ensureRecognition(SpeechRecognitionCtor);
    this.transcript.set('');
    this.response.set('');

    try {
      this.isListening.set(true);
      this.recognition?.start();
    } catch {
      this.isListening.set(false);
      this.error.set('Microphone could not start. Please try again.');
    }
  }

  stopListening(): void {
    this.isListening.set(false);
    if (this.isNativeSpeechPreferred) {
      void SpeechRecognition.stop();
      return;
    }

    this.recognition?.stop();
  }

  setWakeModeEnabled(enabled: boolean): void {
    this.isWakeModeEnabled.set(enabled);
    this.persistBoolean(AIVoiceService.WAKE_MODE_KEY, enabled);
    if (!enabled) {
      this.isAwaitingWakeWord.set(false);
    }
    if (this.isOpen()) {
      void this.beginVoiceLoop();
    }
  }

  setContinuousModeEnabled(enabled: boolean): void {
    this.isContinuousModeEnabled.set(enabled);
    this.persistBoolean(AIVoiceService.CONTINUOUS_MODE_KEY, enabled);
    if (this.isOpen()) {
      this.scheduleAutoResume(320);
    }
  }

  private ensureRecognition(SpeechRecognitionCtor: new () => SpeechRecognitionLike): void {
    if (this.recognition) {
      this.recognition.continuous = this.isContinuousModeEnabled() || this.isWakeModeEnabled();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = this.isContinuousModeEnabled() || this.isWakeModeEnabled();

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      this.transcript.set(transcript);
    };

    recognition.onerror = (event) => {
      this.isListening.set(false);
      this.error.set(event.error ? `Voice input error: ${event.error}` : 'Voice input failed.');
    };

    recognition.onend = () => {
      this.isListening.set(false);
      void this.handleListeningComplete(this.transcript().trim());
    };

    this.recognition = recognition;
  }

  private async startNativeListening(mode: 'wake' | 'command'): Promise<void> {
    this.error.set(null);
    this.response.set('');
    this.transcript.set('');
    this.nativeTranscriptFinalized = false;

    const permissionState = await SpeechRecognition.checkPermissions();
    if (permissionState.speechRecognition !== 'granted') {
      const requested = await SpeechRecognition.requestPermissions();
      if (requested.speechRecognition !== 'granted') {
        this.error.set('Microphone access is required for JARVIS voice mode.');
        return;
      }
    }

    const availability = await SpeechRecognition.available();
    if (!availability.available) {
      this.error.set('Native speech recognition is not available on this device.');
      return;
    }

    await this.ensureNativeListeners();

    try {
      this.isListening.set(true);
      await SpeechRecognition.start({
        language: 'en-US',
        maxResults: 1,
        partialResults: true,
        popup: false,
        allowForSilence: mode === 'wake' ? 2500 : 1400,
      });
    } catch (error: any) {
      this.isListening.set(false);
      this.error.set(error?.message ?? 'Microphone could not start. Please try again.');
    }
  }

  private async ensureNativeListeners(): Promise<void> {
    if (this.nativeListenersReady) {
      return;
    }

    this.nativeListeners.push(
      await SpeechRecognition.addListener('partialResults', (event) => {
        const text = event.matches?.[0]?.trim() ?? '';
        if (text) {
          this.transcript.set(text);
        }
      }),
    );

    this.nativeListeners.push(
      await SpeechRecognition.addListener('segmentResults', (event) => {
        const text = event.matches?.[0]?.trim() ?? '';
        if (text) {
          this.transcript.set(text);
        }
      }),
    );

    this.nativeListeners.push(
      await SpeechRecognition.addListener('listeningState', (event) => {
        const stopped = event.status === 'stopped';
        this.isListening.set(!stopped);
        if (stopped && !this.nativeTranscriptFinalized) {
          this.nativeTranscriptFinalized = true;
          void this.handleListeningComplete(this.transcript().trim());
        }
      }),
    );

    this.nativeListenersReady = true;
  }

  private async handleListeningComplete(rawText: string): Promise<void> {
    const spokenText = rawText.trim();
    if (!spokenText) {
      this.isAwaitingWakeWord.set(false);
      if (this.isOpen() && (this.isWakeModeEnabled() || this.isContinuousModeEnabled())) {
        this.scheduleAutoResume();
      }
      return;
    }

    if (this.currentListeningMode === 'wake') {
      const command = this.extractWakeCommand(spokenText);
      if (command === null) {
        if (this.isOpen() && this.isWakeModeEnabled()) {
          this.scheduleAutoResume();
        }
        return;
      }

      if (!command.trim()) {
        await this.speak('I am listening.');
        if (this.isOpen()) {
          this.scheduleAutoResume(180, 'command');
        }
        return;
      }

      await this.processTranscript(command.trim());
      return;
    }

    if (!this.isProcessing()) {
      await this.processTranscript(spokenText);
    }
  }

  private async processTranscript(text: string): Promise<void> {
    this.isProcessing.set(true);
    this.error.set(null);
    this.response.set('');

    try {
      await this.ensureModelReady();
      const activeSessionId = await this.ensureChatSession();
      await this.chatService.addMessage(activeSessionId, { role: 'user', content: text });

      const capabilities = this.capabilityService.getEnabledCapabilities();
      const workspaceSummary = await this.workspaceContext.buildContextSummary();
      await this.chatService.loadSessions();
      const sessions = await firstValueFrom(this.chatService.sessions$);
      const activeSession = sessions.find((session) => session.id === activeSessionId);
      const history = activeSession?.messages ?? [];
      const prompt = this.promptService.buildPrompt(text, capabilities, history, workspaceSummary);
      const rawResponse = await this.aiEngine.run(prompt);
      const safeResponse = this.aiEngine.ensureJsonSafety(rawResponse);
      const actionResult = await this.actionService.execute(safeResponse);

      let finalContent = 'Standing by.';
      try {
        const parsed = JSON.parse(safeResponse);
        finalContent = typeof parsed.response === 'string' && parsed.response.trim() ? parsed.response.trim() : finalContent;
      } catch {
        finalContent = rawResponse;
      }

      if (actionResult.error) {
        finalContent = `I hit a protocol issue. ${actionResult.error}`;
      }

      this.response.set(finalContent);
      this.entityPreview.set(actionResult.entityPreview ?? null);
      await this.chatService.addMessage(activeSessionId, {
        role: 'assistant',
        content: finalContent,
        actionPerformed: actionResult.actionPerformed,
        entityPreview: actionResult.entityPreview,
      });
      await this.speak(finalContent);
    } catch (error: any) {
      const message = error?.message ?? 'Voice assistant failed.';
      this.error.set(message);
      await this.speak(`I hit an issue. ${message}`);
    } finally {
      this.isProcessing.set(false);
      if (this.isOpen() && (this.isWakeModeEnabled() || this.isContinuousModeEnabled())) {
        this.scheduleAutoResume();
      }
    }
  }

  private async ensureModelReady(): Promise<void> {
    const preferredModelId = this.modelService.activeModelId() || 'tinyllama-1.1b';
    if (this.aiEngine.getCurrentModelId() === preferredModelId) {
      return;
    }

    await this.aiEngine.loadModel(preferredModelId);
  }

  private async ensureChatSession(): Promise<string> {
    const activeSessionId = await firstValueFrom(this.chatService.activeSessionId$);
    if (activeSessionId) {
      return activeSessionId;
    }

    const session = await this.chatService.createSession('Voice command');
    return session.id;
  }

  private async speak(text: string): Promise<void> {
    const spokenText = this.humanizeForSpeech(text);
    this.isSpeaking.set(true);

    if (this.isNativeTtsPreferred) {
      try {
        await this.speakNative(spokenText);
        return;
      } finally {
        this.isSpeaking.set(false);
      }
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeaking.set(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = 'en-US';
    utterance.pitch = 0.92;
    utterance.rate = 0.96;
    utterance.volume = 1;

    const preferredVoice = this.pickBestVoice();
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
      const voiceName = preferredVoice.name.toLowerCase();
      if (/davis|david|daniel|microsoft guy|google us english|aaron|james|ryan/.test(voiceName)) {
        utterance.pitch = 0.88;
        utterance.rate = 0.94;
      }
      if (/samantha|aria|zira|female/.test(voiceName)) {
        utterance.pitch = 0.82;
        utterance.rate = 0.93;
      }
    }

    await new Promise<void>((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
    this.isSpeaking.set(false);
  }

  private humanizeForSpeech(text: string): string {
    return text
      .replace(/JARVIS/gi, 'Jarvis')
      .replace(/Freelancer OS/gi, 'the workspace')
      .replace(/\bSir\b/gi, 'sir')
      .replace(/\bMa'am\b/gi, "ma'am")
      .replace(/([a-z])\.\s+([A-Z])/g, '$1. $2')
      .replace(/\n+/g, '. ')
      .replace(/:\s/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private async speakNative(text: string): Promise<void> {
    const voiceIndex = await this.pickBestNativeVoiceIndex();
    await TextToSpeech.stop().catch(() => undefined);
    await TextToSpeech.speak({
      text,
      lang: 'en-US',
      rate: 0.94,
      pitch: 0.86,
      volume: 1,
      voice: voiceIndex ?? undefined,
      queueStrategy: QueueStrategy.Flush,
    });
    await this.delay(this.estimateSpeechDurationMs(text, 0.94));
  }

  private pickBestVoice(): SpeechSynthesisVoice | null {
    const voices = this.availableVoices.length ? this.availableVoices : this.readVoices();
    if (!voices.length) {
      return null;
    }

    const rank = (voice: SpeechSynthesisVoice): number => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      let score = 0;

      if (voice.localService) score += 25;
      if (/(natural|neural|premium|enhanced|wavenet)/.test(name)) score += 30;
      if (/(davis|david|daniel|aaron|james|ryan|guy|google us english|microsoft david|microsoft guy)/.test(name)) score += 35;
      if (/(samantha|aria|zira|google uk english female|google us english)/.test(name)) score += 24;
      if (/en-us/.test(lang)) score += 18;
      if (/en-gb/.test(lang)) score += 14;
      if (/en-in/.test(lang)) score += 12;
      if (/male/.test(name)) score += 8;
      if (/female/.test(name)) score += 4;
      if (/compact|espeak/.test(name)) score -= 20;

      return score;
    };

    return [...voices].sort((a, b) => rank(b) - rank(a))[0] ?? null;
  }

  private async pickBestNativeVoiceIndex(): Promise<number | null> {
    if (!this.isNativeTtsPreferred) {
      return null;
    }

    if (!this.nativeTtsVoices.length) {
      const supported = await TextToSpeech.getSupportedVoices().catch(() => ({ voices: [] as NativeTtsVoice[] }));
      this.nativeTtsVoices = supported.voices ?? [];
    }

    if (!this.nativeTtsVoices.length) {
      return null;
    }

    const rank = (voice: NativeTtsVoice): number => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      let score = 0;

      if (voice.localService) score += 12;
      if (voice.default) score += 6;
      if (/en-us/.test(lang)) score += 18;
      if (/en-gb/.test(lang)) score += 14;
      if (/en-in/.test(lang)) score += 12;
      if (/(male|guy|davis|david|daniel|aaron|james|ryan|google us english|microsoft guy)/.test(name)) score += 30;
      if (/(natural|neural|premium|enhanced)/.test(name)) score += 16;
      if (/compact|espeak/.test(name)) score -= 20;

      return score;
    };

    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    this.nativeTtsVoices.forEach((voice, index) => {
      const score = rank(voice);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  private primeVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    this.availableVoices = this.readVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      this.availableVoices = this.readVoices();
    };
  }

  private readVoices(): SpeechSynthesisVoice[] {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
      ? window.speechSynthesis.getVoices()
      : [];
  }

  private getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return typeof ctor === 'function' ? ctor : null;
  }

  private async beginVoiceLoop(): Promise<void> {
    if (!this.isOpen()) {
      return;
    }

    await this.stopSpeaking();
    await this.startListening(this.isWakeModeEnabled() ? 'wake' : 'command');
  }

  private extractWakeCommand(text: string): string | null {
    if (!AIVoiceService.WAKE_PATTERN.test(text)) {
      return null;
    }

    return text.replace(AIVoiceService.WAKE_PATTERN, '').trim();
  }

  private scheduleAutoResume(delayMs = 460, mode?: 'wake' | 'command'): void {
    if (!this.isOpen()) {
      return;
    }

    this.clearAutoResume();
    this.autoResumeHandle = setTimeout(() => {
      this.autoResumeHandle = null;
      void this.startListening(mode ?? (this.isWakeModeEnabled() ? 'wake' : 'command'));
    }, delayMs);
  }

  private clearAutoResume(): void {
    if (this.autoResumeHandle) {
      clearTimeout(this.autoResumeHandle);
      this.autoResumeHandle = null;
    }
  }

  private async stopSpeaking(): Promise<void> {
    this.isSpeaking.set(false);

    if (this.isNativeTtsPreferred) {
      await TextToSpeech.stop().catch(() => undefined);
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private readPersistedBoolean(key: string, fallback: boolean): boolean {
    if (typeof localStorage === 'undefined') {
      return fallback;
    }

    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  }

  private persistBoolean(key: string, value: boolean): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, String(value));
  }

  private estimateSpeechDurationMs(text: string, rate: number): number {
    const wordCount = Math.max(1, text.split(/\s+/).length);
    const base = wordCount * 340;
    return Math.round(base / Math.max(rate, 0.75));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}



