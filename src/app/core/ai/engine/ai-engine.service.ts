import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';

import { AIModelService } from '../../../features/ai-models/model.service';
import { AIModel } from '../model-registry/model-registry.data';

@Injectable({
  providedIn: 'root'
})
export class AIEngineService {
  private readonly modelService = inject(AIModelService);
  private readonly isNative = Capacitor.isNativePlatform();

  private isLoaded = false;
  private currentModelId: string | null = null;

  async loadModel(modelId: string): Promise<boolean> {
    if (this.isLoaded && this.currentModelId === modelId) {
      return true;
    }

    const downloadedModels = await firstValueFrom(this.modelService.getDownloadedModels$());
    const isDownloaded = downloadedModels.some((model) => model.id === modelId);

    if (this.isNative && !isDownloaded) {
      throw new Error(`Model ${modelId} is not downloaded locally.`);
    }

    if (!this.isNative && !isDownloaded) {
      const webModel: AIModel = {
        id: modelId,
        name: modelId,
        sizeMB: 0,
        ramRequiredGB: 0,
        description: 'Web simulation model',
        downloadUrl: '',
        format: 'gguf',
        engine: 'llama.cpp',
        tags: ['web'],
      };
      await this.modelService.downloadModel(webModel);
    }

    await new Promise((resolve) => setTimeout(resolve, this.isNative ? 350 : 150));
    this.isLoaded = true;
    this.currentModelId = modelId;
    return true;
  }

  async run(prompt: string): Promise<string> {
    if (!this.isLoaded) {
      throw new Error('AI Engine not initialized.');
    }

    return this.mockInference(prompt);
  }

