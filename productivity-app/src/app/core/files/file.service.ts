import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  async save(_name: string, _payload: Blob): Promise<void> {
    return Promise.resolve();
  }
}
