import { Injectable } from '@angular/core';

import { EntityBase, Project, ProjectStatus } from '../../models/domain.models';
import { BaseRepository } from './base.repository';

export interface CreateProjectInput {
  name: string;
  client_id?: string | null;
  status?: ProjectStatus;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectsRepository extends BaseRepository<Project, CreateProjectInput> {
  protected override readonly table = 'projects' as const;

  protected override buildCreate(base: EntityBase, input: CreateProjectInput): Project {
    return {
      ...base,
      client_id: input.client_id ?? null,
      name: input.name,
      description: null,
      stack: null,
      repo_url: null,
      staging_url: null,
      production_url: null,
      status: input.status ?? 'planning',
      priority: 'medium',
      start_date: null,
      due_date: null,
    };
  }
}
