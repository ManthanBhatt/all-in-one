import { TestBed } from '@angular/core/testing';

import { Conflict } from './conflict';

describe('Conflict', () => {
  let service: Conflict;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Conflict);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
