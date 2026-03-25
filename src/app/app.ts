import { Component, OnInit, OnDestroy, inject, signal, effect, Injector, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopBarComponent } from './components/top-bar/top-bar.component';
import { OrderBookComponent } from './components/order-book/order-book.component';
import { RfqPanelComponent } from './components/rfq-panel/rfq-panel.component';
import { AiPanelComponent } from './components/ai-panel/ai-panel.component';
import { TradeBlotterComponent } from './components/trade-blotter/trade-blotter.component';
import { KeyboardOverlayComponent, StatusBarComponent } from './components/keyboard-overlay/keyboard-overlay.component';
import { KeyboardShortcutService } from './services/keyboard-shortcut.service';
import { TradeBlotterService } from './services/trade-blotter.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TopBarComponent,
    OrderBookComponent,
    RfqPanelComponent,
    AiPanelComponent,
    TradeBlotterComponent,
    KeyboardOverlayComponent,
    StatusBarComponent,
  ],
  template: `
    <div class="app-shell bg-mesh">

      <!-- Top Bar -->
      <app-top-bar></app-top-bar>

      <!-- Main Content Grid -->
      <div class="main-grid">

        <!-- Order Book Panel -->
        <div class="panel-wrapper" [style.width.px]="orderBookWidth">
          <app-order-book></app-order-book>
        </div>

        <!-- Resize Handle -->
        <div class="resize-handle"
             [class.dragging]="dragging"
             (mousedown)="startResize($event)"></div>

        <!-- RFQ Panel -->
        <div class="panel-wrapper rfq-panel-wrapper">
          <app-rfq-panel></app-rfq-panel>
        </div>
      </div>

      <!-- Trade Blotter -->
      <div class="blotter-container">
        <app-trade-blotter></app-trade-blotter>
      </div>

      <!-- Status Bar -->
      <app-status-bar></app-status-bar>

      <!-- Keyboard Overlay -->
      <app-keyboard-overlay></app-keyboard-overlay>

      <!-- Floating Chat Window -->
      @if (chatOpen()) {
        <div class="chat-backdrop" (click)="closeChat()"></div>
        <div class="chat-window glass-panel" [class.closing]="chatClosing()">
          <app-ai-panel></app-ai-panel>
        </div>
      }

      <!-- Chat FAB -->
      <button class="chat-fab" (click)="chatOpen() ? closeChat() : openChat()" [class.active]="chatOpen()" title="AI Analyst">
        @if (chatOpen()) {
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        } @else {
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        }
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .main-grid {
      display: flex;
      flex: 1;
      min-height: 0;
      padding: 8px 8px 4px;
      gap: 0;
      overflow: hidden;
    }

    .panel-wrapper {
      min-width: 240px;
      min-height: 0;
      overflow: hidden;
      flex-shrink: 0;
    }

    .rfq-panel-wrapper {
      flex: 1;
      min-width: 280px;
      flex-shrink: 1;
    }

    .blotter-container {
      padding: 0 8px 4px;
      flex-shrink: 0;
    }

    .chat-fab {
      position: fixed;
      bottom: 44px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--text-primary);
      border: none;
      color: var(--bg-deep);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 900;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      transition: transform 200ms ease, box-shadow 200ms ease;

      &:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0, 0, 0, 0.6); }
      &.active { background: var(--bg-elevated); color: var(--text-secondary); border: 1px solid var(--border); }
    }

    .chat-backdrop {
      position: fixed;
      inset: 0;
      z-index: 898;
    }

    .chat-window {
      position: fixed;
      bottom: 104px;
      right: 20px;
      width: 380px;
      height: 520px;
      z-index: 899;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(226, 232, 240, 0.06);
      animation: chat-open 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes chat-open {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes chat-close {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(12px) scale(0.96); }
    }

    .chat-window.closing {
      animation: chat-close 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
    }
  `]
})
export class App implements OnInit, OnDestroy {
  private kbdSvc = inject(KeyboardShortcutService);
  private blotterSvc = inject(TradeBlotterService);
  private injector = inject(Injector);

  orderBookWidth = 340;
  dragging = false;
  chatOpen = signal(false);
  chatClosing = signal(false);
  private dragStartX = 0;
  private dragStartWidth = 0;

  ngOnInit(): void {
    this.kbdSvc.init();
    this.kbdSvc.registerBlotterService(this.blotterSvc);
    effect(() => {
      const req = this.kbdSvc.toggleAiChat();
      if (req > 0) this.chatOpen() ? this.closeChat() : this.openChat();
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.kbdSvc.destroy();
  }

  openChat(): void {
    this.chatClosing.set(false);
    this.chatOpen.set(true);
  }

  closeChat(): void {
    this.chatClosing.set(true);
    setTimeout(() => {
      this.chatOpen.set(false);
      this.chatClosing.set(false);
    }, 200);
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.orderBookWidth;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragging) return;
    const delta = event.clientX - this.dragStartX;
    this.orderBookWidth = Math.max(240, Math.min(600, this.dragStartWidth + delta));
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.dragging = false;
  }
}
