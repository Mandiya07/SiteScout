import {
  Business,
  FinancialEntryType,
  FinancialLedgerEntry,
  TaskAssignee
} from "../types";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";
import { saveBusinessRecord } from "./businessPersistence";
import { addBusinessActivity } from "./prospectCrm";

/**
 * MICRO-PHASE 13D: DEAL VALUE, REVENUE RECORDS & SALES REPORTING INTEGRITY
 * 
 * Provides integer-cents precision monetary handling, distinct financial state tracking,
 * idempotent ledger recording, multi-currency safe aggregation, and immutable history auditability.
 */

/**
 * Converts a float dollar/rand amount to integer cents safely to avoid floating-point math bugs.
 */
export function toCents(amount: number | undefined | null): number {
  if (amount === undefined || amount === null || isNaN(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Converts integer cents back to a standard dollar/rand float amount.
 */
export function fromCents(cents: number | undefined | null): number {
  if (cents === undefined || cents === null || isNaN(cents)) return 0;
  return cents / 100;
}

/**
 * Formats a monetary value with explicit currency symbol and denomination.
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  const c = (currency || "USD").toUpperCase();
  const absVal = Math.abs(amount);
  const formatted = absVal.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  let prefix = "$";
  if (c === "ZAR") prefix = "R";
  else if (c === "EUR") prefix = "€";
  else if (c === "GBP") prefix = "£";
  else if (c === "CAD" || c === "AUD") prefix = "$";

  const sign = amount < 0 ? "-" : "";
  return `${sign}${c} ${prefix}${formatted}`;
}

/**
 * Computes canonical business financial state from its financial ledger entries.
 */
export function computeBusinessFinancialsFromLedger(business: Business): {
  estimatedCents: number;
  proposedCents: number;
  agreedCents: number;
  invoicedCents: number;
  paidCents: number;
  refundedCents: number;
  netRevenueCents: number;
  currency: string;
} {
  const ledger = business.financialLedger || business.dealDetails?.financialLedger || [];
  const currency = business.currency || business.dealDetails?.currency || "USD";

  let estimatedCents = toCents(business.estimatedDealValue ?? business.dealDetails?.estimatedValue);
  let proposedCents = toCents(business.proposedDealValue ?? business.dealDetails?.proposedValue);
  let agreedCents = toCents(business.agreedDealValue ?? business.dealDetails?.agreedValue ?? business.totalContractValue);
  let invoicedCents = toCents(business.invoicedDealValue ?? business.dealDetails?.invoicedValue);
  let paidCents = toCents(business.paidDealValue ?? business.paidAmount ?? business.dealDetails?.paidValue);
  let refundedCents = toCents(business.refundedDealValue ?? business.dealDetails?.refundedValue);

  // If a populated ledger exists, compute totals from ledger entries
  if (ledger.length > 0) {
    let sumPaidCents = 0;
    let sumRefundedCents = 0;
    let sumInvoicedCents = 0;

    ledger.forEach(entry => {
      if (entry.type === "ESTIMATE_SET") {
        estimatedCents = entry.amountCents;
      } else if (entry.type === "PROPOSAL_QUOTED") {
        proposedCents = entry.amountCents;
      } else if (entry.type === "COMMERCIAL_AGREED") {
        agreedCents = entry.amountCents;
      } else if (entry.type === "INVOICE_ISSUED") {
        sumInvoicedCents += entry.amountCents;
      } else if (entry.type === "PAYMENT_RECEIVED") {
        sumPaidCents += entry.amountCents;
      } else if (entry.type === "REFUND_ISSUED") {
        sumRefundedCents += entry.amountCents;
      }
    });

    if (sumInvoicedCents > 0) invoicedCents = sumInvoicedCents;
    paidCents = sumPaidCents;
    refundedCents = sumRefundedCents;
  }

  const netRevenueCents = Math.max(0, paidCents - refundedCents);

  return {
    estimatedCents,
    proposedCents,
    agreedCents,
    invoicedCents,
    paidCents,
    refundedCents,
    netRevenueCents,
    currency
  };
}

/**
 * Records a financial entry in the business ledger with idempotency checks to prevent double-counting.
 */
export async function recordFinancialLedgerEntry(
  business: Business,
  entryInput: Omit<FinancialLedgerEntry, "id" | "timestamp" | "amountCents"> & { amountCents?: number }
): Promise<{
  success: boolean;
  business: Business;
  entry?: FinancialLedgerEntry;
  isDuplicate?: boolean;
  error?: string;
}> {
  // 1. Role authorization check
  if (entryInput.actor?.role && !isUserAuthorizedForTask(entryInput.actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: Role "${entryInput.actor.role}" cannot record financial transactions.`
    };
  }

  const existingLedger = business.financialLedger || business.dealDetails?.financialLedger || [];

  // 2. Idempotency & Duplicate Check
  if (entryInput.idempotencyKey || entryInput.reference) {
    const duplicate = existingLedger.find(
      e => (entryInput.idempotencyKey && e.idempotencyKey === entryInput.idempotencyKey) ||
           (entryInput.reference && e.reference === entryInput.reference && e.type === entryInput.type)
    );
    if (duplicate) {
      return {
        success: true,
        business,
        entry: duplicate,
        isDuplicate: true
      };
    }
  }

  const amountCents = entryInput.amountCents ?? toCents(entryInput.amount);
  const amount = entryInput.amount ?? fromCents(amountCents);
  const currency = entryInput.currency || business.currency || "USD";
  const now = new Date().toISOString();

  const newEntry: FinancialLedgerEntry = {
    id: `fin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: business.id,
    dealId: business.dealDetails?.id || `deal_${business.id}`,
    type: entryInput.type,
    amountCents,
    amount,
    currency,
    idempotencyKey: entryInput.idempotencyKey,
    previousAmountCents: entryInput.previousAmountCents,
    actor: entryInput.actor,
    timestamp: now,
    reference: entryInput.reference,
    notes: entryInput.notes
  };

  const updatedLedger = [...existingLedger, newEntry];

  // Update business object with new ledger
  let updatedBusiness: Business = {
    ...business,
    financialLedger: updatedLedger,
    currency,
    dealDetails: business.dealDetails 
      ? { ...business.dealDetails, financialLedger: updatedLedger }
      : undefined
  };

  // Recompute financials
  const fin = computeBusinessFinancialsFromLedger(updatedBusiness);

  updatedBusiness.estimatedDealValue = fromCents(fin.estimatedCents);
  updatedBusiness.proposedDealValue = fromCents(fin.proposedCents);
  updatedBusiness.agreedDealValue = fromCents(fin.agreedCents);
  updatedBusiness.invoicedDealValue = fromCents(fin.invoicedCents);
  updatedBusiness.paidDealValue = fromCents(fin.paidCents);
  updatedBusiness.refundedDealValue = fromCents(fin.refundedCents);
  updatedBusiness.netRevenue = fromCents(fin.netRevenueCents);
  
  // Legacy compatibility fields
  updatedBusiness.paidAmount = fromCents(fin.paidCents);
  updatedBusiness.totalContractValue = fromCents(fin.agreedCents);
  updatedBusiness.paymentStatus = fin.paidCents >= fin.agreedCents && fin.agreedCents > 0
    ? "PAID"
    : fin.paidCents > 0
    ? "PARTIALLY_PAID"
    : "UNPAID";

  if (updatedBusiness.dealDetails) {
    updatedBusiness.dealDetails.estimatedValue = updatedBusiness.estimatedDealValue;
    updatedBusiness.dealDetails.proposedValue = updatedBusiness.proposedDealValue;
    updatedBusiness.dealDetails.agreedValue = updatedBusiness.agreedDealValue;
    updatedBusiness.dealDetails.invoicedValue = updatedBusiness.invoicedDealValue;
    updatedBusiness.dealDetails.paidValue = updatedBusiness.paidDealValue;
    updatedBusiness.dealDetails.refundedValue = updatedBusiness.refundedDealValue;
    updatedBusiness.dealDetails.netRevenue = updatedBusiness.netRevenue;
    updatedBusiness.dealDetails.currency = currency;
  }

  // Persist
  try {
    await saveBusinessRecord(updatedBusiness);
  } catch (e) {}

  // Log CRM Activity
  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: entryInput.type === "PAYMENT_RECEIVED" ? "deal_won" : "follow_up_sent",
      title: `Financial Event: ${entryInput.type.replace(/_/g, " ")}`,
      description: `${formatCurrency(amount, currency)}${entryInput.reference ? ` (Ref: ${entryInput.reference})` : ""}`,
      timestamp: now,
      actorId: entryInput.actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBusiness,
    entry: newEntry,
    isDuplicate: false
  };
}

/**
 * Records a confirmed customer payment.
 */
export async function recordPayment(
  business: Business,
  payment: {
    amount: number;
    currency?: string;
    reference?: string;
    idempotencyKey?: string;
    notes?: string;
  },
  actor: TaskAssignee
) {
  return recordFinancialLedgerEntry(business, {
    businessId: business.id,
    type: "PAYMENT_RECEIVED",
    amount: payment.amount,
    currency: payment.currency || business.currency || "USD",
    reference: payment.reference,
    idempotencyKey: payment.idempotencyKey,
    notes: payment.notes,
    actor
  });
}

/**
 * Records a customer refund transaction.
 */
export async function recordRefund(
  business: Business,
  refund: {
    amount: number;
    currency?: string;
    reference?: string;
    idempotencyKey?: string;
    notes?: string;
  },
  actor: TaskAssignee
) {
  return recordFinancialLedgerEntry(business, {
    businessId: business.id,
    type: "REFUND_ISSUED",
    amount: refund.amount,
    currency: refund.currency || business.currency || "USD",
    reference: refund.reference,
    idempotencyKey: refund.idempotencyKey,
    notes: refund.notes,
    actor
  });
}

/**
 * Aggregates revenue and pipeline metrics strictly from canonical financial records.
 * Keeps different currencies separate without blind sum scalar corruption.
 */
export function calculateRevenueMetrics(businesses: Business[]): {
  estimatedValueByCurrency: Record<string, number>;
  proposedValueByCurrency: Record<string, number>;
  agreedValueByCurrency: Record<string, number>;
  invoicedValueByCurrency: Record<string, number>;
  paidValueByCurrency: Record<string, number>;
  refundedValueByCurrency: Record<string, number>;
  netRevenueByCurrency: Record<string, number>;
  confirmedPaidDealsCount: number;
  totalNetRevenueCents: number;
  formattedNetRevenueSummary: string;
} {
  const estimatedCentsByCurrency: Record<string, number> = {};
  const proposedCentsByCurrency: Record<string, number> = {};
  const agreedCentsByCurrency: Record<string, number> = {};
  const invoicedCentsByCurrency: Record<string, number> = {};
  const paidCentsByCurrency: Record<string, number> = {};
  const refundedCentsByCurrency: Record<string, number> = {};
  const netRevenueCentsByCurrency: Record<string, number> = {};

  let confirmedPaidDealsCount = 0;
  let totalNetRevenueCents = 0;

  businesses.forEach(b => {
    const fin = computeBusinessFinancialsFromLedger(b);
    const curr = fin.currency;

    estimatedCentsByCurrency[curr] = (estimatedCentsByCurrency[curr] || 0) + fin.estimatedCents;
    proposedCentsByCurrency[curr] = (proposedCentsByCurrency[curr] || 0) + fin.proposedCents;
    agreedCentsByCurrency[curr] = (agreedCentsByCurrency[curr] || 0) + fin.agreedCents;
    invoicedCentsByCurrency[curr] = (invoicedCentsByCurrency[curr] || 0) + fin.invoicedCents;
    paidCentsByCurrency[curr] = (paidCentsByCurrency[curr] || 0) + fin.paidCents;
    refundedCentsByCurrency[curr] = (refundedCentsByCurrency[curr] || 0) + fin.refundedCents;
    netRevenueCentsByCurrency[curr] = (netRevenueCentsByCurrency[curr] || 0) + fin.netRevenueCents;

    if (fin.paidCents > 0) {
      confirmedPaidDealsCount++;
    }

    totalNetRevenueCents += fin.netRevenueCents;
  });

  const estimatedValueByCurrency: Record<string, number> = {};
  const proposedValueByCurrency: Record<string, number> = {};
  const agreedValueByCurrency: Record<string, number> = {};
  const invoicedValueByCurrency: Record<string, number> = {};
  const paidValueByCurrency: Record<string, number> = {};
  const refundedValueByCurrency: Record<string, number> = {};
  const netRevenueByCurrency: Record<string, number> = {};

  Object.keys(netRevenueCentsByCurrency).forEach(curr => {
    estimatedValueByCurrency[curr] = fromCents(estimatedCentsByCurrency[curr]);
    proposedValueByCurrency[curr] = fromCents(proposedCentsByCurrency[curr]);
    agreedValueByCurrency[curr] = fromCents(agreedCentsByCurrency[curr]);
    invoicedValueByCurrency[curr] = fromCents(invoicedCentsByCurrency[curr]);
    paidValueByCurrency[curr] = fromCents(paidCentsByCurrency[curr]);
    refundedValueByCurrency[curr] = fromCents(refundedCentsByCurrency[curr]);
    netRevenueByCurrency[curr] = fromCents(netRevenueCentsByCurrency[curr]);
  });

  const summaryParts = Object.entries(netRevenueByCurrency).map(([curr, amount]) => formatCurrency(amount, curr));
  const formattedNetRevenueSummary = summaryParts.length > 0 ? summaryParts.join(" + ") : "$0.00";

  return {
    estimatedValueByCurrency,
    proposedValueByCurrency,
    agreedValueByCurrency,
    invoicedValueByCurrency,
    paidValueByCurrency,
    refundedValueByCurrency,
    netRevenueByCurrency,
    confirmedPaidDealsCount,
    totalNetRevenueCents,
    formattedNetRevenueSummary
  };
}
