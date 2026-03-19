import { Injectable } from '@angular/core';

import { Counter, EntityBase } from '../../models/domain.models';
import { BaseRepository } from './base.repository';

export interface CreateCounterInput {
  name: string;
  current_value: number;
  target_value?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class CountersRepository extends BaseRepository<Counter, CreateCounterInput> {
  protected override readonly table = 'counters' as const;

  protected override buildCreate(base: EntityBase, input: CreateCounterInput): Counter {
    return {
      ...base,
      name: input.name,
      current_value: input.current_value,
      target_value: input.target_value ?? null,
    };
  }
}
