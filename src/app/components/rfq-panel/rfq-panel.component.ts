import {
  Component, OnInit, OnDestroy, signal, inject, computed, effect, Injector
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RfqService } from '../../services/rfq.service';
import { KeyboardShortcutService } from '../../services/keyboard-shortcut.service';
import { PriceFeedService } from '../../services/price-feed.service';
import { RfqRequest, TradeDirection } from '../../models/types';
import { MOCK_BONDS } from '../../models/mock-data';
import { NotionalFormatPipe, TimeFormatPipe } from '../../pipes/price-format.pipe';

@Component({
  selector: 'app-rfq-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NotionalFormatPipe, TimeFormatPipe],
  template: `
    <div class="rfq-panel glass-panel"
         [class.panel-focused]="isFocused()"
         (click)="kbdSvc.focusedPanel.set('rfq')">

      <!-- Header -->
      <div class="panel-header">
        <span class="panel-label">RFQ Workflow</span>
        <div class="view-badge" [class.dealer]="isDealer()">
          {{ isDealer() ? 'Dealer' : 'Client' }}
        </div>
      </div>

      <!-- CLIENT VIEW -->
      @if (!isDealer()) {
        <div class="client-view view-enter">

          <!-- New RFQ Form -->
          @if (showNewRfq()) {
            <div class="new-rfq-form">
              <div class="form-title">New Request for Quote</div>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Bond</label>
                  <select class="tw-input" [(ngModel)]="newRfq.bondId">
                    @for (bond of bonds; track bond.id) {
                      <option [value]="bond.id">{{ bond.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Direction</label>
                  <div class="direction-toggle">
                    <button class="dir-btn" [class.buy-active]="newRfq.direction === 'buy'"
                            (click)="newRfq.direction = 'buy'">BUY</button>
                    <button class="dir-btn" [class.sell-active]="newRfq.direction === 'sell'"
                            (click)="newRfq.direction = 'sell'">SELL</button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Notional (AUD M)</label>
                  <select class="tw-input" [(ngModel)]="newRfq.notional">
                    @for (n of notionals; track n) {
                      <option [value]="n">{{ n >= 1000 ? (n/1000)+'B' : n+'M' }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn-primary" (click)="submitRfq()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  Send RFQ
                </button>
                <button class="btn-ghost" (click)="showNewRfq.set(false)">Cancel</button>
              </div>
            </div>
          }

          @if (!showNewRfq()) {
            <button class="new-rfq-btn" (click)="showNewRfq.set(true)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              New RFQ
              <kbd>N</kbd>
            </button>
          }

          <!-- Active RFQs -->
          <div class="rfq-section-label">
            Active requests
            <span class="rfq-count">{{ rfqSvc.allRfqs().length }}</span>
          </div>

          <div class="rfq-list">
            @for (rfq of rfqSvc.allRfqs(); track rfq.id) {
              <div class="rfq-card" [class]="'status-' + rfq.status">
                <div class="card-top">
                  <div class="card-bond">{{ rfq.bondName }}</div>
                  <div class="card-status-badge" [class]="'badge-' + rfq.status">
                    {{ rfq.status | uppercase }}
                  </div>
                </div>

                <div class="card-meta">
                  <span class="dir-chip" [class.buy]="rfq.direction === 'buy'" [class.sell]="rfq.direction === 'sell'">
                    {{ rfq.direction | uppercase }}
                  </span>
                  <span class="meta-item font-mono">{{ rfq.notional | notionalFormat }}</span>
                  <span class="meta-divider">·</span>
                  <span class="meta-item">{{ rfq.createdAt | timeFormat }}</span>
                </div>

                <!-- Timer (pending) -->
                @if (rfq.status === 'pending') {
                  <div class="timer-row">
                    <svg class="circular-timer" width="32" height="32" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="12" fill="none" stroke="var(--border)" stroke-width="2"/>
                      <circle cx="16" cy="16" r="12" fill="none" stroke="var(--accent)"
                              stroke-width="2" stroke-linecap="round"
                              [attr.stroke-dasharray]="75.4"
                              [attr.stroke-dashoffset]="75.4 * (1 - getTimerProgress(rfq))"/>
                    </svg>
                    <span class="timer-text font-mono">{{ getSecondsRemaining(rfq) }}s</span>
                    <span class="timer-label">awaiting dealer</span>
                  </div>
                }

                <!-- Quote received -->
                @if (rfq.status === 'quoted' && rfq.quotedPrice != null) {
                  <div class="quote-received">
                    <div class="quote-price-row">
                      <span class="quote-label">Quoted price</span>
                      <span class="quote-price font-mono tabular-nums">{{ rfq.quotedPrice | number:'1.3-3' }}</span>
                    </div>
                    <div class="quote-actions">
                      <button class="btn-success" (click)="acceptQuote(rfq.id)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        Accept <kbd>A</kbd>
                      </button>
                      <button class="btn-danger" (click)="rejectQuote(rfq.id)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        Reject <kbd>R</kbd>
                      </button>
                    </div>
                  </div>
                }

                <!-- Terminal states -->
                @if (rfq.status === 'accepted') {
                  <div class="terminal-status filled">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    Trade confirmed at {{ rfq.quotedPrice | number:'1.3-3' }}
                  </div>
                }
                @if (rfq.status === 'rejected') {
                  <div class="terminal-status rejected">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    Quote rejected
                  </div>
                }
                @if (rfq.status === 'expired') {
                  <div class="terminal-status expired">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    Expired, no dealer response
                  </div>
                }
              </div>
            } @empty {
              <div class="empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                <p>No active RFQs</p>
                <p class="empty-hint">Press <kbd>N</kbd> to request a quote</p>
              </div>
            }
          </div>
        </div>
      }

      <!-- DEALER VIEW -->
      @if (isDealer()) {
        <div class="dealer-view view-enter">
          <div class="rfq-section-label">
            Incoming requests
            <span class="rfq-count">{{ pendingRfqs().length }}</span>
          </div>

          <div class="rfq-list">
            @for (rfq of rfqSvc.allRfqs(); track rfq.id) {
              <div class="rfq-card dealer-card" [class]="'status-' + rfq.status"
                   [class.selected]="selectedDealerRfq() === rfq.id">

                <div class="card-top">
                  <div class="card-bond">{{ rfq.bondName }}</div>
                  <div class="card-status-badge" [class]="'badge-' + rfq.status">
                    {{ rfq.status | uppercase }}
                  </div>
                </div>

                <div class="card-meta">
                  <span class="dir-chip" [class.buy]="rfq.direction === 'buy'" [class.sell]="rfq.direction === 'sell'">
                    {{ rfq.direction === 'buy' ? 'CLIENT BUY' : 'CLIENT SELL' }}
                  </span>
                  <span class="meta-item font-mono">{{ rfq.notional | notionalFormat }}</span>
                </div>

                @if (rfq.status === 'pending') {
                  <div class="timer-row">
                    <svg class="circular-timer" width="28" height="28" viewBox="0 0 28 28">
                      <circle cx="14" cy="14" r="10" fill="none" stroke="var(--border)" stroke-width="2"/>
                      <circle cx="14" cy="14" r="10" fill="none"
                              [attr.stroke]="getSecondsRemaining(rfq) < 10 ? 'var(--ask)' : 'var(--accent)'"
                              stroke-width="2" stroke-linecap="round"
                              [attr.stroke-dasharray]="62.8"
                              [attr.stroke-dashoffset]="62.8 * (1 - getTimerProgress(rfq))"/>
                    </svg>
                    <span class="timer-text font-mono" [class.urgent]="getSecondsRemaining(rfq) < 10">
                      {{ getSecondsRemaining(rfq) }}s
                    </span>
                  </div>

                  <!-- Quote Input -->
                  <div class="dealer-quote-section">
                    <div class="mid-ref">
                      <span class="mid-ref-label">MID</span>
                      <span class="mid-ref-value font-mono">{{ getMidPrice(rfq.bondId) | number:'1.3-3' }}</span>
                    </div>
                    <div class="quote-input-row">
                      <button class="spread-adj" (click)="adjustPrice(rfq.id, -0.01)" title="Tighten">−</button>
                      <input class="tw-input price-input font-mono tabular-nums"
                             type="number"
                             step="0.001"
                             [value]="getDealerPrice(rfq.id) | number:'1.3-3'"
                             (input)="setDealerPrice(rfq.id, $event)"
                             (click)="selectedDealerRfq.set(rfq.id)">
                      <button class="spread-adj" (click)="adjustPrice(rfq.id, 0.01)" title="Widen">+</button>
                    </div>

                    <!-- P&L hover preview -->
                    <div class="pnl-row">
                      <span class="pnl-label">Est. P&L</span>
                      <span class="pnl-value font-mono" [class.positive]="getPnl(rfq) > 0" [class.negative]="getPnl(rfq) < 0">
                        {{ getPnl(rfq) >= 0 ? '+' : '' }}{{ getPnl(rfq) | number:'1.0-0' }} bps
                      </span>
                    </div>

                    <div class="dealer-actions">
                      <button class="btn-primary" (click)="submitDealerQuote(rfq.id)"
                              [disabled]="!getDealerPrice(rfq.id)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                        Quote <kbd>Q</kbd>
                      </button>
                      <button class="btn-ghost" (click)="rfqSvc.passRfq(rfq.id)">Pass</button>
                    </div>
                  </div>
                }

                @if (rfq.status === 'quoted') {
                  <div class="terminal-status filled">
                    Quoted at {{ rfq.quotedPrice | number:'1.3-3' }}, awaiting client
                  </div>
                }
                @if (rfq.status === 'accepted') {
                  <div class="terminal-status filled">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    Filled at {{ rfq.quotedPrice | number:'1.3-3' }}
                  </div>
                }
                @if (rfq.status === 'rejected' || rfq.status === 'passed' || rfq.status === 'expired') {
                  <div class="terminal-status rejected">
                    {{ rfq.status | titlecase }}
                  </div>
                }
              </div>
            } @empty {
              <div class="empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M3 3l1.664 1.664M6.28 6.28l11.44 11.44M10.584 10.584a2 2 0 002.832 2.832"/><path d="M9 9v.01M15 9v.01M9 15v.01M15 15v.01"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                <p>No incoming RFQs</p>
                <p class="empty-hint">Switch to Client view to send an RFQ</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .rfq-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .panel-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0;
      color: var(--text-secondary);
    }

    .view-badge {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(56, 189, 248, 0.1);
      color: var(--accent-cyan);
      border: 1px solid rgba(56, 189, 248, 0.2);

      &.dealer {
        background: rgba(226, 232, 240, 0.08);
        color: var(--accent);
        border-color: rgba(226, 232, 240, 0.15);
      }
    }

    .client-view, .dealer-view {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }

    .new-rfq-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 10px 14px 6px;
      padding: 8px 12px;
      background: rgba(226, 232, 240, 0.05);
      border: 1px dashed rgba(226, 232, 240, 0.2);
      border-radius: 6px;
      color: var(--accent);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms;
      flex-shrink: 0;

      kbd { margin-left: auto; }

      &:hover {
        background: rgba(226, 232, 240, 0.09);
        border-style: solid;
      }
    }

    .new-rfq-form {
      margin: 10px 14px 6px;
      padding: 12px;
      background: var(--bg-elevated);
      border: 1px solid rgba(226, 232, 240, 0.12);
      border-radius: 8px;
      flex-shrink: 0;
    }

    .form-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 10px;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0;
      color: var(--text-secondary);
    }

    .direction-toggle {
      display: flex;
      gap: 4px;
    }

    .dir-btn {
      flex: 1;
      padding: 6px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      color: var(--text-muted);
      transition: all 150ms;

      &.buy-active {
        background: rgba(52, 211, 153, 0.15);
        border-color: rgba(52, 211, 153, 0.4);
        color: var(--bid);
      }

      &.sell-active {
        background: rgba(248, 113, 113, 0.15);
        border-color: rgba(248, 113, 113, 0.4);
        color: var(--ask);
      }

      &:hover:not(.buy-active):not(.sell-active) {
        background: var(--bg-hover);
        color: var(--text-secondary);
      }
    }

    .form-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .rfq-section-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px 4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .rfq-count {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0 6px;
      font-size: 10px;
      color: var(--text-secondary);
    }

    .rfq-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 14px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rfq-card {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 11px 12px;
      animation: slide-up 0.25s ease-out;
      transition: border-color 150ms;

      &.status-quoted {
        border-color: rgba(251, 191, 36, 0.3);
        background: rgba(251, 191, 36, 0.04);
      }
      &.status-accepted {
        border-color: rgba(52, 211, 153, 0.2);
        background: rgba(52, 211, 153, 0.03);
      }
      &.status-rejected, &.status-expired, &.status-passed {
        opacity: 0.6;
      }
      &.selected {
        border-color: rgba(226, 232, 240, 0.3);
      }
    }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .card-bond {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .card-status-badge {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 2px 6px;
      border-radius: 3px;

      &.badge-pending { background: rgba(251, 191, 36, 0.15); color: var(--warn); }
      &.badge-quoted { background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); }
      &.badge-accepted { background: rgba(52, 211, 153, 0.15); color: var(--bid); }
      &.badge-rejected, &.badge-expired, &.badge-passed {
        background: rgba(248, 113, 113, 0.1);
        color: var(--ask);
      }
    }

    .card-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }

    .dir-chip {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 2px 6px;
      border-radius: 3px;

      &.buy { background: rgba(52, 211, 153, 0.12); color: var(--bid); }
      &.sell { background: rgba(248, 113, 113, 0.12); color: var(--ask); }
    }

    .meta-item {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .meta-divider {
      color: var(--text-muted);
    }

    .timer-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .timer-text {
      font-size: 13px;
      color: var(--text-secondary);
      &.urgent { color: var(--ask); }
    }

    .timer-label {
      font-size: 11px;
      color: var(--text-muted);
    }

    .quote-received {
      border-top: 1px solid rgba(251, 191, 36, 0.15);
      padding-top: 8px;
    }

    .quote-price-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 8px;
    }

    .quote-label {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0;
      color: var(--text-muted);
    }

    .quote-price {
      font-size: 20px;
      font-weight: 600;
      color: var(--warn);
      letter-spacing: -0.01em;
    }

    .quote-actions {
      display: flex;
      gap: 6px;
    }

    .terminal-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      padding: 5px 8px;
      border-radius: 4px;

      &.filled { color: var(--bid); background: rgba(52, 211, 153, 0.08); }
      &.rejected { color: var(--ask); background: rgba(248, 113, 113, 0.08); }
      &.expired { color: var(--text-muted); background: var(--bg-elevated); }
    }

    /* Dealer styles */
    .dealer-quote-section {
      border-top: 1px solid var(--border);
      padding-top: 8px;
    }

    .mid-ref {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .mid-ref-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .mid-ref-value {
      font-size: 12px;
      color: var(--accent-cyan);
    }

    .quote-input-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 6px;
    }

    .spread-adj {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-hover);
      border: 1px solid var(--border);
      border-radius: 5px;
      color: var(--text-secondary);
      font-size: 16px;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 100ms;
      line-height: 1;

      &:hover { background: var(--accent); color: var(--accent-contrast); border-color: var(--accent); }
      &:active { transform: scale(0.95); }
    }

    .price-input {
      text-align: center;
      font-size: 16px !important;
      font-weight: 600 !important;
      padding: 5px 8px !important;

      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        -webkit-appearance: none;
      }
    }

    .pnl-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding: 4px 6px;
      background: var(--bg-deep);
      border-radius: 4px;
    }

    .pnl-label {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .pnl-value {
      font-size: 12px;
      font-weight: 600;
      &.positive { color: var(--bid); }
      &.negative { color: var(--ask); }
    }

    .dealer-actions {
      display: flex;
      gap: 6px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 8px;
      color: var(--text-muted);
      font-size: 13px;
    }

    .empty-hint {
      font-size: 11px;
      color: var(--text-muted);
    }
  `]
})
export class RfqPanelComponent implements OnInit, OnDestroy {
  readonly rfqSvc = inject(RfqService);
  readonly kbdSvc = inject(KeyboardShortcutService);
  private injector = inject(Injector);
  readonly priceFeed = inject(PriceFeedService);

