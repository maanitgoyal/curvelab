# CurveLab

A fixed income electronic trading dashboard built with Angular 21 and TypeScript. Simulates a two-sided RFQ (Request for Quote) workflow, live order book, trade blotter, and an AI market analyst - modelled on platforms like Tradeweb and Bloomberg.

![Angular](https://img.shields.io/badge/Angular-21-red?logo=angular) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript) ![Tests](https://img.shields.io/badge/tests-58%20passing-brightgreen)

## Features

- **Live Order Book** - real-time bid/ask ladder with cumulative depth chart, price flash animations, and bond selector. Prices update every 0.5–1.5s via a simulated random-walk feed with mean reversion.
- **RFQ Workflow** - two-sided dealer/client flow. Clients submit requests; dealers quote prices with a countdown timer; clients accept or reject. Accepted RFQs auto-dismiss after 5 seconds.
- **Trade Blotter** - collapsible bottom panel showing all trades. Filterable by status, sortable by any column, with expandable row detail. Persisted to localStorage.
- **AI Analyst Chat** - floating chat widget with simulated fixed income analysis. Responds to queries about market conditions, yield curve shape, spread analysis, and trade review.
- **Keyboard Navigation** - full keyboard-first UX (`N` new RFQ, `A` accept, `R` reject, `Q` quick-quote, `1/2` panel focus, `D/C` view toggle, `?` shortcut overlay).
- **Resizable Panels** - drag handle between Order Book and RFQ panel.
- **Light/Dark Theme** - toggle in the top bar, persisted to localStorage.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Angular 21 (standalone components) |
| Language | TypeScript 5.9 |
| State | Angular Signals + RxJS BehaviorSubject |
| Styling | SCSS + Tailwind CSS v3 |
| Testing | Vitest |

## Getting Started

```bash
npm install
npm start        # http://localhost:4200
npm test         # run unit tests
npm run test:watch
npm run build
```

Requires Node 18+.

## Project Structure

```
src/app/
  components/
    order-book/           # Live bid/ask ladder + depth chart
    rfq-panel/            # RFQ workflow (client + dealer views)
    ai-panel/             # Floating chat widget
    trade-blotter/        # Collapsible trade history table
    top-bar/              # Header, view toggle, theme switch
    keyboard-overlay/     # Shortcut modal + status bar
  services/
    price-feed.service    # Simulated price stream (RxJS + Signals)
    rfq.service           # RFQ lifecycle + localStorage persistence
    trade-blotter.service # Trade list + filtering/sorting
    keyboard-shortcut.service
    theme.service
  models/
    types.ts              # Interfaces and type aliases
    mock-data.ts          # Bond data, price simulation, trade generation
  pipes/
    price-format.pipe     # Treasury 32nds, notional (M/B/K), time
```

## Tests

58 unit tests across pipes, data models, and services.

```
Test Files  4 passed (4)
Tests       58 passed (58)
```

Coverage:
- **Pipes** - treasury 32nds formatting, decimal precision, notional, time, null/NaN edge cases
- **Mock data** - price simulation bounds, tick-size snapping, order book structure, trade generation
- **TradeBlotterService** - add/filter/sort, toggle state, localStorage persistence
- **RfqService** - full lifecycle (create, quote, accept, reject, pass, expire), auto-removal timer, persistence

## Design Decisions

**Signals over NgRx** - app state is simple enough that Signals + BehaviorSubjects cover everything without a full store.

**Hand-rolled SVG depth chart** - no external charting library; keeps the bundle lean and the rendering logic explicit.

**localStorage persistence** - trades and RFQs survive page refresh. Pending RFQs loaded from a previous session are auto-expired.

**Simulated price feed** - random-walk with mean reversion and tick-size snapping, matching real bond market microstructure behaviour.

## What I Would Add Next

- WebSocket connection to a real market data feed
- Backend API for trade persistence and multi-user RFQ routing
- Component tests and E2E with Playwright
- Storybook for isolated component development
- Role-based auth to properly separate client and dealer sessions
