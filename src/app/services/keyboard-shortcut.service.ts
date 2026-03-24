import { Injectable, signal } from '@angular/core';
import { AppView, FocusedPanel } from '../models/types';

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutService {
  readonly currentView = signal<AppView>('client');
  readonly focusedPanel = signal<FocusedPanel>(null);
  readonly showShortcutOverlay = signal(false);
  readonly newRfqRequested = signal(0);
  readonly acceptQuoteRequested = signal(0);
  readonly rejectQuoteRequested = signal(0);
  readonly quickQuoteRequested = signal(0);
  readonly focusAiInput = signal(0);
  readonly toggleAiChat = signal(0);
  readonly navigateDirection = signal<'up' | 'down' | null>(null);

  private blotterService?: { toggleExpanded(): void };

  init(): void {
    document.addEventListener('keydown', this.handleKey.bind(this));
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handleKey.bind(this));
  }

  setView(view: AppView): void { this.currentView.set(view); }

  registerBlotterService(svc: { toggleExpanded(): void }): void {
    this.blotterService = svc;
  }

  private handleKey(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement)?.tagName;
    const typingInInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (event.key === 'Escape') {
      this.showShortcutOverlay.set(false);
      this.focusedPanel.set(null);
      (document.activeElement as HTMLElement)?.blur();
      return;
    }

    if (typingInInput) return;

    switch (event.key) {
      case '1': this.focusedPanel.set('orderbook'); break;
      case '2': this.focusedPanel.set('rfq'); break;
      case '3': this.toggleAiChat.update(v => v + 1); break;
      case 'd': case 'D': this.currentView.set('dealer'); break;
      case 'c': case 'C': this.currentView.set('client'); break;
      case 't': case 'T': this.blotterService?.toggleExpanded(); break;
      case '?': this.showShortcutOverlay.update(v => !v); break;
      case 'n': case 'N':
        if (this.currentView() === 'client') {
          event.preventDefault();
          this.newRfqRequested.update(v => v + 1);
        }
        break;
      case 'q': case 'Q':
        if (this.currentView() === 'dealer') {
          event.preventDefault();
          this.quickQuoteRequested.update(v => v + 1);
        }
        break;
      case 'a': case 'A':
        if (this.currentView() === 'client') {
          event.preventDefault();
          this.acceptQuoteRequested.update(v => v + 1);
        }
        break;
      case 'r': case 'R':
        if (this.currentView() === 'client') {
          event.preventDefault();
          this.rejectQuoteRequested.update(v => v + 1);
        }
        break;
      case '/':
        event.preventDefault();
        this.toggleAiChat.update(v => v + 1);
        this.focusAiInput.update(v => v + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateDirection.set('up');
        setTimeout(() => this.navigateDirection.set(null), 50);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.navigateDirection.set('down');
        setTimeout(() => this.navigateDirection.set(null), 50);
        break;
    }
  }
}