  readonly isFocused = computed(() => this.kbdSvc.focusedPanel() === 'rfq');
  readonly isDealer = computed(() => this.kbdSvc.currentView() === 'dealer');
  readonly pendingRfqs = this.rfqSvc.pendingRfqs;

  readonly bonds = MOCK_BONDS;
  readonly notionals = [5, 10, 25, 50, 100, 250, 500, 1000];

  readonly showNewRfq = signal(false);
  readonly selectedDealerRfq = signal<string | null>(null);

  newRfq = { bondId: 'UST10Y', direction: 'buy' as TradeDirection, notional: 25 };
  dealerPrices = new Map<string, number>();

  private intervals: ReturnType<typeof setInterval>[] = [];
  private effects: ReturnType<typeof effect>[] = [];

  ngOnInit(): void {
    const opts = { injector: this.injector };

    this.effects.push(effect(() => {
      const req = this.kbdSvc.newRfqRequested();
      if (req > 0 && !this.isDealer()) this.showNewRfq.set(true);
    }, opts));

    this.effects.push(effect(() => {
      const req = this.kbdSvc.acceptQuoteRequested();
      if (req > 0) {
        const quoted = this.rfqSvc.quotedRfqs()[0];
        if (quoted) this.rfqSvc.acceptQuote(quoted.id);
      }
    }, opts));

    this.effects.push(effect(() => {
      const req = this.kbdSvc.rejectQuoteRequested();
      if (req > 0) {
        const quoted = this.rfqSvc.quotedRfqs()[0];
        if (quoted) this.rfqSvc.rejectQuote(quoted.id);
      }
    }, opts));

    this.effects.push(effect(() => {
      const req = this.kbdSvc.quickQuoteRequested();
      if (req > 0 && this.isDealer()) {
        const pending = this.rfqSvc.pendingRfqs()[0];
        if (pending) this.submitDealerQuote(pending.id);
      }
    }, opts));

    // Timer refresh - force CD on interval for countdown timers
    const timer = setInterval(() => {}, 500);
    this.intervals.push(timer);
  }

