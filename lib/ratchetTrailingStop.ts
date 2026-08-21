/**
 * TWO-PHASE TIGHT PROFIT-PROTECTION TRAIL & COMPOUNDING MILESTONE SYSTEM
 * 
 * Worked Numeric Justification of Threshold vs Buffer Math:
 * - Activation Threshold (profitLockActivationThreshold) = 0.30 * initialRisk ($3.00 for initialRisk = $10.00).
 * - Trail Buffer (trailBuffer) = 0.15 * initialRisk ($1.50 for initialRisk = $10.00).
 * - Since trailBuffer ($1.50) is strictly SMALLER than activationThreshold ($3.00), at Phase 2 activation (profit = $3.00, price = $103.00),
 *   the tight trailing stop immediately locks at:
 *     tightTrailingStop = Entry + ($3.00 - $1.50) = $101.50 (+1.50 profit protected!)
 * - This guarantees a profit-positive floor from the very first tick of Phase 2 activation.
 */

export interface CompoundingMilestoneInput {
  type: "BUY" | "SELL";
  entryPrice: number;
  initialStopLoss: number;
  initialRisk: number;
  currentReference: number;
  lockedProfit: number;
  nextTarget: number;
  milestonesAchieved: number;

  // Two-Phase Tight Trail Fields
  highestProfit?: number;                 // Monotonic peak profit ($ amount)
  profitLockActivationThreshold?: number; // Activation threshold ($ amount, default: 0.30 * initialRisk)
  trailBuffer?: number;                   // Tight trail buffer ($ amount, default: 0.15 * initialRisk)
  marketRegime?: string;                  // Al Brooks live state e.g. "ALWAYS_IN_LONG" | "ALWAYS_IN_SHORT" | "TRADING_RANGE"
  structureFlip?: boolean;                // Boolean explicit structure flip signal
  stopLossPrice?: number;                 // Current dynamic stop loss price for monotonicity check
}

export interface CompoundingMilestoneUpdateResult {
  updatedInitialRisk: number;
  updatedCurrentReference: number;
  updatedLockedProfit: number;
  updatedNextTarget: number;
  updatedMilestonesAchieved: number;
  updatedHighestProfit: number;
  effectiveStopLoss: number;
  effectiveTargetPrice: number;
  currentProfit: number;
  shouldExit: boolean;
  exitReason?: string;
  outcome?: "MILESTONE_EXIT" | "HIT_INITIAL_SL" | "STRUCTURE_REVERSAL_FLIP";
}

// Backward-compatibility aliases
export type TrailingStateInput = CompoundingMilestoneInput;
export type TrailingUpdateResult = CompoundingMilestoneUpdateResult;

/**
 * Initializes compounding milestone & two-phase tight trail parameters for a new trade setup.
 */
export function initializeMilestoneRiskModel(
  type: "BUY" | "SELL",
  entryPrice: number,
  initialStopLoss: number,
  customActivationThreshold?: number,
  customTrailBuffer?: number
): {
  initialRisk: number;
  currentReference: number;
  lockedProfit: number;
  nextTarget: number;
  milestonesAchieved: number;
  highestProfit: number;
  profitLockActivationThreshold: number;
  trailBuffer: number;
  effectiveStopLoss: number;
  effectiveTargetPrice: number;
  // Backward compatibility aliases
  riskUnitR: number;
  finalTarget: number;
  trailingStopLoss: number;
} {
  const safeEntry = Number(entryPrice.toFixed(2));
  let safeSL = Number(initialStopLoss.toFixed(2));

  if (type === "BUY") {
    if (safeSL >= safeEntry) {
      safeSL = Number((safeEntry * 0.985).toFixed(2));
    }
  } else {
    if (safeSL <= safeEntry) {
      safeSL = Number((safeEntry * 1.015).toFixed(2));
    }
  }

  const initialRisk = Number(Math.abs(safeEntry - safeSL).toFixed(2));
  const currentReference = initialRisk;
  const lockedProfit = 0;
  const nextTarget = Number((currentReference * 5).toFixed(2));
  const milestonesAchieved = 0;
  const highestProfit = 0;

  // Activation threshold = 0.30 * initialRisk, Trail buffer = 0.15 * initialRisk
  const profitLockActivationThreshold = customActivationThreshold !== undefined && customActivationThreshold > 0
    ? customActivationThreshold
    : Number((initialRisk * 0.30).toFixed(2));

  const trailBuffer = customTrailBuffer !== undefined && customTrailBuffer > 0
    ? customTrailBuffer
    : Number((initialRisk * 0.15).toFixed(2));

  const effectiveStopLoss = safeSL;
  const effectiveTargetPrice = type === "BUY"
    ? Number((safeEntry + nextTarget).toFixed(2))
    : Number((safeEntry - nextTarget).toFixed(2));

  return {
    initialRisk,
    currentReference,
    lockedProfit,
    nextTarget,
    milestonesAchieved,
    highestProfit,
    profitLockActivationThreshold,
    trailBuffer,
    effectiveStopLoss,
    effectiveTargetPrice,
    riskUnitR: initialRisk,
    finalTarget: effectiveTargetPrice,
    trailingStopLoss: safeSL
  };
}

