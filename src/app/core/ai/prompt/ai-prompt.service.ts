import { Injectable } from '@angular/core';

import { AICapability } from '../capabilities/ai-capability.service';
import { ChatMessage } from '../chat/ai-chat.service';

@Injectable({
  providedIn: 'root'
})
export class AIPromptService {
  buildPrompt(userInput: string, capabilities: AICapability[], history: ChatMessage[] = [], workspaceContext = ''): string {
    const capsJson = JSON.stringify(capabilities.map((capability) => ({
      name: capability.id,
      description: capability.description,
      parameters: capability.schema,
    })));

    const recentHistory = history
      .slice(-5)
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n');

    return `SYSTEM:
You are JARVIS, an offline-first AI assistant for Essentials.
Address the user as "Sir" or "Ma'am".

RULES:
1. Speak naturally.
2. Only trigger an action when the user clearly asks to create, update, delete, or start something.
3. If the user asks about current workspace status, use the workspace context instead of inventing data.
4. Output JSON only.

OUTPUT FORMAT:
{
  "response": "Your conversational reply here",
  "action": "capability_id_or_null",
  "data": { ... }
}

Available protocols:
${capsJson}

WORKSPACE CONTEXT:
${workspaceContext || 'No workspace context available.'}

${recentHistory ? 'RECENT HISTORY:\n' + recentHistory : ''}

USER: ${userInput}

FINAL CHECK: choose the most accurate action or null.
ASSISTANT:`;
  }

  buildCorrectionPrompt(invalidJson: string, error: string): string {
    return `Previous output was invalid JSON. Error: ${error}. Original output: ${invalidJson}`;
  }
}

