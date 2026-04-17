/**
 * In-memory, single-browser-tab mock of the prediction market contracts.
 * Persists to localStorage so the visitor's positions survive reloads.
 *
 * The LMSR math mirrors `lib/lmsr.ts` (JS port of contracts/src/LMSRPricing.sol).
 * Timestamps use the local clock. Fake transaction hashes are sequential.
 */
import type { Address } from "viem";
import { lmsrPrice } from "./lmsr";
import { DEMO_DISPUTE_WINDOW_SEC, DEMO_WALLET_ADDRESS } from "./demoMode";

// ---------- Types ----------

export type ResolutionStatus = 0 | 1 | 2; // Unresolved / Proposed / Finalized

export type MockMarket = {
  address: Address;
  question: string;
  b: bigint;           // 18-dec
  feeBps: bigint;
  subsidyBudget: bigint; // 6-dec
  disputeWindow: bigint; // seconds
  qNo: bigint;
  qYes: bigint;
  collateralBalance: bigint; // 6-dec
  paused: boolean;
  resolved: boolean;
  winningOutcome: 0 | 1;
  // Resolution status
  status: ResolutionStatus;
  proposedOutcome: 0 | 1;
  disputeEndsAt: number; // unix seconds
};

export type MockTrade = {
  kind: "Bought" | "Sold";
  trader: Address;
  outcome: 0 | 1;
  shareAmount: bigint; // 18-dec
  cost: bigint;        // 6-dec
  fee: bigint;         // 6-dec
  block: bigint;       // monotonic counter
  txHash: `0x${string}`;
  timestamp: number;
};

type HolderShares = Record<Address, { no: bigint; yes: bigint; claimed: boolean }>;

type ChainState = {
  blockCounter: bigint;
  txCounter: number;
  markets: MockMarket[];
  trades: Record<Address, MockTrade[]>;
  balances: Record<Address, bigint>;       // USDC 6-dec
  allowances: Record<Address, Record<Address, bigint>>; // owner → spender → amount
  shares: Record<Address, HolderShares>;    // market → holder → {no, yes}
  dispenserServed: Record<Address, boolean>;
  dispenserUsdcDrips: number;
  dispenserBnbBalance: bigint;
};

// ---------- Constants that mirror the contract ----------

const B = 100n * 10n ** 18n;        // liquidity parameter
const SCALE = 1_000_000_000_000n;   // 1e12; bridges 18-dec internal ↔ 6-dec USDC
const BPS = 10_000n;
const DEFAULT_FEE_BPS = 100n;       // 1%
const DEFAULT_SUBSIDY = 500n * 1_000_000n;   // 500 USDC
const DEFAULT_DISPUTE = BigInt(DEMO_DISPUTE_WINDOW_SEC);

const PLACEHOLDER_ADDRS = {
  mockUSDC: "0xD0C0000000000000000000000000000000000001",
  shares: "0xD0C0000000000000000000000000000000000002",
  resolution: "0xD0C0000000000000000000000000000000000003",
  marketFactory: "0xD0C0000000000000000000000000000000000004",
  dispenser: "0xD0C0000000000000000000000000000000000005",
} as const;

// ---------- Seed data ----------

const SEEDED_QUESTIONS = [
  "Will the demo market #1 be resolved YES?",
  "Will this market have more than 20 trades in its first 100 blocks?",
  "Will the next block mined on BSC testnet have an even block number?",
] as const;

function seedMarketAddress(i: number): Address {
  // Stable, deterministic; obviously a demo address.
  const hex = (i + 1).toString(16).padStart(2, "0");
  return `0xDEF10000000000000000000000000000000000${hex}` as Address;
}

