import { TestBed } from '@angular/core/testing';

import { AppDatabase } from './app-database';

describe('AppDatabase', () => {
  let service: AppDatabase;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppDatabase);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
