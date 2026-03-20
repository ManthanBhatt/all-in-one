import { Injectable, effect, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

import { SessionStore } from '../../auth/session.store';
import { ChatEntityPreview } from './chat-entity-preview.model';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionPerformed?: boolean;
  entityPreview?: ChatEntityPreview;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIChatService {
  private readonly STORAGE_KEY = 'ai_chat_sessions';
  private readonly sessionStore = inject(SessionStore);

  private readonly sessionsSubject = new BehaviorSubject<ChatSession[]>([]);
  private readonly activeSessionIdSubject = new BehaviorSubject<string | null>(null);

  constructor() {
    effect(() => {
      const userId = this.sessionStore.userId();
      if (!userId) {
        this.sessionsSubject.next([]);
        this.activeSessionIdSubject.next(null);
        return;
      }

      void this.loadSessions();
    });
  }

  get sessions$(): Observable<ChatSession[]> {
    return this.sessionsSubject.asObservable();
  }

  get activeSessionId$(): Observable<string | null> {
    return this.activeSessionIdSubject.asObservable();
  }

  async loadSessions(): Promise<void> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      this.sessionsSubject.next([]);
      return;
    }

    const allSessions = await localforage.getItem<ChatSession[]>(this.STORAGE_KEY) || [];
    const userSessions = allSessions
      .filter((session) => session.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    this.sessionsSubject.next(userSessions);

    const activeSessionId = this.activeSessionIdSubject.getValue();
    if (activeSessionId && !userSessions.some((session) => session.id === activeSessionId)) {
      this.activeSessionIdSubject.next(userSessions[0]?.id ?? null);
    }
  }

  async createSession(title = 'New Chat'): Promise<ChatSession> {
    const userId = this.sessionStore.userId();
    if (!userId) {
      throw new Error('User not logged in');
    }

    const newSession: ChatSession = {
      id: uuidv4(),
      userId,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allSessions = await localforage.getItem<ChatSession[]>(this.STORAGE_KEY) || [];
    await localforage.setItem(this.STORAGE_KEY, [newSession, ...allSessions]);
    await this.loadSessions();
    this.activeSessionIdSubject.next(newSession.id);

    return newSession;
  }

  async addMessage(sessionId: string, message: Omit<ChatMessage, 'timestamp'>): Promise<void> {
    const allSessions = await localforage.getItem<ChatSession[]>(this.STORAGE_KEY) || [];
    const sessionIndex = allSessions.findIndex((session) => session.id === sessionId);
    if (sessionIndex === -1) {
      return;
    }

    const fullMessage: ChatMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    allSessions[sessionIndex].messages.push(fullMessage);
    allSessions[sessionIndex].updatedAt = new Date().toISOString();

    const userMessages = allSessions[sessionIndex].messages.filter((entry) => entry.role === 'user');
    if (message.role === 'user' && userMessages.length === 1) {
      allSessions[sessionIndex].title = `${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}`;
    }

    await localforage.setItem(this.STORAGE_KEY, allSessions);
    await this.loadSessions();
  }

  async deleteSession(sessionId: string): Promise<void> {
    const allSessions = await localforage.getItem<ChatSession[]>(this.STORAGE_KEY) || [];
    const updated = allSessions.filter((session) => session.id !== sessionId);
    await localforage.setItem(this.STORAGE_KEY, updated);
    await this.loadSessions();

    if (this.activeSessionIdSubject.getValue() === sessionId) {
      this.activeSessionIdSubject.next(this.sessionsSubject.getValue()[0]?.id ?? null);
    }
  }

  setActiveSession(sessionId: string | null): void {
    this.activeSessionIdSubject.next(sessionId);
  }
}
