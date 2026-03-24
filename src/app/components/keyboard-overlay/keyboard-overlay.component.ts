import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutService } from '../../services/keyboard-shortcut.service';
import { KEYBOARD_SHORTCUTS } from '../../models/mock-data';

@Component({
  selector: 'app-keyboard-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (show()) {
      <div class="overlay-backdrop" (click)="close()">
        <div class="overlay-panel" (click)="$event.stopPropagation()">
          <div class="overlay-header">
            <div class="overlay-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="6" width="20" height="13" rx="2"/>
                <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
              </svg>
              Keyboard Shortcuts
            </div>
            <button class="close-btn" (click)="close()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="overlay-body">
            @for (group of groups; track group.name) {
              <div class="shortcut-group">
                <div class="group-name">{{ group.name }}</div>
                @for (s of group.shortcuts; track s.key) {
                  <div class="shortcut-row" [class.context-dealer]="s.context === 'dealer'" [class.context-client]="s.context === 'client'">
                    <kbd>{{ s.key }}</kbd>
                    <span class="shortcut-desc">{{ s.description }}</span>
                    @if (s.context !== 'any') {
                      <span class="context-badge" [class]="s.context">{{ s.context }}</span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="overlay-footer">
            Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(8, 8, 8, 0.8);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fade-in 0.15s ease-out;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .overlay-panel {
      background: var(--bg-card);
      border: 1px solid rgba(226, 232, 240, 0.12);
      border-radius: 12px;
      width: 520px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(226, 232, 240, 0.06);
      animation: slide-up 0.2s ease-out;
    }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .overlay-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 12px;
      border-bottom: 1px solid var(--border);
    }

    .overlay-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .close-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 150ms;

      &:hover { background: var(--bg-elevated); color: var(--text-primary); }
    }

    .overlay-body {
      overflow-y: auto;
      padding: 16px 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .shortcut-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .group-name {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--accent);
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .shortcut-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 6px;
      border-radius: 4px;
      transition: background 100ms;

      &:hover { background: var(--bg-elevated); }

      kbd {
        min-width: 28px;
        text-align: center;
        flex-shrink: 0;
      }
    }

    .shortcut-desc {
      font-size: 12px;
      color: var(--text-secondary);
      flex: 1;
    }

    .context-badge {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.05em;
      padding: 1px 5px;
      border-radius: 3px;
      text-transform: uppercase;

      &.dealer {
        background: rgba(226, 232, 240, 0.08);
        color: var(--accent);
      }

      &.client {
        background: rgba(56, 189, 248, 0.12);
        color: var(--accent-cyan);
      }
    }

    .overlay-footer {
      padding: 10px 20px;
      border-top: 1px solid var(--border);
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `]
})
export class KeyboardOverlayComponent {
  private kbdSvc = inject(KeyboardShortcutService);
  readonly show = this.kbdSvc.showShortcutOverlay;

  readonly groups = this.buildGroups();

  close(): void { this.kbdSvc.showShortcutOverlay.set(false); }

  private buildGroups() {
    const groupMap = new Map<string, typeof KEYBOARD_SHORTCUTS>();
    KEYBOARD_SHORTCUTS.forEach(s => {
      if (!groupMap.has(s.group)) groupMap.set(s.group, []);
      groupMap.get(s.group)!.push(s);
    });
    return Array.from(groupMap.entries()).map(([name, shortcuts]) => ({ name, shortcuts }));
  }
}

// ─── Status Bar Component ─────────────────────────────────────
@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-bar">
      <!-- Left: panel context shortcuts -->
      <div class="status-left">
        @for (hint of contextHints(); track hint.key) {
          <div class="status-hint">
            <kbd>{{ hint.key }}</kbd>
            <span>{{ hint.desc }}</span>
          </div>
        }
      </div>

      <!-- Right: app info -->
      <div class="status-right">
        <span class="status-item view-indicator" [class.dealer]="isDealer()">
          {{ isDealer() ? 'DEALER' : 'CLIENT' }} VIEW
        </span>
        <span class="status-divider">|</span>
        <span class="status-item">
          <kbd>?</kbd> shortcuts
        </span>
        <span class="status-divider">|</span>
        <span class="status-item brand">CurveLab v1.0</span>
      </div>
    </div>
  `,
  styles: [`
    .status-bar {
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: rgba(8, 8, 8, 0.98);
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }

    .status-left, .status-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-hint {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-hint span {
      font-size: 11px;
      color: var(--text-muted);
    }

    .status-item {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .view-indicator {
      font-weight: 600;
      font-size: 10px;
      letter-spacing: 0.06em;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(56, 189, 248, 0.1);
      color: var(--accent-cyan);

      &.dealer {
        background: rgba(226, 232, 240, 0.07);
        color: var(--accent);
      }
    }

    .status-divider {
      color: var(--border);
      font-size: 12px;
    }

    .brand {
      color: var(--text-muted);
      font-size: 10px;
      letter-spacing: 0.05em;
    }
  `]
})
export class StatusBarComponent {
  private kbdSvc = inject(KeyboardShortcutService);
  readonly isDealer = computed(() => this.kbdSvc.currentView() === 'dealer');
  readonly focusedPanel = this.kbdSvc.focusedPanel;

  readonly contextHints = computed(() => {
    const panel = this.focusedPanel();
    const dealer = this.isDealer();

    const hints: { key: string; desc: string }[] = [];

    if (panel === 'orderbook') {
      hints.push({ key: '↑↓', desc: 'Navigate' });
      hints.push({ key: 'B', desc: 'Bid' });
      hints.push({ key: 'S', desc: 'Ask' });
    } else if (panel === 'rfq') {
      if (!dealer) {
        hints.push({ key: 'N', desc: 'New RFQ' });
        hints.push({ key: 'A', desc: 'Accept' });
        hints.push({ key: 'R', desc: 'Reject' });
      } else {
        hints.push({ key: 'Q', desc: 'Quote' });
      }
    } else if (panel === 'ai') {
      hints.push({ key: '/', desc: 'Focus input' });
    } else {
      hints.push({ key: '1 2 3', desc: 'Focus panel' });
      hints.push({ key: 'D / C', desc: 'Dealer / Client' });
      hints.push({ key: 'T', desc: 'Blotter' });
    }

    return hints;
  });
}