  ngOnDestroy(): void {
    this.intervals.forEach(clearInterval);
    this.effects.forEach(e => e.destroy());
  }

  submitRfq(): void {
    this.rfqSvc.createRfq(this.newRfq.bondId, this.newRfq.direction, this.newRfq.notional);
    this.showNewRfq.set(false);
  }

  acceptQuote(rfqId: string): void { this.rfqSvc.acceptQuote(rfqId); }
  rejectQuote(rfqId: string): void { this.rfqSvc.rejectQuote(rfqId); }

  getSecondsRemaining(rfq: RfqRequest): number {
    return this.rfqSvc.getSecondsRemaining(rfq);
  }

  getTimerProgress(rfq: RfqRequest): number {
    return this.rfqSvc.getTimerProgress(rfq);
  }

  getMidPrice(bondId: string): number {
    return this.rfqSvc.getMidPrice(bondId);
  }

  getDealerPrice(rfqId: string): number {
    if (!this.dealerPrices.has(rfqId)) {
      const rfq = this.rfqSvc.allRfqs().find(r => r.id === rfqId);
      if (rfq) {
        const mid = this.rfqSvc.getMidPrice(rfq.bondId);
        // Add spread: buy = ask (slightly above mid), sell = bid (slightly below mid)
        const spread = rfq.direction === 'buy' ? 0.02 : -0.02;
        this.dealerPrices.set(rfqId, Math.round((mid + spread) * 1000) / 1000);
      }
    }
    return this.dealerPrices.get(rfqId) ?? 100;
  }

  setDealerPrice(rfqId: string, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) this.dealerPrices.set(rfqId, val);
  }

  adjustPrice(rfqId: string, delta: number): void {
    const current = this.getDealerPrice(rfqId);
    this.dealerPrices.set(rfqId, Math.round((current + delta) * 1000) / 1000);
  }

  getPnl(rfq: RfqRequest): number {
    const quotedPrice = this.getDealerPrice(rfq.id);
    const mid = this.rfqSvc.getMidPrice(rfq.bondId);
    // P&L in bps: (quoted - mid) * notional * 10 (simplified)
    const bps = rfq.direction === 'buy'
      ? (quotedPrice - mid) * 10000 / mid
      : (mid - quotedPrice) * 10000 / mid;
    return Math.round(bps * 10) / 10;
  }

  submitDealerQuote(rfqId: string): void {
    const price = this.getDealerPrice(rfqId);
    this.rfqSvc.submitQuote(rfqId, price);
  }
}
