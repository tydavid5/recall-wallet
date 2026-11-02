// Recall Wallet Agent — Gated Payment Vault (NEAR smart contract, JS via near-sdk-js 2.x)
//
// WHAT THIS IS
// An on-chain version of the off-chain policy engine in app/policy.js.
// The vault HOLDS testnet NEAR in the contract account's balance and only
// releases funds when a payment passes the stored policy. A blocked payment
// moves nothing. A payment above the confirm threshold does not move funds
// until the owner explicitly confirms it.
//
// AMOUNTS ARE yoctoNEAR, NOT USD — READ THIS BEFORE YOU CALL IT
// On-chain amounts are raw NEAR (1 NEAR = 10^24 yoctoNEAR). There is NO
// USD conversion on-chain: no oracle, no price feed, nothing converts a
// dollar figure into yoctoNEAR here. The off-chain demo talks in dollars
// ($20 / $100 caps) because that is a human demo; the vault talks in
// yoctoNEAR, and any caller that wants "about $20" must convert off-chain
// first and pass the resulting yoctoNEAR amount. Do not pretend otherwise.
//
// DEPLOYMENT STATUS: BUILT, NOT DEPLOYED (as of writing).
// This file compiles to build/vault.wasm, but no deployment transaction
// has been sent and no on-chain state exists yet. Deploying is a separate
// step (scripts/deploy-vault.mjs) that needs the owner's explicit go-ahead.
//
// POLICY CHECK ORDER (mirrors app/policy.js, in this order):
//   1. perTxCap      — amount > per-transaction cap            -> BLOCKED
//   2. dailyCap      — spent today + amount > daily cap        -> BLOCKED
//   3. allowlist     — recipient not on the allowlist           -> BLOCKED
//   4. confirmThreshold — amount > confirm threshold           -> NEEDS_CONFIRMATION
//   5. otherwise                                              -> ALLOWED (transfer now)
// One extra safety guard runs after the policy checks: if the vault does
// not actually hold enough NEAR, the payment is BLOCKED with rule
// "insufficientBalance" instead of producing a transfer receipt that
// would fail. The three policy rules above are the policy decision;
// the balance guard is just the vault refusing to promise funds it
// does not have.
//
// DAILY RESET: blockTimestamp() is nanoseconds since epoch. The UTC day
// number is timestamp / 86_400_000_000_000. When the day changes, spent
// today resets to zero before the check runs.
//
// RETURN-TYPE NOTE (honest, not a bug): when a payment is ALLOWED, this
// method returns a NearPromise that transfers the funds. In that case the
// caller does NOT also get a JSON decision object back — the promise is
// the return value, and the decision is recorded on-chain in the payments
// log (read it back with get_payments). BLOCKED and NEEDS_CONFIRMATION
// return a plain JSON object, because no transfer happens. confirm_payment
// behaves the same way.
//
// AUTHORIZATION: owner-only writes. Owner is the deploying account, set
// once at init(). Every mutating method except deposit() rejects any
// caller whose predecessor account is not the owner. deposit() is open
// on purpose: anyone may ADD funds to the vault, but only the owner can
// move them out or change policy. View methods are open to anyone.

import { NearBindgen, near, call, view, initialize, NearPromise, Vector, LookupSet } from "near-sdk-js";

const NS_PER_DAY = 86400000000000n;

function assertOwner(owner) {
  if (near.predecessorAccountId() !== owner) {
    throw new Error("Only the vault owner can call this method");
  }
}

function parseAmount(amount) {
  // Amounts arrive as JSON strings of yoctoNEAR. Reject anything that is
  // not a positive integer string — never silently coerce a bad amount.
  if (typeof amount !== "string" || !/^[0-9]+$/.test(amount)) {
    throw new Error("amount must be a string of yoctoNEAR, e.g. \"1000000000000000000000000\"");
  }
  const value = BigInt(amount);
  if (value <= 0n) {
    throw new Error("amount must be greater than zero");
  }
  return value;
}

function assertAccountId(accountId) {
  if (typeof accountId !== "string" || accountId.length < 2 || accountId.length > 64 || /\s/.test(accountId)) {
    throw new Error("Invalid NEAR account id");
  }
}

@NearBindgen({ requireInit: true })
class Vault {
  constructor() {
    this.owner = "";
    this.per_tx_cap = "0";
    this.daily_cap = "0";
    this.confirm_threshold = "0";
    this.spent_day = "0";
    this.spent_today = "0";
    this.next_payment_id = 0;
    // Collections: strings only (SDK constraint). Amounts inside records
    // are JSON strings of yoctoNEAR.
    this.payments = new Vector("pay");
    this.rules = new Vector("rul");
    // LookupSet is non-iterable, so the allowlist is kept twice: a set
    // for O(1) checks and a vector for listing via get_allowlist. Both
    // are updated together in add/remove, never separately.
    this.allowlist_set = new LookupSet("alw");
    this.allowlist_list = new Vector("all");
  }

