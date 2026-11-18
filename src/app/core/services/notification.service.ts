import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly message = signal('');

  show(message: string): void {
    this.message.set(message);
    window.setTimeout(() => this.message.set(''), 3500);
  }
}