function bootstrapState(): ChainState {
  const now = Math.floor(Date.now() / 1000);
  const markets: MockMarket[] = SEEDED_QUESTIONS.map((question, i) => ({
    address: seedMarketAddress(i),
    question,
    b: B,
    feeBps: DEFAULT_FEE_BPS,
    subsidyBudget: DEFAULT_SUBSIDY,
    disputeWindow: DEFAULT_DISPUTE,
    qNo: 0n,
    qYes: 0n,
    collateralBalance: DEFAULT_SUBSIDY,
    paused: false,
    resolved: false,
    winningOutcome: 0,
    status: 0,
    proposedOutcome: 0,
    disputeEndsAt: 0,
  }));

  // Seed some trade activity so charts and prices aren't dead-flat.
  const trades: Record<Address, MockTrade[]> = {};
  const shares: Record<Address, HolderShares> = {};
  const phantomTraders: Address[] = [
    "0xA11CE00000000000000000000000000000000001",
    "0xB0B0B00000000000000000000000000000000002",
    "0xCA501E0000000000000000000000000000000003",
  ];

  const state: ChainState = {
    blockCounter: 0n,
    txCounter: 0,
    markets,
    trades,
    balances: {
      [DEMO_WALLET_ADDRESS]: 1_000n * 1_000_000n, // Start the visitor with $1,000.
    },
    allowances: {},
    shares,
    dispenserServed: {},
    dispenserUsdcDrips: 0,
    dispenserBnbBalance: 10n ** 16n, // 0.01 BNB equivalent for display
  };

  for (const m of markets) {
    trades[m.address] = [];
    shares[m.address] = {};
  }

  // Market 1 leans YES: 25 yes, 5 no → p(yes) ≈ 0.55
  applySeedTrade(state, markets[0], phantomTraders[0], 1, 15e18, now - 600);
  applySeedTrade(state, markets[0], phantomTraders[1], 1, 10e18, now - 420);
  applySeedTrade(state, markets[0], phantomTraders[2], 0, 5e18, now - 120);

  // Market 2 leans NO: 23 no, 5 yes → p(yes) ≈ 0.44
  applySeedTrade(state, markets[1], phantomTraders[0], 0, 20e18, now - 540);
  applySeedTrade(state, markets[1], phantomTraders[1], 1, 5e18, now - 360);
  applySeedTrade(state, markets[1], phantomTraders[2], 0, 3e18, now - 180);

  // Market 3: balanced + chatty
  for (let i = 0; i < 5; i++) {
    applySeedTrade(state, markets[2], phantomTraders[0], 1, 2e18, now - 900 + i * 60);
    applySeedTrade(state, markets[2], phantomTraders[1], 0, 2e18, now - 870 + i * 60);
  }

  return state;
}

function applySeedTrade(
  state: ChainState,
  market: MockMarket,
  trader: Address,
  outcome: 0 | 1,
  shareAmountFloat: number,
  timestamp: number,
) {
  const shareAmount = BigInt(Math.round(shareAmountFloat));
  const before = lmsrCostBigint(market.qNo, market.qYes, market.b);
  if (outcome === 0) market.qNo += shareAmount;
  else market.qYes += shareAmount;
  const after = lmsrCostBigint(market.qNo, market.qYes, market.b);
  const costRaw = after - before;
  const cost = scaleDownCeil(costRaw); // 6-dec
  const fee = ((cost * market.feeBps) + BPS - 1n) / BPS;

  market.collateralBalance += cost + fee;

  const bucket = state.shares[market.address][trader] ?? { no: 0n, yes: 0n, claimed: false };
  if (outcome === 0) bucket.no += shareAmount;
  else bucket.yes += shareAmount;
  state.shares[market.address][trader] = bucket;

  const txHash = nextTxHash(state);
  state.blockCounter += 1n;
  state.trades[market.address].push({
    kind: "Bought",
    trader,
    outcome,
    shareAmount,
    cost,
    fee,
    block: state.blockCounter,
    txHash,
    timestamp,
  });
}

// ---------- LMSR in JS bigint space ----------

/** b * ln(exp(q0/b) + exp(q1/b)) in 18-decimal bigint. */
function lmsrCostBigint(q0: bigint, q1: bigint, b: bigint): bigint {
  // Convert to float for ln/exp, then back. Bounded q → safe.
  const u0 = Number(q0) / Number(b);
  const u1 = Number(q1) / Number(b);
  const lse = Math.log(Math.exp(u0) + Math.exp(u1));
  const cost = Number(b) * lse;
  return BigInt(Math.round(cost));
}

