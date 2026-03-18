import { TestBed } from '@angular/core/testing';

import { Connectivity } from './connectivity';

describe('Connectivity', () => {
  let service: Connectivity;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Connectivity);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
