import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutService } from '../../services/keyboard-shortcut.service';
import { PriceFeedService } from '../../services/price-feed.service';
import { ThemeService } from '../../services/theme.service';
import { AppView } from '../../models/types';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="top-bar">
      <div class="logo-section">
        <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="7" fill="#0f172a"/>
          <path d="M5 22 C8 22,11 10,16 10 C21 10,24 18,27 16" stroke="#e2e8f0" stroke-width="2" fill="none" stroke-linecap="round"/>
          <circle cx="27" cy="16" r="2" fill="#34d399"/>
        </svg>
        <span class="logo-text">Curve</span>
        <span class="logo-accent">Lab</span>
      </div>

      <div class="view-toggle" role="group">
        <div class="toggle-track">
          <div class="toggle-indicator" [class.dealer]="currentView() === 'dealer'"></div>
          <button class="toggle-btn" [class.active]="currentView() === 'client'"
                  (click)="setView('client')" title="Client view (C)">Client</button>
          <button class="toggle-btn" [class.active]="currentView() === 'dealer'"
                  (click)="setView('dealer')" title="Dealer view (D)">Dealer</button>
        </div>
      </div>

      <div class="right-section">
        <div class="market-status">
          <span class="pulse-dot"></span>
          <span class="status-text">Market Open</span>
        </div>

        <div class="update-counter" title="Price updates received">
          <span class="counter-label">UPD</span>
          <span class="counter-value font-mono">{{ tickCount() }}</span>
        </div>

        <div class="clock font-mono">{{ currentTime() }}</div>

        <button class="icon-btn" (click)="theme.toggle()" [title]="theme.isDark() ? 'Switch to light theme' : 'Switch to dark theme'">
          @if (theme.isDark()) {
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          } @else {
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          }
        </button>

        <button class="icon-btn" (click)="toggleShortcuts()" title="Keyboard shortcuts (?)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="6" width="20" height="13" rx="2"/>
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
          </svg>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .top-bar {
      height: 52px;
      display: flex;
      align-items: center;
      padding: 0 20px;
      background: var(--topbar-bg);
      border-bottom: 1px solid var(--border);
      gap: 20px;
      flex-shrink: 0;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }

    .logo-accent {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .view-toggle { margin: 0 auto; }

    .toggle-track {
      display: flex;
      align-items: center;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 3px;
      position: relative;
      gap: 2px;
    }

    .toggle-indicator {
      position: absolute;
      width: calc(50% - 5px);
      top: 3px;
      bottom: 3px;
      background: var(--accent);
      border-radius: 5px;
      transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(2px);

      &.dealer { transform: translateX(calc(100% + 4px)); }
    }

    .toggle-btn {
      position: relative;
      z-index: 1;
      padding: 5px 20px;
      border-radius: 5px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      background: transparent;
      border: none;
      color: var(--text-muted);
      transition: color 200ms;
      min-width: 72px;

      &.active { color: var(--accent-contrast); font-weight: 600; }
      &:hover:not(.active) { color: var(--text-secondary); }
    }

    .right-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .market-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(52, 211, 153, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.2);
      border-radius: 20px;
    }

    .status-text {
      font-size: 12px;
      color: var(--bid);
      font-weight: 500;
    }

    .update-counter {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .counter-label {
      font-size: 10px;
      color: var(--text-muted);
      letter-spacing: 0.08em;
    }

    .counter-value {
      font-size: 12px;
      color: var(--accent-cyan);
      min-width: 36px;
      text-align: right;
    }

    .clock {
      font-size: 14px;
      color: var(--text-secondary);
      letter-spacing: 0.05em;
      min-width: 80px;
      text-align: right;
    }

    .icon-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 150ms;

      &:hover {
        background: var(--bg-elevated);
        color: var(--text-primary);
        border-color: rgba(226, 232, 240, 0.25);
      }
    }
  `]
})
export class TopBarComponent implements OnInit, OnDestroy {
  private kbd = inject(KeyboardShortcutService);
  private priceFeed = inject(PriceFeedService);
  readonly theme = inject(ThemeService);

  readonly currentView = this.kbd.currentView;
  readonly tickCount = this.priceFeed.updateCountSignal;
  readonly currentTime = signal('');

  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.updateTime();
    this.clockInterval = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  private updateTime(): void {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    this.currentTime.set(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
  }

  setView(view: AppView): void { this.kbd.setView(view); }
  toggleShortcuts(): void { this.kbd.showShortcutOverlay.update(v => !v); }
}