function scaleDownCeil(x: bigint): bigint {
  if (x < 0n) return -((-x + SCALE - 1n) / SCALE);
  return (x + SCALE - 1n) / SCALE;
}

// ---------- State access ----------

const STORAGE_KEY = "pm-demo:mock-chain:v1";

// State lives in module scope on the client; reloaded from localStorage on boot.
let _state: ChainState | null = null;
type Listener = () => void;
const _listeners = new Set<Listener>();

function getClientState(): ChainState {
  if (typeof window === "undefined") return bootstrapState(); // SSR fallback
  if (_state) return _state;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      _state = deserialize(raw);
      // Cheap migration if stored shape is stale:
      if (!Array.isArray(_state.markets) || _state.markets.length < 3) {
        _state = bootstrapState();
      }
      return _state;
    }
  } catch {
    // ignore storage errors
  }
  _state = bootstrapState();
  persist();
  return _state;
}

function persist() {
  if (typeof window === "undefined" || !_state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, serialize(_state));
  } catch {
    // ignore
  }
}

function notify() {
  for (const l of _listeners) l();
}

export function subscribeMockChain(l: Listener): () => void {
  _listeners.add(l);
  return () => {
    _listeners.delete(l);
  };
}

export function resetMockChain() {
  _state = bootstrapState();
  persist();
  notify();
}

// BigInt-safe JSON ----
function serialize(s: ChainState): string {
  return JSON.stringify(s, (_k, v) => (typeof v === "bigint" ? `${v.toString()}n` : v));
}
function deserialize(raw: string): ChainState {
  return JSON.parse(raw, (_k, v) =>
    typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,
  ) as ChainState;
}

// ---------- Reads ----------

export const MOCK_ADDRESSES = PLACEHOLDER_ADDRS;

export function mockMarkets(): Address[] {
  return getClientState().markets.map((m) => m.address);
}

export function mockMarket(addr: Address): MockMarket | undefined {
  return getClientState().markets.find((m) => m.address.toLowerCase() === addr.toLowerCase());
}

export function mockPriceOf(addr: Address, outcome: 0 | 1): bigint {
  const m = mockMarket(addr);
  if (!m) return 5n * 10n ** 17n;
  const p = lmsrPrice(m.qNo, m.qYes, m.b, outcome);
  return BigInt(Math.round(p * 1e18));
}

export function mockMarketData(addr: Address) {
  const m = mockMarket(addr);
  if (!m) return undefined;
  return {
    address: m.address,
    question: m.question,
    qNo: m.qNo,
    qYes: m.qYes,
    priceNo: mockPriceOf(addr, 0),
    priceYes: mockPriceOf(addr, 1),
    collateralBalance: m.collateralBalance,
    subsidyBudget: m.subsidyBudget,
    paused: m.paused,
    resolved: m.resolved,
    winningOutcome: m.winningOutcome,
    disputeWindow: m.disputeWindow,
  };
}

export function mockTrades(addr: Address): MockTrade[] {
  return getClientState().trades[addr] ?? [];
}

export function mockUsdcBalance(holder: Address): bigint {
  return getClientState().balances[holder] ?? 0n;
}

export function mockAllowance(owner: Address, spender: Address): bigint {
  return getClientState().allowances[owner]?.[spender] ?? 0n;
}

export function mockSharesOf(market: Address, holder: Address): { no: bigint; yes: bigint; claimed: boolean } {
  return getClientState().shares[market]?.[holder] ?? { no: 0n, yes: 0n, claimed: false };
}

export function mockResolutionOf(market: Address): { status: ResolutionStatus; proposedOutcome: 0 | 1; disputeEndsAt: number } {
  const m = mockMarket(market);
  if (!m) return { status: 0, proposedOutcome: 0, disputeEndsAt: 0 };
  return { status: m.status, proposedOutcome: m.proposedOutcome, disputeEndsAt: m.disputeEndsAt };
}

