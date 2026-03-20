export interface AIModel {
  id: string;
  name: string;
  sizeMB: number;
  ramRequiredGB: number;
  description: string;
  downloadUrl: string;
  format: 'gguf';
  engine: 'llama.cpp';
  tags: string[];
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'tinyllama-1.1b',
    name: 'TinyLlama (Fast)',
    sizeMB: 669,
    ramRequiredGB: 1,
    description: 'Ultra-fast model for low-end devices.',
    downloadUrl: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    format: 'gguf',
    engine: 'llama.cpp',
    tags: ['fast', 'fallback']
  },
  {
    id: 'zephyr-3b',
    name: 'Zephyr 3B (Recommended)',
    sizeMB: 1700,
    ramRequiredGB: 4,
    description: 'Best balance of human-like conversation and performance.',
    downloadUrl: 'https://huggingface.co/TheBloke/stablelm-zephyr-3b-GGUF/resolve/main/stablelm-zephyr-3b.Q4_K_M.gguf',
    format: 'gguf',
    engine: 'llama.cpp',
    tags: ['chat', 'recommended']
  },
  {
    id: 'openhermes-2.5',
    name: 'OpenHermes 2.5 (Conversational)',
    sizeMB: 1800,
    ramRequiredGB: 4,
    description: 'More natural, friendly, human-like conversation style.',
    downloadUrl: 'https://huggingface.co/TheBloke/OpenHermes-2.5-Mistral-3B-GGUF/resolve/main/openhermes-2.5.Q4_K_M.gguf',
    format: 'gguf',
    engine: 'llama.cpp',
    tags: ['chat', 'personality']
  },
  {
    id: 'phi-2',
    name: 'Phi-2 (Task Intelligence)',
    sizeMB: 1600,
    ramRequiredGB: 3,
    description: 'Best for reasoning and structured outputs.',
    downloadUrl: 'https://huggingface.co/TheBloke/phi-2-orange-GGUF/resolve/main/phi-2-orange.Q4_K_M.gguf',
    format: 'gguf',
    engine: 'llama.cpp',
    tags: ['reasoning', 'structured']
  }
];
