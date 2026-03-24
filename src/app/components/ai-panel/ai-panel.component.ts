import {
  Component, OnInit, OnDestroy, signal, inject, computed, effect, Injector,
  ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeyboardShortcutService } from '../../services/keyboard-shortcut.service';
import { ChatMessage } from '../../models/types';
import { TimeFormatPipe } from '../../pipes/price-format.pipe';

// Simple inline markdown renderer (no external deps)
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^\| (.+) \|$/gm, (_, row) => {
      const cells = row.split(' | ');
      return '<tr>' + cells.map((c: string) => `<td>${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>)+/gs, (match) => `<table>${match}</table>`)
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)+/gs, (match) => `<ul>${match}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[htul])(.+)$/gm, (_, line) => line ? line : '')
    .replace(/^<\/p><p>$/gm, '')
    .trim();
}

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeFormatPipe],
  template: `
    <div class="ai-panel glass-panel"
         [class.panel-focused]="isFocused()"
         (click)="kbdSvc.focusedPanel.set('ai')">

      <!-- Header -->
      <div class="panel-header">
        <div class="header-left">
          <span class="ai-dot"></span>
          <span class="panel-label">AI ANALYST</span>
          <span class="sim-badge">SIMULATED</span>
        </div>
        <div class="api-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          Claude
        </div>
      </div>

      <!-- Messages -->
      <div class="messages-container" #messagesRef>
        @if (messages().length === 0) {
          <div class="welcome-state">
            <div class="welcome-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <p class="welcome-title">Fixed Income AI</p>
            <p class="welcome-sub">Ask anything about market data, spreads, or your trades</p>
            <div class="quick-chips">
              <button class="chip" (click)="runQuickAction('market')">Summarize market</button>
              <button class="chip" (click)="runQuickAction('spread')">Spread analysis</button>
              <button class="chip" (click)="runQuickAction('trade')">Review trades</button>
              <button class="chip" (click)="sendMessage('What is the current yield curve shape?')">Yield curve?</button>
              <button class="chip" (click)="sendMessage('Any notable duration risk in recent trades?')">Duration risk?</button>
            </div>
            <p class="welcome-hint">Responses are simulated for demo purposes.</p>
          </div>
        }

        @for (msg of messages(); track msg.id) {
          <div class="message" [class.user-msg]="msg.role === 'user'" [class.ai-msg]="msg.role === 'assistant'">
            @if (msg.role === 'assistant') {
              <div class="msg-avatar ai-avatar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
            }
            <div class="msg-content">
              @if (msg.isTyping) {
                <div class="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              } @else {
                <div class="msg-text md-content" [innerHTML]="renderMd(msg.content)"></div>
                <div class="msg-time font-mono">{{ msg.timestamp | timeFormat }}</div>
              }
            </div>
            @if (msg.role === 'user') {
              <div class="msg-avatar user-avatar">U</div>
            }
          </div>
        }
      </div>

      <!-- Input -->
      <div class="input-section">
        <div class="input-row">
          <textarea
            #inputRef
            class="tw-input ai-input"
            [(ngModel)]="inputText"
            placeholder="Ask anything about fixed income markets... (/)"
            rows="2"
            (keydown.enter)="onEnter($event)"
            [disabled]="isLoading()">
          </textarea>
          <button class="send-btn" (click)="onSend()" [disabled]="!inputText.trim() || isLoading()">
            @if (isLoading()) {
              <div class="loading-ring"></div>
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            }
          </button>
        </div>
        <div class="input-hint">
          <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for newline · <kbd>/</kbd> to focus
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .ai-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
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

    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ai-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ai-accent);
      box-shadow: 0 0 6px rgba(148, 163, 184, 0.4);
    }

    .sim-badge {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 1px 5px;
    }

    .panel-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      color: var(--text-muted);
    }

    .api-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 600;
      color: var(--ai-accent);
      background: rgba(148, 163, 184, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 3px;
      padding: 2px 6px;
    }

    .messages-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .welcome-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      text-align: center;
      padding: 20px;
    }

    .welcome-icon { color: var(--ai-accent); }

    .welcome-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .welcome-sub {
      font-size: 12px;
      color: var(--text-muted);
      max-width: 200px;
      line-height: 1.5;
    }

    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
      margin-top: 10px;
      max-width: 240px;
    }

    .chip {
      padding: 5px 10px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 20px;
      font-size: 11px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 150ms;
      font-family: inherit;

      &:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
        border-color: rgba(226, 232, 240, 0.2);
      }
    }

    .welcome-hint {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 8px;
    }

    .message {
      display: flex;
      gap: 8px;
      animation: slide-up 0.2s ease-out;

      &.user-msg {
        flex-direction: row-reverse;
      }
    }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .msg-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
      margin-top: 2px;

      &.ai-avatar {
        background: rgba(148, 163, 184, 0.15);
        color: var(--ai-accent);
        border: 1px solid rgba(148, 163, 184, 0.25);
      }

      &.user-avatar {
        background: rgba(226, 232, 240, 0.12);
        color: var(--accent);
        border: 1px solid rgba(226, 232, 240, 0.2);
      }
    }

    .msg-content {
      max-width: calc(100% - 36px);
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .user-msg .msg-content {
      align-items: flex-end;
    }

    .msg-text {
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.6;

      .user-msg & {
        background: rgba(226, 232, 240, 0.08);
        border: 1px solid rgba(226, 232, 240, 0.14);
        color: var(--text-primary);
        border-bottom-right-radius: 3px;
      }

      .ai-msg & {
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-bottom-left-radius: 3px;
      }
    }

    .msg-time {
      font-size: 9px;
      color: var(--text-muted);
      padding: 0 4px;
    }

    .input-section {
      border-top: 1px solid var(--border);
      padding: 10px 14px 12px;
      flex-shrink: 0;
    }

    .input-row {
      display: flex;
      gap: 6px;
      align-items: flex-end;
    }

    .ai-input {
      resize: none;
      font-size: 12px !important;
      line-height: 1.5;
      min-height: 48px;
    }

    .send-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ai-accent);
      border: none;
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 150ms;
      align-self: flex-end;

      &:hover:not(:disabled) {
        background: #7d8fa3;
        box-shadow: 0 0 12px rgba(148, 163, 184, 0.3);
        transform: scale(1.04);
      }

      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    .input-hint {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 5px;
      display: flex;
      gap: 4px;
      align-items: center;
      flex-wrap: wrap;
    }

    .loading-ring {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AiPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly kbdSvc = inject(KeyboardShortcutService);
  private injector = inject(Injector);

  @ViewChild('messagesRef') messagesRef?: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef') inputRef?: ElementRef<HTMLTextAreaElement>;

  readonly isFocused = computed(() => this.kbdSvc.focusedPanel() === 'ai');
  readonly messages = signal<ChatMessage[]>([]);
  readonly isLoading = signal(false);
  inputText = '';

  private msgId = 0;
  private shouldScroll = false;
  private effects: ReturnType<typeof effect>[] = [];

  ngOnInit(): void {
    this.effects.push(effect(() => {
      const req = this.kbdSvc.focusAiInput();
      if (req > 0) setTimeout(() => this.inputRef?.nativeElement.focus(), 50);
    }, { injector: this.injector }));
  }

  ngOnDestroy(): void {
    this.effects.forEach(e => e.destroy());
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  renderMd(text: string): string {
    return renderMarkdown(text);
  }

  onEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.onSend();
    }
  }

  onSend(): void {
    const text = this.inputText.trim();
    if (!text || this.isLoading()) return;
    this.sendMessage(text);
    this.inputText = '';
  }

  async sendMessage(text: string): Promise<void> {
    const userMsg: ChatMessage = {
      id: `msg-${++this.msgId}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const typingMsg: ChatMessage = {
      id: `msg-${++this.msgId}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isTyping: true,
    };

    this.messages.update(m => [...m, userMsg, typingMsg]);
    this.shouldScroll = true;
    this.isLoading.set(true);

    try {
      const response = await this.callClaude(text);
      this.messages.update(msgs =>
        msgs.map(m => m.id === typingMsg.id
          ? { ...m, content: response, isTyping: false, timestamp: Date.now() }
          : m
        )
      );
    } finally {
      this.isLoading.set(false);
      this.shouldScroll = true;
    }
  }

  runQuickAction(type: 'market' | 'spread' | 'trade'): void {
    const prompts = {
      market: 'Provide a concise market summary based on the current order book data and recent trades. Highlight the key price levels and any notable market conditions.',
      spread: 'Analyze the current bid-ask spreads across all bonds in the order book. Are spreads tight or wide relative to typical conditions? What does this indicate about market liquidity?',
      trade: 'Review the recent trade history and provide commentary. Are there any patterns, concentrations, or notable executions worth flagging?',
    };
    this.sendMessage(prompts[type]);
  }

  private async callClaude(message: string): Promise<string> {
    return this.getMockResponse(message);
  }

  private getMockResponse(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('market') || lower.includes('summary')) {
      return `**Market Summary**

UST 10Y trading at **98.734**, down **1.2bps** from open. Bid-ask spread tight at **~0.5bps**, indicating healthy liquidity.

Key levels:
- **Support**: 98.700 (prior session low)
- **Resistance**: 98.780 (200-day MA)

Treasury complex broadly offered on stronger-than-expected payrolls data. Duration demand muted ahead of next week's FOMC meeting.`;
    }
    if (lower.includes('spread')) {
      return `**Spread Analysis**

| Bond | Bid-Ask | vs 30d Avg | Liquidity |
| UST 10Y | 0.5bps | -0.1bps | Excellent |
| UK Gilt 10Y | 1.2bps | +0.3bps | Good |
| German Bund | 0.8bps | flat | Good |
| Corp (AAPL) | 3.5bps | +0.8bps | Fair |

**Key takeaway**: Govts remain liquid. Corporate spreads widening on credit concern - watch for further widening if risk-off tone persists.`;
    }
    if (lower.includes('trade') || lower.includes('review')) {
      return `**Trade Blotter Review**

Recent flow skewed **net long duration** (+$175M DV01 equiv.) with notable buying in the 10Y sector.

- 3 of last 5 trades were **buy-side** in gov't bonds
- **JPMorgan** and **Goldman** appear most active as counterparties
- Largest trade: 250M notional, no unusual concentrations

**Risk flag**: Long duration exposure vulnerable to a hawkish Fed surprise. Consider reviewing DV01 limits.`;
    }
    if (lower.includes('yield') || lower.includes('curve')) {
      return `**Yield Curve Analysis**

Current curve shape: **mildly inverted** at the front end, bear flattening in progress.

| Tenor | Yield | Change |
| 2Y | 4.625% | +2.1bps |
| 5Y | 4.410% | +1.4bps |
| 10Y | 4.312% | +0.8bps |
| 30Y | 4.480% | +0.3bps |

**2s10s spread**: -31bps. Inversion persisting as markets price in higher-for-longer Fed policy.`;
    }
    if (lower.includes('duration') || lower.includes('risk')) {
      return `**Duration Risk Assessment**

Portfolio DV01 estimate: **+$42,000/bp** net long.

- 10Y bucket most exposed (+$28K DV01)
- 30Y adds convexity risk given recent vol
- 2Y position largely hedged

**Scenario**: A +25bp parallel shift would cost approx. **$1.05M** mark-to-market. Within typical daily limits but elevated vs 30-day average.`;
    }
    return `**Fixed Income Insight**

Based on current order book and trade data: spreads are within normal ranges and liquidity appears adequate. The Treasury complex is showing a typical intraday range of 3-4 ticks.

Key observations:
- Mid prices stable, no flash moves detected
- Bid-ask depth healthy across the curve
- Recent trade flow balanced between buys and sells`;
  }

  private scrollToBottom(): void {
    if (this.messagesRef?.nativeElement) {
      const el = this.messagesRef.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