export function mockServed(addr: Address): boolean {
  return getClientState().dispenserServed[addr] ?? false;
}

export function mockDispenserBalance(): bigint {
  return getClientState().dispenserBnbBalance;
}

export function mockIsOperator(addr: Address): boolean {
  // In demo mode, the visitor IS the operator — they can exercise the admin flows.
  return addr.toLowerCase() === DEMO_WALLET_ADDRESS.toLowerCase();
}

// ---------- Writes ----------

function nextTxHash(state: ChainState): `0x${string}` {
  state.txCounter += 1;
  return (`0x${"demo".padStart(8, "0")}${state.txCounter.toString(16).padStart(56, "0")}`) as `0x${string}`;
}

async function fakeLatency() {
  // Small delay so the UI's "Submitting…" state is visible.
  await new Promise((r) => setTimeout(r, 400));
}

export async function mockMint(to: Address, amount: bigint) {
  await fakeLatency();
  const s = getClientState();
  s.balances[to] = (s.balances[to] ?? 0n) + amount;
  const hash = nextTxHash(s);
  persist();
  notify();
  return hash;
}

export async function mockApprove(owner: Address, spender: Address, amount: bigint) {
  await fakeLatency();
  const s = getClientState();
  s.allowances[owner] = s.allowances[owner] ?? {};
  s.allowances[owner][spender] = amount;
  const hash = nextTxHash(s);
  persist();
  notify();
  return hash;
}

export async function mockBuy(market: Address, buyer: Address, outcome: 0 | 1, shareAmount: bigint, maxCost: bigint) {
  await fakeLatency();
  const s = getClientState();
  const m = mockMarket(market);
  if (!m) throw new Error("Market not found");
  if (m.paused || m.resolved) throw new Error("Market isn't accepting trades right now.");

  const before = lmsrCostBigint(m.qNo, m.qYes, m.b);
  const qNoAfter = outcome === 0 ? m.qNo + shareAmount : m.qNo;
  const qYesAfter = outcome === 1 ? m.qYes + shareAmount : m.qYes;
  const after = lmsrCostBigint(qNoAfter, qYesAfter, m.b);
  const cost = scaleDownCeil(after - before);
  const fee = ((cost * m.feeBps) + BPS - 1n) / BPS;
  const total = cost + fee;
  if (total > maxCost) throw new Error(`Price moved beyond your slippage limit. Try again with a higher slippage setting.`);

  if ((s.balances[buyer] ?? 0n) < total) throw new Error("Insufficient USDC balance.");
  if ((s.allowances[buyer]?.[market] ?? 0n) < total) throw new Error("USDC not approved.");

  // Effects
  m.qNo = qNoAfter;
  m.qYes = qYesAfter;
  m.collateralBalance += total;
  s.balances[buyer] = (s.balances[buyer] ?? 0n) - total;
  s.allowances[buyer][market] = (s.allowances[buyer][market] ?? 0n) - total;

  const bucket = s.shares[market][buyer] ?? { no: 0n, yes: 0n, claimed: false };
  if (outcome === 0) bucket.no += shareAmount;
  else bucket.yes += shareAmount;
  s.shares[market][buyer] = bucket;

  const hash = nextTxHash(s);
  s.blockCounter += 1n;
  s.trades[market].push({
    kind: "Bought",
    trader: buyer,
    outcome,
    shareAmount,
    cost,
    fee,
    block: s.blockCounter,
    txHash: hash,
    timestamp: Math.floor(Date.now() / 1000),
  });

  persist();
  notify();
  return hash;
}