export const initializeRatchetRiskModel = initializeMilestoneRiskModel;

/**
 * Evaluates live market price against compounding milestones, tight trailing protection,
 * and structure-based reversal triggers.
 * Pure function parameterized by direction (BUY/SELL symmetric).
 */
export function computeMilestoneState(
  pos: CompoundingMilestoneInput,
  livePrice: number
): CompoundingMilestoneUpdateResult {
  const currentPrice = Number(livePrice.toFixed(2));
  const { type, entryPrice, initialStopLoss } = pos;

  let initialRisk = pos.initialRisk > 0 ? pos.initialRisk : Math.abs(entryPrice - initialStopLoss);
  if (initialRisk <= 0) initialRisk = 1.0;

  // Calculate current profit ($ distance in profit direction)
  const rawProfit = type === "BUY" ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
  const currentProfit = Number(rawProfit.toFixed(4));

  // Monotonic Peak Profit Tracker (never decreases)
  const updatedHighestProfit = Math.max(
    Number((pos.highestProfit || 0).toFixed(4)),
    currentProfit
  );

  let currentRef = pos.currentReference > 0 ? pos.currentReference : initialRisk;
  let lockedProfit = pos.lockedProfit || 0;
  let nextTarget = pos.nextTarget > 0 ? pos.nextTarget : Number((currentRef * 5).toFixed(2));
  let milestonesAchieved = pos.milestonesAchieved || 0;

  let milestoneAdvancedThisTick = false;

  // Milestone Progression: Check if price has reached or exceeded nextTarget
  while (currentProfit >= Number(nextTarget.toFixed(4))) {
    milestoneAdvancedThisTick = true;
    milestonesAchieved += 1;
    lockedProfit = Number(nextTarget.toFixed(2));
    currentRef = lockedProfit;
    nextTarget = Number((currentRef * 5).toFixed(2));
  }

  // Phase 2 Tight Trail Calculations (Activation = 0.30 * initialRisk, Trail Buffer = 0.15 * initialRisk)
  const activationThreshold = pos.profitLockActivationThreshold !== undefined && pos.profitLockActivationThreshold > 0
    ? pos.profitLockActivationThreshold
    : Number((initialRisk * 0.30).toFixed(2));

  const trailBuffer = pos.trailBuffer !== undefined && pos.trailBuffer > 0
    ? pos.trailBuffer
    : Number((initialRisk * 0.15).toFixed(2));

  const isPhase2Active = updatedHighestProfit >= activationThreshold;

  // Compounding Milestone Floor / Ceiling
  const milestoneStop = type === "BUY"
    ? (milestonesAchieved === 0 ? initialStopLoss : (entryPrice + lockedProfit))
    : (milestonesAchieved === 0 ? initialStopLoss : (entryPrice - lockedProfit));

  // Calculate Tight Trailing Stop Level when Phase 2 is Active
  let tightTrailingStop: number;
  if (type === "BUY") {
    tightTrailingStop = isPhase2Active
      ? Number((entryPrice + (updatedHighestProfit - trailBuffer)).toFixed(2))
      : initialStopLoss;
  } else {
    tightTrailingStop = isPhase2Active
      ? Number((entryPrice - (updatedHighestProfit - trailBuffer)).toFixed(2))
      : initialStopLoss;
  }

  // Determine Most Protective Effective Stop Loss (takes maximum protection & enforces monotonicity)
  let effectiveStopLoss: number;
  const prevSL = pos.stopLossPrice !== undefined ? pos.stopLossPrice : initialStopLoss;

  if (type === "BUY") {
    let candidateSL = isPhase2Active
      ? Math.max(tightTrailingStop, milestoneStop)
      : milestoneStop;
    // Monotonicity: SL only ever moves UP (towards locking more profit)
    effectiveStopLoss = Math.max(prevSL, candidateSL);
  } else {
    // SELL
    let candidateSL = isPhase2Active
      ? Math.min(tightTrailingStop, milestoneStop)
      : milestoneStop;
    // Monotonicity: SL only ever moves DOWN (towards locking more profit)
    effectiveStopLoss = Math.min(prevSL, candidateSL);
  }

  const effectiveTargetPrice = type === "BUY"
    ? Number((entryPrice + nextTarget).toFixed(2))
    : Number((entryPrice - nextTarget).toFixed(2));

  // Exit Check
  let shouldExit = false;
  let exitReason: string | undefined;
  let outcome: "MILESTONE_EXIT" | "HIT_INITIAL_SL" | "STRUCTURE_REVERSAL_FLIP" | undefined;

  // 1. Structure-Based Early Reversal Exit Trigger
  // If trade is in profit and Al Brooks state flips against trade direction
  const isStructureFlipped = pos.structureFlip || (
    type === "BUY"
      ? (pos.marketRegime === "ALWAYS_IN_SHORT")
      : (pos.marketRegime === "ALWAYS_IN_LONG")
  );

  if (currentProfit > 0 && isStructureFlipped) {
    shouldExit = true;
    outcome = "STRUCTURE_REVERSAL_FLIP";
    exitReason = `STRUCTURE_REVERSAL_FLIP (Al Brooks market structure flipped against ${type} to ${pos.marketRegime || "REVERSAL"}, exited early at +${currentProfit} profit)`;
  }
  // 2. Price Trail / Stop Loss Breach Check
  else if (!milestoneAdvancedThisTick) {
    if (type === "BUY") {
      if (currentPrice <= effectiveStopLoss) {
        shouldExit = true;
        if (isPhase2Active || milestonesAchieved > 0) {
          outcome = "MILESTONE_EXIT";
          exitReason = `TIGHT_TRAIL_EXIT (Peak profit +${updatedHighestProfit}, Trail SL ${effectiveStopLoss}, Protected Profit: +${currentProfit})`;
        } else {
          outcome = "HIT_INITIAL_SL";
          exitReason = `HIT_INITIAL_SL (Price ${currentPrice} <= Initial SL ${initialStopLoss})`;
        }
      }
    } else {
      // SELL
      if (currentPrice >= effectiveStopLoss) {
        shouldExit = true;
        if (isPhase2Active || milestonesAchieved > 0) {
          outcome = "MILESTONE_EXIT";
          exitReason = `TIGHT_TRAIL_EXIT (Peak profit +${updatedHighestProfit}, Trail SL ${effectiveStopLoss}, Protected Profit: +${currentProfit})`;
        } else {
          outcome = "HIT_INITIAL_SL";
          exitReason = `HIT_INITIAL_SL (Price ${currentPrice} >= Initial SL ${initialStopLoss})`;
        }
      }
    }
  }

  return {
    updatedInitialRisk: Number(initialRisk.toFixed(2)),
    updatedCurrentReference: Number(currentRef.toFixed(2)),
    updatedLockedProfit: Number(lockedProfit.toFixed(2)),
    updatedNextTarget: Number(nextTarget.toFixed(2)),
    updatedMilestonesAchieved: milestonesAchieved,
    updatedHighestProfit: Number(updatedHighestProfit.toFixed(2)),
    effectiveStopLoss: Number(effectiveStopLoss.toFixed(2)),
    effectiveTargetPrice: Number(effectiveTargetPrice.toFixed(2)),
    currentProfit: Number(currentProfit.toFixed(2)),
    shouldExit,
    exitReason,
    outcome
  };
}

export const computeTrailingStop = computeMilestoneState;
