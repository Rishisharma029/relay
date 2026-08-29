<div align="center">

<img src="https://img.shields.io/badge/RELAY-AI%20Voice%20Operations-0066FF?style=for-the-badge&labelColor=0a0a0a" />

# RELAY

### Real-Time AI-Powered Voice Operations Platform

*The AI that runs customer calls — with live transcription, autonomous tool calling, human takeover, and an irreversible financial approval gate.*

[![Live Demo](https://img.shields.io/badge/LIVE%20DEMO-rishisharma029.github.io%2Frelay-0066FF?style=for-the-badge&logo=githubpages&logoColor=white)](https://rishisharma029.github.io/relay/)

[![Build](https://img.shields.io/badge/build-passing-22c55e?style=flat-square)](https://github.com/Rishisharma029/relay)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Agora](https://img.shields.io/badge/Agora-v2.8-0066ff?style=flat-square)](https://www.agora.io/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](./LICENSE)

</div>

---

## ⚡ Live Demo & 6 Evaluator Scenarios

👉 **Live URL:** [https://rishisharma029.github.io/relay/](https://rishisharma029.github.io/relay/)

RELAY includes **6 interactive end-to-end evaluator scenarios** with turn-by-turn spoken dialogue, real-time ASR/TTS, autonomous tool calling, policy evaluation, and financial action approvals. Access them directly via the top **`⚡ SCENARIOS`** strip or by pressing **`Alt+D`**:

| # | Scenario | Case ID | Language | Key Feature Demonstrated |
|---|---|---|---|---|
| **1** | **Delivery Refund** | `RLY-1042` | Hindi | Order #84921 delayed 3 days → `getOrderStatus()` → 5-point policy check → Operator Approval for ₹1,499 instant UPI refund. |
| **2** | **Payment Failure** | `RLY-1039` | English | Double debit dispute → `reconcilePaymentGateway()` → Auto-reversal & ledger credit of duplicate ₹2,499. |
| **3** | **Language Switch** | `RLY-1044` | Hinglish → Hindi | Mid-call dynamic language switch with zero session reload → Shipment reroute to Noida Sector 62. |
| **4** | **Human Takeover** | `RLY-1038` | English | Enterprise contract cancellation → Automatic high-risk escalation → Live Maya Sharma takeover & handoff brief. |
| **5** | **Tool Failure** | `RLY-1037` | Hindi | Carrier tracking 504 Gateway Timeout → Graceful error boundary → Exponential backoff retry & manual trace fallback. |
| **6** | **Angry Customer** | `RLY-1031` | Hindi / Hinglish | Hostile customer with 3 delayed orders → `getCustomerOrderHistory()` → Retention apology credit ₹1,000 approval. |

Each scenario plays out **turn-by-turn with realistic speak-then-reply pacing**, voice synthesis matching the active agent gender (`♀ Female` / `♂ Male`), and includes `[ 🔄 REPLAY ]` and `[ ⏭ SKIP TO END ]` playback controls.

---

## What is RELAY?

RELAY is a production-oriented AI voice operations platform. A customer calls. RELAY joins the call as an AI agent — it listens, understands intent, calls backend tools autonomously, proposes financial actions, routes them through a policy + human approval gate, and responds in the customer's language — all in real time, without dropping audio.

Operators watch the entire session live. They can take over the call at any point, approve or decline actions, inspect every event, and replay the full call timeline deterministically.

```
Customer calls
    │
    ▼
AGORA RTC  ─────── 48kHz WebRTC audio, hardware AEC/ANS/AGC
    │
    ▼
RELAY AI AGENT  ── ASR → LLM → Tool Calling → LLM → TTS
    │                        ↓
    │                   5-Point Policy Gate
    │                        ↓
    │                   Human Approval
    │                        ↓
    ▼                   Idempotent Execution
Operator Workstation
    │
    ▼
Full Event Replay  ── Every action reconstructible at any timestamp
```

---

## Final RELAY Architecture

```
                         ┌────────────────────┐
                         │      FRONTEND      │
                         │ React / Vite / TS  │
                         └─────────┬──────────┘
                                   │
                         WebSocket / RTM
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────┐
│                         RELAY CORE                            │
│                                                               │
│ Case State       Event Bus       Policy Engine                │
│ Memory            Tool Router    Approval Engine              │
│                                                               │
└───────┬──────────────┬──────────────┬──────────────┬─────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
     AGORA           LLM            TOOLS        DATABASE
      RTC             │              │              │
       │              │              │              │
       ▼              ▼              ▼              ▼
    Voice          Reasoning     Actions       Persistence
       │
       ▼
  Customer / Human
```

---

## Complete User Journey

```
CUSTOMER SPEAKS
       ↓
AGORA (WebRTC 48kHz Opus Duplex)
       ↓
ASR (Streaming Multilingual Deepgram Nova-2)
       ↓
CONVERSATION ENGINE (Language Shift + Intent Detection)
       ↓
CASE STATE (3-Tier Memory Context: Turn, Case, Customer)
       ↓
REASON (LLM Function Intent & Schema Evaluation)
       ↓
TOOL CALL (Deterministic Tool Router with Retry & Timeout)
       ↓
POLICY (Knowledge Layer: Refund Policy v3.2 Section 4.1 Evaluation)
       ↓
HUMAN APPROVAL (Single-Click Governance Gate with Policy Re-check)
       ↓
ACTION (NPCI Instant UPI / BlueDart Logistics RPC Execution)
       ↓
EVENT (Append-Only relay_events Monotonic Sequence)
       ↓
CASE STATE UPDATE (Pure Reducer State Transition)
       ↓
TTS (Streaming Neural Voice Synthesis)
       ↓
AGORA (Low Latency Duplex Voice Track)
       ↓
CUSTOMER HEARS RESULT
```

### Agent Turn Pipeline

```
Customer speaks
       │
       ▼
   ASR (Agora / Deepgram)
       │
       ▼
   Language Detection ──── hi-IN / en-IN (zero-reload switch)
       │
       ▼
   LLM Intent (8s timeout → LLM_TIMEOUT → canned response)
       │
       ├── delivery_issue  ──► lookupOrder()    ──┐
       └── refund_request  ──► evaluateRefundPolicy() ──┤
                                                  │
                               Tool Engine (5s timeout, 3 retries, backoff)
                                                  │
                               ┌── success ──► LLM synthesizes response
                               └── fail ───► TOOL_TIMEOUT → escalation_required → Human Takeover
       │
       ▼
   TTS (ElevenLabs / Agora)
       │
       ▼
   Customer hears answer
```

### Financial Action Security (6 Gates)

```
Operator clicks [ APPROVE ]
         │
         ▼
[Gate 1] Operator ID ∈ AUTHORIZED_OPERATORS?  ──── No ──► 403 UNAUTHORIZED
         │ Yes
         ▼
[Gate 2] record.caseId === requestedCaseId?   ──── No ──► 403 CASE_MISMATCH
         │ Yes
         ▼
[Gate 3] record.status === 'PENDING'?         ──── No ──► 409 ALREADY_PROCESSED
         │ Yes
         ▼
[Gate 4] age < APPROVAL_EXPIRY_MS (10 min)?   ──── No ──► 410 APPROVAL_EXPIRED
         │ Yes
         ▼
[Gate 5] idempotency key exists?              ──── Yes ──► Return existing result
         │ No (first time)                               (no duplicate charge)
         ▼
[Gate 6] Policy re-evaluation (second check)  ──── Fail ──► Policy violation error
         │ Pass
         ▼
    Execute refund
         │
         ▼
    Register idempotency key: refund:<caseId>:<orderId>
         │
         ▼
    Emit action.completed RelayEvent
```

### Human Takeover State Machine

```
       AI_ACTIVE
           │
           │  Operator presses [ TAKE OVER ]
           ▼
    TAKEOVER_REQUESTED  ── AI audio muted, operator mic priority
           │
           │  Audio bridge confirmed
           ▼
      HUMAN_ACTIVE  ── Operator live on line, AI in silent shadow mode
           │
           │  Operator presses [ RETURN TO AI ]
           ▼
     RETURN_REQUESTED  ── Operator audio muted, AI re-initialized
           │
           │  AI agent resumed
           ▼
       AI_ACTIVE

Every transition emits a RelayEvent:
{
  type:      "human.takeover",
  operatorId: "OP-782",
  state:      "HUMAN_ACTIVE",
  reason:     "Operator initiated priority takeover",
  timestamp:  "21:34:40"
}
```

### Failure Handling — 12 Deterministic States

```
┌──────────────────────┬──────────┬─────────────┬──────────────────────┐
│ Failure State        │ Retry?   │ Max Attempts │ Fallback             │
├──────────────────────┼──────────┼─────────────┼──────────────────────┤
│ AGORA_DISCONNECT     │ Yes      │ 3            │ human.escalation     │
│ AGENT_DISCONNECT     │ Yes      │ 2            │ human.escalation     │
│ ASR_FAILURE          │ Yes      │ 2            │ ask_repeat           │
│ TTS_FAILURE          │ Yes      │ 2            │ text_only_mode       │
│ LLM_TIMEOUT          │ Yes      │ 2            │ canned_response      │
│ TOOL_TIMEOUT         │ Yes      │ 3            │ human.escalation     │
│ DB_UNAVAILABLE       │ Yes      │ 3            │ read_only_mode       │
│ APPROVAL_EXPIRED     │ No       │ —            │ recreate_approval    │
│ APPROVAL_DUPLICATE   │ No       │ —            │ return_existing      │
│ CUSTOMER_DISCONNECT  │ No       │ —            │ hold_preserve_case   │
│ HUMAN_DISCONNECT     │ No       │ —            │ return_to_ai         │
│ TOKEN_EXPIRED        │ Yes      │ 1            │ hot_swap_token       │
└──────────────────────┴──────────┴─────────────┴──────────────────────┘

Every failure:
  1. Classifies into a named state (no silent errors)
  2. Emits a typed failure.* RelayEvent
  3. Displays a FailureStateBanner in the operator UI
  4. Follows its recovery plan automatically
  5. Escalates to human if all retries are exhausted
```

### Event Replay

```
CASE RLY-1042
─────────────────────────────────────────────────────────────
00:00  call.started
00:02  speech.transcript  [CUSTOMER]  "Mera order 5 din se nahi aaya"
00:04  tool.started       lookupOrder { orderId: "84921" }
00:04  tool.completed     184ms
00:06  speech.transcript  [RELAY]     "I'll check that for you..."
00:12  language.changed   hi-IN → en-IN
00:18  tool.started       evaluateRefundPolicy
00:20  approval.created   ₹1,499 · MEDIUM risk
00:42  approval.approved  OP-782 · policy re-eval passed
00:43  action.completed   RF-84290 · NPCI SETTLED
01:22  call.ended
─────────────────────────────────────────────────────────────
[ ◀◀ ] [ ▶ ] [ ▶▶ ]   ●──────────────────○   1x / 2x / 4x

Scrubbing to any point reconstructs:
  • Case status at that moment
  • Facts verified so far
  • Active action and its state
  • Language in use
  • Operator assignment
```

---

## Features

| Feature | Status |
|---|---|
| Real-time WebRTC voice (Agora RTC v4.24) | ✅ |
| Agora Conversational AI v2.8 integration | ✅ |
| RTC token hot-swap (no call drop on expiry) | ✅ |
| Bilingual ASR/TTS (Hindi ↔ English, zero reload) | ✅ |
| Autonomous LLM → Tool Calling pipeline | ✅ |
| 5-point policy engine | ✅ |
| 6-gate financial approval security model | ✅ |
| Idempotent financial actions | ✅ |
| Human takeover FSM (4 states) | ✅ |
| 12-state deterministic failure engine | ✅ |
| Per-tool timeout + exponential backoff retry | ✅ |
| LLM timeout with canned response fallback | ✅ |
| Live FailureStateBanner in operator UI | ✅ |
| Full event replay with case state reconstruction | ✅ |
| PostgreSQL persistence (9 tables) | ✅ |
| Idempotency ledger (Redis-shaped, in-memory) | ✅ |
| Server-side credential boundary enforcement | ✅ |
| Mobile operator workspace | ✅ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript 5.7 |
| **UI** | Tailwind CSS 3.4 + Lucide React |
| **Build** | Vite 6 |
| **Voice** | Agora RTC SDK v4.24 + Agora RTM SDK v2.3 |
| **AI** | Agora Conversational AI Engine v2.8 + OpenAI |
| **ASR** | Deepgram (via Agora) |
| **TTS** | ElevenLabs / Azure (via Agora) |
| **Database** | PostgreSQL 16 |
| **State** | React Context + discriminated union RelayEvents |
| **Server** | Vite plugin API (Express-compatible middleware) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- An [Agora account](https://console.agora.io/) with an App ID + Certificate
- PostgreSQL 16 (optional for full persistence)

### 1. Clone and install

```bash
git clone https://github.com/Rishisharma029/relay.git
cd relay
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — the minimum required for demo mode:

```env
# Public (browser)
VITE_AGORA_APP_ID="your_agora_app_id"

# Server-side (never exposed to browser)
AGORA_APP_ID="your_agora_app_id"
AGORA_APP_CERTIFICATE="your_agora_certificate"
AGORA_CUSTOMER_ID="your_agora_customer_id"
AGORA_CUSTOMER_SECRET="your_agora_customer_secret"
OPENAI_API_KEY="your_openai_key"
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build for production

```bash
npm run build
npm run preview
```

---

## Project Structure

```
relay/
├── src/
│   ├── App.tsx                        # Root — routing, takeover FSM, global shortcuts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppHeader.tsx          # Header bar with case ID, status badges
│   │   │   └── NavigationSidebar.tsx  # Tab navigation
│   │   ├── workspace/
│   │   │   ├── LiveConversationPane.tsx   # Live transcript, waveform, FailureStateBanner
│   │   │   ├── CaseIntelligencePane.tsx   # Policy gates, facts, approval button
│   │   │   ├── ReplayableEvidenceTimeline.tsx  # Event scrubber + state reconstruction
│   │   │   ├── WaveformMonitor.tsx        # Real-time audio level viz
│   │   │   ├── VoiceControlsBar.tsx       # Takeover, pause, end call
│   │   │   └── EventProofModal.tsx        # Event telemetry inspector
│   │   ├── mobile/
│   │   │   └── MobileWorkspace.tsx        # Responsive operator view
│   │   └── ui/                            # Badge, Button primitives
│   ├── contexts/
│   │   └── CaseStateContext.tsx       # Authoritative state — all RelayEvents handled here
│   ├── services/
│   │   ├── agoraRtcService.ts         # WebRTC + token hot-swap
│   │   └── agoraRtmService.ts         # RelayEvent bus
│   ├── types/
│   │   ├── relayEvents.ts             # Discriminated union for all 22+ event types
│   │   ├── caseState.ts               # CaseState interface + INITIAL_CASE_STATE
│   │   ├── failureStates.ts           # 12 failure states + recovery plans (TS)
│   │   └── callState.ts               # Call state machine types
│   └── views/                         # Cases, Customers, Approvals, System Health
│
├── server/
│   ├── failureEngine.js               # 12 states, classify, withRetry, buildFailureEvent
│   ├── idempotencyStore.js            # refund:<caseId>:<orderId> ledger
│   ├── approvalService.js             # 6-gate security model
│   ├── agentOrchestrator.js           # Autonomous LLM ↔ tool calling engine
│   ├── policyEngine.js                # 5-point business policy gates
│   ├── agentService.js                # Agora Conversational AI v2.8 join
│   ├── tokenServer.js                 # Server-side RTC token generation
│   ├── languageManager.js             # Zero-reload language switching
│   ├── config.js                      # Credentials, timeouts, AUTHORIZED_OPERATORS
│   ├── db/
│   │   ├── schema.sql                 # 9-table PostgreSQL schema
│   │   └── database.js                # Repository layer + initial seeds
│   └── tools/
│       ├── index.js                   # Tool dispatcher with timeout + retry
│       ├── orders.js                  # Order lookup, delivery status
│       ├── refunds.js                 # Policy evaluation + UPI refund execution
│       ├── customer.js                # Customer identity verification
│       ├── tickets.js                 # Support ticket creation
│       └── escalation.js              # Human escalation
│
├── .env.example                       # Template — no real secrets
├── .gitignore
├── vite.config.ts                     # Vite + all API middleware endpoints
├── tailwind.config.js
├── tsconfig.json
├── LICENSE
├── SECURITY.md
└── CODE_OF_CONDUCT.md
```

---

## API Reference

### `GET /api/agora/token?channel=&uid=`
Generate a server-side RTC token for a given channel and user ID.

**Response:**
```json
{ "token": "006...", "channel": "relay-case-1042", "uid": 1042, "expiresAt": "..." }
```

---

### `POST /api/agent/start`
Start the Agora Conversational AI agent on a channel.

**Body:** `{ "channel": "relay-case-1042", "uid": 9999 }`

---

### `POST /api/agent/turn`
Process an autonomous conversation turn (ASR → LLM → Tool → LLM → TTS).

**Body:** `{ "utterance": "Mera order 5 din se nahi aaya.", "caseId": "RLY-1042" }`

**Response:**
```json
{
  "success": true,
  "intent": "delivery_issue",
  "toolsCalled": ["lookupOrder"],
  "agentResponse": "Main order check karti hoon...",
  "events": [...],
  "totalLatencyMs": 247
}
```

---

### `POST /api/approvals/approve`
Approve a pending action through the 6-gate security model.

**Body:**
```json
{
  "approvalId": "appr-rly1042-99042",
  "operator": { "id": "OP-782", "name": "Maya Sharma" },
  "caseId": "RLY-1042"
}
```

**Response (success):**
```json
{
  "type": "action.completed",
  "idempotencyKey": "refund:RLY-1042:#84921",
  "transaction": { "transactionId": "RF-84290", "status": "SETTLED_OK" }
}
```

**Response (duplicate):**
```json
{
  "type": "action.duplicate_prevented",
  "existingResult": { ... },
  "message": "Duplicate prevented. Original execution: 2026-08-27T21:34:43Z. No charge applied."
}
```

---

### `GET /api/idempotency/keys`
Inspect all active idempotency keys (audit/debug).

---

### `GET /api/db/stats`
Database health and row counts.

---

## 🚀 Deployment & GitHub Pages

### Live Hosted Demo
- **URL:** [https://rishisharma029.github.io/relay/](https://rishisharma029.github.io/relay/)
- **Automated CI/CD:** Powered by GitHub Actions workflow (`.github/workflows/deploy.yml`) on every push to `main`.

### Deploying to GitHub Pages Manually
```bash
# 1. Install dependencies
npm install

# 2. Build and publish directly to gh-pages branch
npm run deploy
```

### GitHub Repository Settings Setup (1-time)
1. Go to **Settings** → **Pages** on your repository.
2. Under **Build and deployment** → **Branch**:
   - Select **`gh-pages`**
   - Folder: **`/ (root)`**
   - Click **Save**

---

## Environment Variables

| Variable | Required | Scope | Description |
|---|---|---|---|
| `VITE_AGORA_APP_ID` | ✅ | Browser | Agora App ID (WebRTC join) |
| `AGORA_APP_ID` | ✅ | Server | Agora App ID (token generation) |
| `AGORA_APP_CERTIFICATE` | ✅ | Server | Used for RTC token signing |
| `AGORA_CUSTOMER_ID` | ✅ | Server | REST API authentication |
| `AGORA_CUSTOMER_SECRET` | ✅ | Server | REST API authentication |
| `OPENAI_API_KEY` | ✅ | Server | LLM orchestration |
| `DEEPGRAM_API_KEY` | ⬜ | Server | Optional ASR enhancement |
| `ELEVENLABS_API_KEY` | ⬜ | Server | Optional TTS voice |
| `DATABASE_URL` | ⬜ | Server | PostgreSQL connection (demo: in-memory fallback) |
| `REDIS_URL` | ⬜ | Server | Redis for idempotency (demo: in-memory) |
| `TOOL_TIMEOUT_MS` | ⬜ | Server | Per-tool timeout (default: 5000) |
| `LLM_TIMEOUT_MS` | ⬜ | Server | LLM call timeout (default: 8000) |
| `APPROVAL_EXPIRY_MS` | ⬜ | Server | Approval window (default: 600000 = 10 min) |
| `PORT` | ⬜ | Server | Server port (default: 3000) |

---

---

## Real Telemetry Pipeline

RELAY does not show static placeholder numbers. Every metric in the workstation is real-time measured via an instrumentation pipeline:

```
┌───────────────────────────┐      ┌───────────────────────────┐
│  Agora RTC SDK v4.24      │      │  Server Tool Engine &     │
│  - client.getRTCStats()   │      │  Orchestrator Pipeline    │
│  - getRemoteAudioStats()  │      │  - processAgentTurn()     │
│  - getLocalAudioStats()   │      │  - executeTool()          │
│  - on("network-quality")  │      │  - VAD Preemption Timer   │
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │                                  │
              └────────────────┬─────────────────┘
                               │
                               ▼
              ┌──────────────────────────────────┐
              │   Measured Telemetry Collector   │
              │   (src/services/telemetry.ts)    │
              └────────────────┬─────────────────┘
                               │
                               ▼
              ┌──────────────────────────────────┐
              │   Subscribed Operator UI Panes   │
              │   RTT:          84 ms            │
              │   Packet Loss:  0.01%            │
              │   Jitter:       0.7 ms           │
              │   Agent Turn:   1.18 s           │
              │   Tool Latency: 182 ms           │
              └──────────────────────────────────┘
```

---

## Production Database & Event Sourcing

RELAY models 10 PostgreSQL 16 entities with a **strictly append-only immutable event sourcing architecture**:

```
Append-Only Relay Events Log
           │
           │  (Sequence #1, #2, #3...)
           ▼
    caseStateReducer(state, event)   ── Pure Deterministic Function
           │
           ▼
     Current Authoritative Case State
```

### 10 Core Database Entities

```sql
1. customers           — Customer identity, tier, language preference, dispute rate
2. cases               — Active case sessions, state, intent, sentiment
3. calls               — WebRTC channel metadata, sample rate, start/end timestamps
4. participants        — Attendee role (CUSTOMER, AI_AGENT, OPERATOR), mute state, join/leave
5. transcript_messages — Spoken dialogue line, speaker, language, translation, confidence
6. case_facts          — Verified knowledge graph facts with source attribution
7. actions             — Proposed operations (REFUND, ESCALATION, REROUTE, COURIER_HOLD)
8. approvals           — Operator governance gates with policy snapshots and TTL expiry
9. tool_executions     — Autonomous function call parameters, results, duration_ms
10. relay_events       — Strictly append-only immutable audit log (No UPDATE / DELETE rules)
```

Full schema: [`server/db/schema.sql`](./server/db/schema.sql)

---

## Acknowledgements

- [Agora.io](https://www.agora.io/) — RTC/RTM infrastructure and Conversational AI Engine
- [OpenAI](https://openai.com/) — LLM reasoning and function calling
- [Deepgram](https://deepgram.com/) — ASR
- [ElevenLabs](https://elevenlabs.io/) — TTS voice synthesis
- [Lucide](https://lucide.dev/) — Icon system
- [Tailwind CSS](https://tailwindcss.com/) — UI styling

---

## License

MIT © 2026 Rishi Sharma — see [LICENSE](./LICENSE)