export async function mockSell(market: Address, seller: Address, outcome: 0 | 1, shareAmount: bigint, minPayout: bigint) {
  await fakeLatency();
  const s = getClientState();
  const m = mockMarket(market);
  if (!m) throw new Error("Market not found");
  if (m.paused || m.resolved) throw new Error("Market isn't accepting trades right now.");

  const bucket = s.shares[market][seller] ?? { no: 0n, yes: 0n, claimed: false };
  const held = outcome === 0 ? bucket.no : bucket.yes;
  if (held < shareAmount) throw new Error("You don't hold enough shares for that trade.");

  const before = lmsrCostBigint(m.qNo, m.qYes, m.b);
  const qNoAfter = outcome === 0 ? m.qNo - shareAmount : m.qNo;
  const qYesAfter = outcome === 1 ? m.qYes - shareAmount : m.qYes;
  const after = lmsrCostBigint(qNoAfter, qYesAfter, m.b);
  const rawDelta = after - before;
  const grossPayout = rawDelta <= 0n ? -rawDelta / SCALE : 0n;
  const fee = ((grossPayout * m.feeBps) + BPS - 1n) / BPS;
  const netPayout = grossPayout - fee;
  if (netPayout < minPayout) throw new Error(`Payout below your minimum.`);

  m.qNo = qNoAfter;
  m.qYes = qYesAfter;
  m.collateralBalance -= netPayout;
  if (outcome === 0) bucket.no -= shareAmount;
  else bucket.yes -= shareAmount;
  s.balances[seller] = (s.balances[seller] ?? 0n) + netPayout;

  const hash = nextTxHash(s);
  s.blockCounter += 1n;
  s.trades[market].push({
    kind: "Sold",
    trader: seller,
    outcome,
    shareAmount,
    cost: grossPayout,
    fee,
    block: s.blockCounter,
    txHash: hash,
    timestamp: Math.floor(Date.now() / 1000),
  });

  persist();
  notify();
  return hash;
}

export async function mockDrip(to: Address) {
  await fakeLatency();
  const s = getClientState();
  if (s.dispenserServed[to]) throw new Error("This wallet has already claimed test funds.");
  s.dispenserServed[to] = true;
  s.dispenserUsdcDrips += 1;
  s.balances[to] = (s.balances[to] ?? 0n) + 100n * 1_000_000n;
  s.dispenserBnbBalance = s.dispenserBnbBalance > 10n ** 15n ? s.dispenserBnbBalance - 10n ** 15n : 0n;
  const hash = nextTxHash(s);
  persist();
  notify();
  return hash;
}

export async function mockCreateMarket(
  operator: Address,
  question: string,
  b: bigint,
  subsidy: bigint,
  feeBps: bigint,
  // User-supplied window is intentionally ignored in demo mode — we always use
  // DEMO_DISPUTE_WINDOW_SEC so the lifecycle finishes quickly.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _disputeWindow: bigint,
) {
  await fakeLatency();
  const s = getClientState();
  const idx = s.markets.length;
  const address = seedMarketAddress(idx) as Address;
  const market: MockMarket = {
    address,
    question,
    b,
    feeBps,
    subsidyBudget: subsidy,
    // Demo accelerates any user-supplied window — keeps the lifecycle visible in one sitting.
    disputeWindow: BigInt(DEMO_DISPUTE_WINDOW_SEC),
    qNo: 0n,
    qYes: 0n,
    collateralBalance: subsidy,
    paused: false,
    resolved: false,
    winningOutcome: 0,
    status: 0,
    proposedOutcome: 0,
    disputeEndsAt: 0,
  };
  s.markets.push(market);
  s.trades[address] = [];
  s.shares[address] = {};
  s.balances[operator] = (s.balances[operator] ?? 0n) - subsidy;
  if (s.balances[operator] < 0n) s.balances[operator] = 0n; // demo forgiveness
  const hash = nextTxHash(s);
  persist();
  notify();
  return { hash, market: address };
}

export async function mockPause(market: Address) {
  await fakeLatency();
  const s = getClientState();
  const m = mockMarket(market);
  if (!m) throw new Error("Market not found");
  m.paused = true;
  const hash = nextTxHash(s);
  persist();
  notify();
  return hash;
}

export async function mockUnpause(market: Address) {
  await fakeLatency();
  const s = getClientState();
  const m = mockMarket(market);
  if (!m) throw new Error("Market not found");
  m.paused = false;
  const hash = nextTxHash(s);
  persist();
  notify();
  return hash;
}