  private async mockInference(fullPrompt: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 450));

    const userText = this.extractUserText(fullPrompt);
    if (!userText) {
      return JSON.stringify({ response: 'I am online and ready, Sir.', action: null });
    }

    if (this.isWorkspaceQuestion(userText)) {
      return JSON.stringify({
        response: this.answerWorkspaceQuestion(fullPrompt, userText),
        action: null,
      });
    }

    if (this.isConversational(userText)) {
      return JSON.stringify({
        response: 'I am online and standing by, Sir. Tell me what you want created, updated, reviewed, or summarized from your workspace.',
        action: null,
      });
    }

    if (userText.includes('client')) {
      const name = this.extractSubject(userText, ['create client', 'add client', 'new client', 'client']);
      return JSON.stringify({ response: `Client profile "${name}" is ready, Sir.`, action: 'create_client', data: { name, company: name, email: this.buildEmailCandidate(name) } });
    }

    if (userText.includes('project')) {
      const name = this.extractSubject(userText, ['create project', 'add project', 'new project', 'project']);
      return JSON.stringify({ response: `Project "${name}" has been staged, Sir.`, action: 'create_project', data: { name, status: 'planning' } });
    }

    if (userText.includes('remind') || userText.includes('reminder')) {
      const { date, title } = this.parseTemporalData(userText, ['remind me to', 'set reminder for', 'add reminder', 'reminder']);
      return JSON.stringify({ response: `Reminder scheduled for ${date.toLocaleString()}, Sir.`, action: 'create_reminder', data: { title, datetime: date.toISOString() } });
    }

    if (userText.includes('task') || userText.includes('todo') || userText.includes('to-do')) {
      const title = this.extractSubject(userText, ['create task', 'add task', 'new task', 'todo', 'to-do', 'task']);
      return JSON.stringify({ response: `Task "${title}" has been queued, Sir.`, action: 'create_task', data: { title } });
    }

    if (userText.includes('counter')) {
      const name = this.extractSubject(userText, ['create counter', 'add counter', 'counter']);
      return JSON.stringify({ response: `Counter "${name}" is ready, Sir.`, action: 'create_counter', data: { name, current_value: 0 } });
    }

    if (userText.includes('invoice') || userText.includes('bill')) {
      return JSON.stringify({ response: 'Invoice draft prepared, Sir.', action: 'create_invoice', data: { invoice_number: `INV-${Date.now().toString().slice(-6)}`, due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } });
    }

    if (userText.includes('note') || userText.includes('write down') || userText.includes('capture')) {
      const content = this.extractSubject(userText, ['write down', 'capture', 'note']);
      return JSON.stringify({ response: 'Captured and archived, Sir.', action: 'create_note', data: { title: 'AI Note', content } });
    }

    if (userText.includes('timer') || userText.includes('track time') || userText.includes('start tracking')) {
      const description = this.extractSubject(userText, ['start timer for', 'track time for', 'start tracking', 'timer']);
      return JSON.stringify({ response: 'Timer initialized, Sir.', action: 'start_timer', data: { description } });
    }

    return JSON.stringify({
      response: 'I can help create clients, projects, tasks, reminders, notes, counters, invoices, and timers. I can also answer questions about ongoing projects, today\'s tasks, due reminders, and anything urgent you may be forgetting, Sir.',
      action: null,
    });
  }

  private extractUserText(fullPrompt: string): string {
    const userIndex = fullPrompt.lastIndexOf('USER:');
    if (userIndex === -1) {
      return fullPrompt.toLowerCase().trim();
    }

    return fullPrompt.substring(userIndex + 5).split('FINAL CHECK')[0].split('ASSISTANT:')[0].trim().toLowerCase();
  }

  private isWorkspaceQuestion(text: string): boolean {
    return [
      'how many',
      'status',
      'summary',
      'show me my',
      'what is in my workspace',
      'which projects are ongoing',
      'ongoing project',
      'today task',
      'today tasks',
      'what are my tasks today',
      'what are my today task',
      'am i forgetting something',
      'what am i forgetting',
      'anything urgent',
      'what is due',
      'what is overdue',
      'what should i focus on',
    ].some((phrase) => text.includes(phrase));
  }

  private answerWorkspaceQuestion(fullPrompt: string, text: string): string {
    const contextMatch = fullPrompt.match(/WORKSPACE CONTEXT:\n([\s\S]*?)(\n\nRECENT HISTORY:|\n\nUSER:)/);
    const context = contextMatch?.[1]?.trim() || 'No workspace context available.';
    const findLine = (prefix: string): string | null => context.split('\n').find((line) => line.startsWith(prefix)) ?? null;
    const today = findLine('Today:');

    if (text.includes('ongoing') && text.includes('project')) {
      return this.composeAnswer('Here are your ongoing projects, Sir.', [today, findLine('Ongoing projects:'), findLine('Projects due soon:')]);
    }

    if (text.includes('today') && text.includes('task')) {
      return this.composeAnswer('These are your tasks for today, Sir.', [today, findLine('Today tasks:'), findLine('Overdue tasks:')]);
    }

    if (text.includes('forgetting') || text.includes('urgent') || text.includes('focus')) {
      return this.composeAnswer('These are the items most likely to need your attention, Sir.', [
        today,
        findLine('Forgetting signals:'),
        findLine('Overdue tasks:'),
        findLine('Due reminders:'),
        findLine('Projects due soon:'),
        findLine('Overdue invoices:'),
      ]);
    }

    if (text.includes('reminder') || text.includes('due')) {
      return this.composeAnswer('Here is your reminder status, Sir.', [today, findLine('Today reminders:'), findLine('Due reminders:')]);
    }

    if (text.includes('task')) {
      return this.composeAnswer('Here is your current task overview, Sir.', [today, findLine('Tasks:'), findLine('Today tasks:'), findLine('Overdue tasks:')]);
    }

    if (text.includes('project')) {
      return this.composeAnswer('Here is your current project overview, Sir.', [today, findLine('Projects:'), findLine('Ongoing projects:'), findLine('Projects due soon:')]);
    }

    if (text.includes('client')) {
      return this.composeAnswer('Here is your client overview, Sir.', [today, findLine('Clients:'), findLine('Recent clients:')]);
    }

    if (text.includes('invoice')) {
      return this.composeAnswer('Here is your invoice overview, Sir.', [today, findLine('Invoices:'), findLine('Overdue invoices:'), findLine('Unpaid invoices:')]);
    }

    return `Here is the current workspace summary, Sir:\n${context}`;
  }

  private composeAnswer(lead: string, lines: Array<string | null>): string {
    const body = lines.filter((line): line is string => Boolean(line)).join('\n');
    return body ? `${lead}\n${body}` : `${lead}\nNo matching workspace data was found.`;
  }

  private isConversational(text: string): boolean {
    const normalized = text.trim();
    return ['hi', 'hello', 'hey', 'how are you', 'good morning', 'good evening'].includes(normalized);
  }

  private buildEmailCandidate(name: string): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
    return slug ? `${slug}@example.com` : 'client@example.com';
  }

  private extractSubject(text: string, triggers: string[]): string {
    let result = text;
    for (const trigger of triggers) {
      const index = result.indexOf(trigger);
      if (index !== -1) {
        result = result.substring(index + trigger.length);
        break;
      }
    }

    return result.replace(/[:]/g, '').trim() || 'Untitled';
  }

  private parseTemporalData(text: string, triggers: string[]): { date: Date; title: string } {
    let cleanText = text;
    for (const trigger of triggers) {
      cleanText = cleanText.replace(trigger, '');
    }

    const now = new Date();
    const targetDate = new Date(now.getTime() + 60 * 60 * 1000);

    if (cleanText.includes('tomorrow')) {
      targetDate.setDate(now.getDate() + 1);
      cleanText = cleanText.replace('tomorrow', '');
    }

    const timeMatch = cleanText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2] ?? '0');
      const suffix = timeMatch[3].toLowerCase();

      if (suffix === 'pm' && hours < 12) hours += 12;
      if (suffix === 'am' && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);
      cleanText = cleanText.replace(timeMatch[0], '');
    }

    return { date: targetDate, title: cleanText.replace(/[:]/g, '').trim() || 'Scheduled item' };
  }

  ensureJsonSafety(output: string): string {
    const trimmed = output.trim();
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }

    return JSON.stringify({ response: 'Protocol parsing error, Sir.', action: null });
  }

  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  isModelLoaded(modelId: string): boolean {
    return this.isLoaded && this.currentModelId === modelId;
  }

  unloadCurrentModel(): void {
    this.isLoaded = false;
    this.currentModelId = null;
  }

  invalidateModel(modelId: string): void {
    if (this.currentModelId === modelId) {
      this.unloadCurrentModel();
    }
  }
}