  deserialize() {
    super.deserialize();
    this.payments = Object.assign(new Vector("pay"), this.payments);
    this.rules = Object.assign(new Vector("rul"), this.rules);
    this.allowlist_set = Object.assign(new LookupSet("alw"), this.allowlist_set);
    this.allowlist_list = Object.assign(new Vector("all"), this.allowlist_list);
  }

  // ----- internals (not exposed) -----

  rollDayIfNeeded() {
    const day = (near.blockTimestamp() / NS_PER_DAY).toString();
    if (this.spent_day !== day) {
      this.spent_day = day;
      this.spent_today = "0";
    }
    return day;
  }

  checkPolicy(to, amount) {
    // Returns { decision, rule } — never transfers, never mutates spent.
    if (amount > BigInt(this.per_tx_cap)) {
      return { decision: "BLOCKED", rule: "perTxCap" };
    }
    if (BigInt(this.spent_today) + amount > BigInt(this.daily_cap)) {
      return { decision: "BLOCKED", rule: "dailyCap" };
    }
    if (!this.allowlist_set.contains(to)) {
      return { decision: "BLOCKED", rule: "allowlist" };
    }
    if (amount > BigInt(this.confirm_threshold)) {
      return { decision: "NEEDS_CONFIRMATION", rule: "confirmThreshold" };
    }
    return { decision: "ALLOWED", rule: null };
  }

  logPayment(record) {
    this.payments.push(JSON.stringify(record));
    return record;
  }

  // ----- init -----

  @initialize({})
  init({ per_tx_cap, daily_cap, confirm_threshold }) {
    this.owner = near.predecessorAccountId();
    const perTx = parseAmount(per_tx_cap);
    const daily = parseAmount(daily_cap);
    const confirm = parseAmount(confirm_threshold);
    this.per_tx_cap = perTx.toString();
    this.daily_cap = daily.toString();
    this.confirm_threshold = confirm.toString();
    this.spent_day = (near.blockTimestamp() / NS_PER_DAY).toString();
    this.spent_today = "0";
    this.next_payment_id = 0;
    return { owner: this.owner, per_tx_cap: this.per_tx_cap, daily_cap: this.daily_cap, confirm_threshold: this.confirm_threshold };
  }

  // ----- funds in -----

  @call({ payableFunction: true })
  deposit() {
    // Attached deposit is added to the contract balance by the runtime;
    // there is nothing else to do. Anyone may fund the vault; only the
    // owner can move funds out (see request/confirm_payment).
    return { balance: near.accountBalance().toString() };
  }

  // ----- policy & allowlist (owner-only writes) -----

  @call({})
  set_policy({ per_tx_cap, daily_cap, confirm_threshold }) {
    assertOwner(this.owner);
    const perTx = parseAmount(per_tx_cap);
    const daily = parseAmount(daily_cap);
    const confirm = parseAmount(confirm_threshold);
    this.per_tx_cap = perTx.toString();
    this.daily_cap = daily.toString();
    this.confirm_threshold = confirm.toString();
    return this.get_policy();
  }

  @call({})
  add_to_allowlist({ account_id }) {
    assertOwner(this.owner);
    assertAccountId(account_id);
    if (!this.allowlist_set.contains(account_id)) {
      this.allowlist_set.set(account_id);
      this.allowlist_list.push(account_id);
    }
    return { allowlist: this.allowlist_list.toArray() };
  }

  @call({})
  remove_from_allowlist({ account_id }) {
    assertOwner(this.owner);
    if (this.allowlist_set.contains(account_id)) {
      this.allowlist_set.remove(account_id);
      // Keep the listing vector in sync (swapRemove, O(n) scan — the
      // allowlist is small by design).
      const list = this.allowlist_list.toArray();
      for (let i = 0; i < list.length; i++) {
        if (list[i] === account_id) {
          this.allowlist_list.swapRemove(i);
          break;
        }
      }
    }
    return { allowlist: this.allowlist_list.toArray() };
  }

  // ----- remembered rules / memory (owner-only writes) -----

  @call({})
  add_rule({ rule }) {
    assertOwner(this.owner);
    if (typeof rule !== "string" || rule.trim() === "") {
      throw new Error("rule must be a non-empty string");
    }
    this.rules.push(rule);
    return { rules: this.rules.toArray() };
  }

  @call({})
  remove_rule({ index }) {
    assertOwner(this.owner);
    const rules = this.rules.toArray();
    if (typeof index !== "number" || index < 0 || index >= rules.length) {
      throw new Error("rule index out of range");
    }
    this.rules.swapRemove(index);
    return { rules: this.rules.toArray() };
  }

  // ----- payments -----