export async function mockSubmitOutcome(market: Address, outcome: 0 | 1) {
  await fakeLatency();
  const s = getClientState();
  const m = mockMarket(market);
  if (!m) throw new Error("Market not found");
  if (m.status !== 0) throw new Error("An outcome has already been proposed for this market.");
  m.status = 1;
  m.proposedOutcome = outcome;
  m.disputeEndsAt = Math.floor(Date.now() / 1000) + Number(m.disputeWindow);
  const hash = nextTxHash(s);
  persist();
  notify();
  return hash;
}

export async function mockFinalize(market: Address) {
  await fakeLatency();
  const s = getClientState();
  const m = mockMarket(market);
  if (!m) throw new Error("Market not found");
  if (m.status !== 1) throw new Error("Market resolution hasn't been submitted yet.");
  if (Math.floor(Date.now() / 1000) < m.disputeEndsAt) throw new Error(`Dispute window is still active.`);
  m.status = 2;
  m.resolved = true;
  m.winningOutcome = m.proposedOutcome;
  const hash = nextTxHash(s);
  persist();
  notify();
  return hash;
}

export async function mockClaim(market: Address, holder: Address) {
  await fakeLatency();
  const s = getClientState();
  const m = mockMarket(market);
  if (!m) throw new Error("Market not found");
  if (m.status !== 2) throw new Error("Market isn't finalized yet.");
  const bucket = s.shares[market][holder] ?? { no: 0n, yes: 0n, claimed: false };
  const winning = m.winningOutcome === 0 ? bucket.no : bucket.yes;
  if (winning === 0n) {
    bucket.claimed = true;
    s.shares[market][holder] = bucket;
    const hash = nextTxHash(s);
    persist();
    notify();
    return { hash, payout: 0n };
  }
  const payout = winning / SCALE;
  m.collateralBalance -= payout;
  s.balances[holder] = (s.balances[holder] ?? 0n) + payout;
  if (m.winningOutcome === 0) bucket.no = 0n;
  else bucket.yes = 0n;
  bucket.claimed = true;
  s.shares[market][holder] = bucket;

  const hash = nextTxHash(s);
  persist();
  notify();
  return { hash, payout };
}

export async function mockWithdrawDispenser(to: Address) {
  await fakeLatency();
  const s = getClientState();
  s.balances[to] = (s.balances[to] ?? 0n) + 0n; // dispenser holds USDC indirectly; demo nominal
  s.dispenserBnbBalance = 0n;
  const hash = nextTxHash(s);
  persist();
  notify();
  return hash;
}

// ---------- Derived read for event log ----------

export function mockOperatorEvents(): {
  kind: "MarketCreated" | "OutcomeSubmitted" | "Finalized" | "Dripped";
  txHash: `0x${string}`;
  summary: string;
  timestamp: number;
  market?: Address;
}[] {
  const s = getClientState();
  const out: ReturnType<typeof mockOperatorEvents> = [];
  for (const m of s.markets) {
    if (m.status === 1) {
      out.push({
        kind: "OutcomeSubmitted",
        txHash: nextTxHash(s),
        summary: `Proposed ${m.proposedOutcome === 1 ? "YES" : "NO"} for "${truncate(m.question, 40)}"`,
        timestamp: m.disputeEndsAt - Number(m.disputeWindow),
        market: m.address,
      });
    }
    if (m.status === 2) {
      out.push({
        kind: "Finalized",
        txHash: nextTxHash(s),
        summary: `Finalized "${truncate(m.question, 40)}" as ${m.winningOutcome === 1 ? "YES" : "NO"}`,
        timestamp: m.disputeEndsAt + 1,
        market: m.address,
      });
    }
  }
  if (s.dispenserUsdcDrips > 0) {
    out.push({
      kind: "Dripped",
      txHash: nextTxHash(s),
      summary: `Dispenser drips served: ${s.dispenserUsdcDrips}`,
      timestamp: Math.floor(Date.now() / 1000),
    });
  }
  return out.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
