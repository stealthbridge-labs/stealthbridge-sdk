/**
 * Explicit opt-in platform-fee quotes for future reviewed StealthBridge rails.
 * Does NOT sign, transfer, charge a fee, validate a settlement, or enable
 * Mainnet assets. The collecting contract and asset policy do not yet exist.
 */
import { AssetAmount } from "./amount.js";

export const DEFAULT_PLATFORM_FEE_BPS = 10;
export const MAX_PLATFORM_FEE_BPS = 50;

export interface PlatformFeePolicy {
  /** 10 basis points is 0.10%; never more than 50 (0.50%). */
  readonly basisPoints?: number;
  /** Optional integer cap, denominated in this transfer's asset minor units. */
  readonly maxFeeMinorUnits?: bigint;
}

export interface PlatformFeeQuote {
  readonly asset: AssetAmount["asset"];
  /** Inclusive gross amount entered by the payer. */
  readonly gross: AssetAmount;
  /** Deterministic fee; 0 on dust amounts after round-down. */
  readonly platformFee: AssetAmount;
  /** The amount remaining for the destination after the fee. */
  readonly recipientAmount: AssetAmount;
  readonly basisPoints: number;
  readonly rounding: "down";
  /** Quote only: no contract, token or fee transfer is available. */
  readonly collectionEnabled: false;
}

export class PlatformFeeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformFeeError";
  }
}

/**
 * Preview an *inclusive* potential fee using exact bigint arithmetic.
 * Fees are never implicitly collected, and SDK callers must show the
 * gross/fee/net breakdown to the user before any later signed transfer.
 */
export function quotePlatformFee(
  gross: AssetAmount,
  policy: PlatformFeePolicy = {},
): PlatformFeeQuote {
  if (!(gross instanceof AssetAmount)) {
    throw new PlatformFeeError("Expected an AssetAmount with a validated Testnet asset");
  }
  const basisPoints = policy.basisPoints ?? DEFAULT_PLATFORM_FEE_BPS;
  if (!Number.isSafeInteger(basisPoints) ||
      basisPoints < 0 || basisPoints > MAX_PLATFORM_FEE_BPS) {
    throw new PlatformFeeError("Basis points must be an integer in the reviewed range 0–50");
  }
  if (policy.maxFeeMinorUnits !== undefined &&
      (typeof policy.maxFeeMinorUnits !== "bigint" || policy.maxFeeMinorUnits < 0n)) {
    throw new PlatformFeeError("Fee cap must be a nonnegative bigint in asset minor units");
  }
  let feeUnits = (gross.minorUnits * BigInt(basisPoints)) / 10_000n;
  if (policy.maxFeeMinorUnits !== undefined && feeUnits > policy.maxFeeMinorUnits) {
    feeUnits = policy.maxFeeMinorUnits;
  }
  const fee = new AssetAmount(gross.asset, feeUnits);
  return Object.freeze({
    asset: gross.asset,
    gross,
    platformFee: fee,
    recipientAmount: gross.subtract(fee),
    basisPoints,
    rounding: "down" as const,
    collectionEnabled: false as const,
  });
}