  @call({})
  request_payment({ to, amount }) {
    assertOwner(this.owner);
    assertAccountId(to);
    const value = parseAmount(amount);
    this.rollDayIfNeeded();
    const id = this.next_payment_id;
    this.next_payment_id += 1;
    const ts = near.blockTimestamp().toString();

    const checked = this.checkPolicy(to, value);
    if (checked.decision === "BLOCKED") {
      const record = { id, to, amount: value.toString(), decision: "BLOCKED", rule: checked.rule, status: "blocked", created_at: ts, executed_at: null };
      this.logPayment(record);
      near.log(`BLOCKED payment ${id} to ${to}: rule ${checked.rule}`);
      return record;
    }
    if (checked.decision === "NEEDS_CONFIRMATION") {
      const record = { id, to, amount: value.toString(), decision: "NEEDS_CONFIRMATION", rule: "confirmThreshold", status: "pending", created_at: ts, executed_at: null };
      this.logPayment(record);
      near.log(`PENDING payment ${id} to ${to}: above confirm threshold, no funds moved`);
      return record;
    }
    // ALLOWED — but never promise funds the vault does not hold.
    if (value > near.accountBalance()) {
      const record = { id, to, amount: value.toString(), decision: "BLOCKED", rule: "insufficientBalance", status: "blocked", created_at: ts, executed_at: null };
      this.logPayment(record);
      near.log(`BLOCKED payment ${id} to ${to}: rule insufficientBalance`);
      return record;
    }
    const record = { id, to, amount: value.toString(), decision: "ALLOWED", rule: null, status: "executed", created_at: ts, executed_at: ts };
    this.logPayment(record);
    this.spent_today = (BigInt(this.spent_today) + value).toString();
    near.log(`ALLOWED payment ${id} to ${to}: transferring ${value.toString()} yoctoNEAR`);
    // Return value IS the transfer promise (see header note). The
    // decision is already recorded in the payments log.
    return NearPromise.new(to).transfer(value);
  }

  @call({})
  confirm_payment({ id }) {
    assertOwner(this.owner);
    this.rollDayIfNeeded();
    const records = this.payments.toArray();
    let index = -1;
    for (let i = 0; i < records.length; i++) {
      if (JSON.parse(records[i]).id === id) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      throw new Error("payment id not found");
    }
    const record = JSON.parse(records[index]);
    if (record.status !== "pending") {
      throw new Error("only a pending payment can be confirmed");
    }
    const value = BigInt(record.amount);
    // Re-check at execution time, WITHOUT the confirm threshold (this
    // call IS the confirmation). A payment that became unaffordable or
    // whose recipient left the allowlist since it was requested must
    // still not move.
    if (value > BigInt(this.per_tx_cap)) {
      record.decision = "BLOCKED";
      record.rule = "perTxCap";
      record.status = "blocked";
      this.payments.replace(index, JSON.stringify(record));
      return record;
    }
    if (BigInt(this.spent_today) + value > BigInt(this.daily_cap)) {
      record.decision = "BLOCKED";
      record.rule = "dailyCap";
      record.status = "blocked";
      this.payments.replace(index, JSON.stringify(record));
      return record;
    }
    if (!this.allowlist_set.contains(record.to)) {
      record.decision = "BLOCKED";
      record.rule = "allowlist";
      record.status = "blocked";
      this.payments.replace(index, JSON.stringify(record));
      return record;
    }
    if (value > near.accountBalance()) {
      record.decision = "BLOCKED";
      record.rule = "insufficientBalance";
      record.status = "blocked";
      this.payments.replace(index, JSON.stringify(record));
      return record;
    }
    const ts = near.blockTimestamp().toString();
    record.decision = "ALLOWED";
    record.rule = null;
    record.status = "confirmed";
    record.executed_at = ts;
    this.payments.replace(index, JSON.stringify(record));
    this.spent_today = (BigInt(this.spent_today) + value).toString();
    near.log(`CONFIRMED payment ${id} to ${record.to}: transferring ${value.toString()} yoctoNEAR`);
    return NearPromise.new(record.to).transfer(value);
  }

  // ----- views -----

  @view({})
  get_policy() {
    return { owner: this.owner, per_tx_cap: this.per_tx_cap, daily_cap: this.daily_cap, confirm_threshold: this.confirm_threshold };
  }

  @view({})
  get_allowlist() {
    return this.allowlist_list.toArray();
  }

  @view({})
  get_rules() {
    return this.rules.toArray();
  }

  @view({})
  get_spent_today() {
    // Views cannot persist, so the rollover is computed, not stored:
    // if the UTC day has changed since the last call, today's spent
    // is 0 until the next call runs rollDayIfNeeded and stores it.
    const day = (near.blockTimestamp() / NS_PER_DAY).toString();
    if (day !== this.spent_day) {
      return { day, spent_today: "0" };
    }
    return { day: this.spent_day, spent_today: this.spent_today };
  }

  @view({})
  get_payments() {
    return this.payments.toArray().map((entry) => JSON.parse(entry));
  }

  @view({})
  get_balance() {
    return { balance: near.accountBalance().toString(), contract: near.currentAccountId() };
  }
}
