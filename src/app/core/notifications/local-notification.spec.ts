import { TestBed } from '@angular/core/testing';

import { LocalNotification } from './local-notification';

describe('LocalNotification', () => {
  let service: LocalNotification;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalNotification);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
