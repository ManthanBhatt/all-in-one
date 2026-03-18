import { Injectable } from '@angular/core';
import localforage from 'localforage';

import { environment } from '../../../environments/environment';
import { EntityBase, EntityType } from '../models/domain.models';
import { entityTables, schemaVersion } from './migrations/initial-schema';

@Injectable({
  providedIn: 'root',
})
export class AppDatabaseService {
  private readonly storage = localforage.createInstance({
    name: environment.database.name,
    storeName: 'entities',
  });

  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const currentVersion = (await this.storage.getItem<number>('meta:version')) ?? 0;

    if (currentVersion < schemaVersion) {
      await Promise.all(entityTables.map((table) => this.ensureTable(table)));
      await this.storage.setItem('meta:version', schemaVersion);
    }

    this.initialized = true;
  }

  async list<T extends EntityBase>(table: EntityType): Promise<T[]> {
    await this.initialize();
    return (await this.storage.getItem<T[]>(`table:${table}`)) ?? [];
  }

  async getById<T extends EntityBase>(table: EntityType, id: string): Promise<T | null> {
    const records = await this.list<T>(table);
    return records.find((record) => record.id === id) ?? null;
  }

  async upsert<T extends EntityBase>(table: EntityType, record: T): Promise<T> {
    const records = await this.list<T>(table);
    const index = records.findIndex((item) => item.id === record.id);

    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }

    await this.storage.setItem(`table:${table}`, records);
    return record;
  }

  async bulkUpsert<T extends EntityBase>(table: EntityType, nextRecords: T[]): Promise<void> {
    const records = await this.list<T>(table);
    const byId = new Map(records.map((record) => [record.id, record] as const));

    nextRecords.forEach((record) => byId.set(record.id, record));
    await this.storage.setItem(`table:${table}`, [...byId.values()]);
  }

  async remove(table: EntityType, id: string): Promise<void> {
    const records = await this.list<EntityBase>(table);
    await this.storage.setItem(
      `table:${table}`,
      records.filter((record) => record.id !== id),
    );
  }

  async clearAll(): Promise<void> {
    await this.storage.clear();
    this.initialized = false;
    await this.initialize();
  }

  private async ensureTable(table: EntityType): Promise<void> {
    const existing = await this.storage.getItem(`table:${table}`);
    if (!existing) {
      await this.storage.setItem(`table:${table}`, []);
    }
  }
}
