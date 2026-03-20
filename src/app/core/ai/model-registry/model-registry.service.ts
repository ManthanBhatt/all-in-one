import { Injectable } from '@angular/core';
import { AI_MODELS, AIModel } from './model-registry.data';

@Injectable({
  providedIn: 'root'
})
export class AIModelRegistryService {

  constructor() { }

  /**
   * Returns all curated AI models.
   */
  getAllModels(): AIModel[] {
    return AI_MODELS;
  }

  /**
   * Retrieves a model by its ID.
   */
  getModelById(id: string): AIModel | undefined {
    return AI_MODELS.find(m => m.id === id);
  }

  /**
   * Filters models by a specific tag.
   */
  filterByTag(tag: string): AIModel[] {
    return AI_MODELS.filter(m => m.tags.includes(tag));
  }
}
