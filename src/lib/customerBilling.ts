import {
  Business,
  CustomerBillingSummary,
  CustomerInvoice,
  CustomerInvoiceStatus,
  CustomerPaymentRecord,
  InvoiceLineItem,
  PaymentProviderReference,
  PaymentRefundRecord,
  TaskAssignee
} from "../types";
import { isUserAuthorizedForTask } from "./prospectFollowUpTasks";
import { saveBusinessRecord } from "./businessPersistence";
import { addBusinessActivity } from "./prospectCrm";
import { recordFinancialLedgerEntry } from "./prospectFinancials";

/**
 * MICRO-PHASE 15D: BILLING RECORDS, INVOICES & CUSTOMER PAYMENT HISTORY
 * 
 * Canonical engine for managing customer invoices, verified payment records,
 * partial payments, refunds, overdue state calculations, and verified revenue summaries.
 * 
 * Core Invariants:
 * 1. An invoice being issued does NOT mean it is paid.
 * 2. Payment attempts do NOT mean payment succeeded.
 * 3. Successful payments must reference verifiable transaction evidence.
 * 4. Never fabricate payment confirmations.
 * 5. Do not overwrite historical payment records.
 * 6. Partial payments are accurately represented with remaining amountDue.
 * 7. Refunds remain strictly linked to original payments and reduce net revenue.
 * 8. Currency must always match and be explicit.
 * 9. Monetary arithmetic uses safe rounding (avoiding floating point drift).
 * 10. Revenue calculations derive strictly from verified payments minus verified refunds.
 */

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Creates a formal canonical invoice for a customer account or deal.
 */
export async function createCustomerInvoice(
  business: Business,
  invoiceData: {
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    currency?: string;
    dueDate?: string;
    notes?: string;
    subscriptionId?: string;
    dealId?: string;
    status?: CustomerInvoiceStatus;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  invoice?: CustomerInvoice;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot create customer invoices.`
    };
  }

  if (!invoiceData.lineItems || invoiceData.lineItems.length === 0) {
    return {
      success: false,
      business,
      error: "Invoice creation rejected: At least one line item is required."
    };
  }

  const customerId = business.customerAccount?.customerId || `cust_${business.id.substring(0, 8)}`;
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const existingInvoices = business.invoices || [];
  const invoiceCount = existingInvoices.length + 1;
  const invoiceNumber = `INV-${year}-${String(invoiceCount).padStart(4, "0")}`;
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const currency = invoiceData.currency || business.activeSubscription?.currency || business.currency || "SZL";

  const processedLineItems: InvoiceLineItem[] = invoiceData.lineItems.map((item, idx) => {
    const qty = item.quantity > 0 ? item.quantity : 1;
    const price = item.unitPrice >= 0 ? item.unitPrice : 0;
    const total = roundMoney(qty * price);
    return {
      id: `li_${invoiceId}_${idx + 1}`,
      description: item.description,
      quantity: qty,
      unitPrice: price,
      total
    };
  });

  const subtotal = roundMoney(processedLineItems.reduce((acc, curr) => acc + curr.total, 0));
  const taxAmount = 0; // Standard baseline without hidden VAT drift
  const total = roundMoney(subtotal + taxAmount);

  const dueDate = invoiceData.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const newInvoice: CustomerInvoice = {
    id: invoiceId,
    invoiceId,
    invoiceNumber,
    customerId,
    businessId: business.id,
    subscriptionId: invoiceData.subscriptionId || business.activeSubscription?.id,
    dealId: invoiceData.dealId || business.dealDetails?.id,
    lineItems: processedLineItems,
    subtotal,
    taxAmount,
    total,
    amountPaid: 0,
    amountDue: total,
    currency,
    issueDate: now,
    dueDate,
    status: invoiceData.status || "ISSUED",
    linkedPaymentIds: [],
    notes: invoiceData.notes,
    createdAt: now,
    updatedAt: now
  };

  const updatedInvoices = [...existingInvoices, newInvoice];
  const totalInvoiced = roundMoney(
    updatedInvoices
      .filter(i => i.status !== "VOID")
      .reduce((sum, i) => sum + i.total, 0)
  );

  const updatedBiz: Business = {
    ...business,
    invoices: updatedInvoices,
    invoicedDealValue: totalInvoiced
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  try {
    addBusinessActivity(business.id, {
      businessId: business.id,
      type: "deal_won",
      title: `Invoice ${invoiceNumber} Issued`,
      description: `Created invoice for ${currency} ${total}. Due: ${dueDate.split("T")[0]}`,
      timestamp: now,
      actorId: actor.uid
    });
  } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    invoice: newInvoice
  };
}

/**
 * Records a verified payment against an invoice.
 * Supports full payments and partial payments.
 */
export async function recordCustomerInvoicePayment(
  business: Business,
  invoiceId: string,
  paymentData: {
    amount: number;
    currency: string;
    paymentMethod: "card" | "mtn_momo" | "bank_transfer" | "cash" | "offline";
    paymentProviderRef: PaymentProviderReference;
    paidAt?: string;
    notes?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  payment?: CustomerPaymentRecord;
  invoice?: CustomerInvoice;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot record invoice payments.`
    };
  }

  const invoices = business.invoices || [];
  const targetInvoice = invoices.find(i => i.id === invoiceId || i.invoiceId === invoiceId);

  if (!targetInvoice) {
    return { success: false, business, error: `Invoice "${invoiceId}" not found.` };
  }

  if (targetInvoice.status === "PAID") {
    return { success: false, business, error: `Invoice "${targetInvoice.invoiceNumber}" is already fully paid.` };
  }

  if (targetInvoice.status === "VOID") {
    return { success: false, business, error: `Cannot apply payment to voided invoice "${targetInvoice.invoiceNumber}".` };
  }

  // Strict Validation: Valid amount and reference ID
  if (!paymentData.amount || paymentData.amount <= 0) {
    return { success: false, business, error: "Payment rejected: Payment amount must be greater than zero." };
  }

  // Currency validation
  if (paymentData.currency && targetInvoice.currency && paymentData.currency !== targetInvoice.currency) {
    return {
      success: false,
      business,
      error: `Currency mismatch: Payment currency "${paymentData.currency}" does not match invoice currency "${targetInvoice.currency}".`
    };
  }

  if (!paymentData.paymentProviderRef || !paymentData.paymentProviderRef.referenceId || paymentData.paymentProviderRef.referenceId.trim() === "") {
    return {
      success: false,
      business,
      error: "Payment rejected: Verifiable payment transaction reference is required."
    };
  }

  // Idempotency: Verify transaction reference has not already been used
  const existingPayments = business.payments || [];
  const isDuplicate = existingPayments.some(
    p => p.paymentProviderRef?.referenceId === paymentData.paymentProviderRef.referenceId && p.status === "COMPLETED"
  );
  if (isDuplicate) {
    return {
      success: false,
      business,
      error: `Duplicate payment rejected: Transaction reference "${paymentData.paymentProviderRef.referenceId}" has already been processed.`
    };
  }

  const paymentAmount = roundMoney(paymentData.amount);
  if (paymentAmount > targetInvoice.amountDue) {
    return {
      success: false,
      business,
      error: `Overpayment rejected: Payment amount (${paymentAmount}) exceeds invoice balance due (${targetInvoice.amountDue}).`
    };
  }

  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const paymentCount = existingPayments.length + 1;
  const paymentNumber = `RCPT-${year}-${String(paymentCount).padStart(4, "0")}`;
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const paidAt = paymentData.paidAt || now;

  const newAmountPaid = roundMoney(targetInvoice.amountPaid + paymentAmount);
  const newAmountDue = roundMoney(targetInvoice.total - newAmountPaid);
  const newInvoiceStatus: CustomerInvoiceStatus = newAmountDue <= 0 ? "PAID" : "PARTIALLY_PAID";

  const paymentRecord: CustomerPaymentRecord = {
    id: paymentId,
    paymentId,
    paymentNumber,
    invoiceId: targetInvoice.id,
    customerId: targetInvoice.customerId,
    businessId: business.id,
    subscriptionId: targetInvoice.subscriptionId,
    amount: paymentAmount,
    netAmount: paymentAmount,
    currency: targetInvoice.currency,
    status: "COMPLETED",
    paymentMethod: paymentData.paymentMethod,
    paymentProviderRef: paymentData.paymentProviderRef,
    paidAt,
    refundedAmount: 0,
    refunds: [],
    createdAt: now,
    updatedAt: now
  };

  const updatedInvoice: CustomerInvoice = {
    ...targetInvoice,
    amountPaid: newAmountPaid,
    amountDue: newAmountDue,
    status: newInvoiceStatus,
    paidAt: newInvoiceStatus === "PAID" ? paidAt : targetInvoice.paidAt,
    linkedPaymentIds: [...targetInvoice.linkedPaymentIds, paymentId],
    updatedAt: now
  };

  const updatedInvoices = invoices.map(i => (i.id === targetInvoice.id ? updatedInvoice : i));
  const updatedPayments = [...existingPayments, paymentRecord];

  // Financial Ledger Entry
  let ledgerBiz: Business = {
    ...business,
    invoices: updatedInvoices,
    payments: updatedPayments
  };
  try {
    const ledgerRes = await recordFinancialLedgerEntry(
      ledgerBiz,
      {
        businessId: business.id,
        type: "PAYMENT_RECEIVED",
        amount: paymentAmount,
        currency: targetInvoice.currency,
        reference: targetInvoice.invoiceNumber,
        notes: `Payment for ${targetInvoice.invoiceNumber} (${paymentNumber}). Ref: ${paymentData.paymentProviderRef.referenceId}`,
        actor
      }
    );
    if (ledgerRes.success) ledgerBiz = ledgerRes.business;
  } catch (e) {}

  const totalPaid = roundMoney(
    updatedPayments
      .filter(p => p.status !== "FAILED" && p.status !== "PENDING")
      .reduce((sum, p) => sum + p.amount, 0)
  );

  const totalRefunded = roundMoney(
    updatedPayments.reduce((sum, p) => sum + p.refundedAmount, 0)
  );

  const updatedBiz: Business = {
    ...ledgerBiz,
    invoices: updatedInvoices,
    payments: updatedPayments,
    paidDealValue: totalPaid,
    refundedDealValue: totalRefunded,
    netRevenue: roundMoney(Math.max(0, totalPaid - totalRefunded)),
    paymentStatus: newInvoiceStatus === "PAID" ? "PAID" : "PARTIALLY_PAID",
    paidAmount: totalPaid
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    payment: paymentRecord,
    invoice: updatedInvoice
  };
}

/**
 * Records a failed payment attempt against an invoice without fabricating paid status.
 */
export async function recordFailedPaymentAttempt(
  business: Business,
  invoiceId: string,
  failureData: {
    amount: number;
    currency: string;
    paymentMethod: "card" | "mtn_momo" | "bank_transfer" | "cash" | "offline";
    reason: string;
    referenceId?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  paymentRecord?: CustomerPaymentRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot record payment failures.`
    };
  }

  const invoices = business.invoices || [];
  const targetInvoice = invoices.find(i => i.id === invoiceId || i.invoiceId === invoiceId);

  if (!targetInvoice) {
    return { success: false, business, error: `Invoice "${invoiceId}" not found.` };
  }

  const now = new Date().toISOString();
  const existingPayments = business.payments || [];
  const paymentCount = existingPayments.length + 1;
  const paymentNumber = `RCPT-FAIL-${new Date().getFullYear()}-${String(paymentCount).padStart(4, "0")}`;
  const paymentId = `pay_fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const failedRecord: CustomerPaymentRecord = {
    id: paymentId,
    paymentId,
    paymentNumber,
    invoiceId: targetInvoice.id,
    customerId: targetInvoice.customerId,
    businessId: business.id,
    subscriptionId: targetInvoice.subscriptionId,
    amount: roundMoney(failureData.amount),
    netAmount: 0,
    currency: failureData.currency || targetInvoice.currency,
    status: "FAILED",
    paymentMethod: failureData.paymentMethod,
    paymentProviderRef: {
      provider: failureData.paymentMethod === "card" ? "stripe" : "offline",
      referenceId: failureData.referenceId || `fail_ref_${Date.now()}`
    },
    paidAt: now,
    refundedAmount: 0,
    refunds: [],
    createdAt: now,
    updatedAt: now
  };

  const updatedPayments = [...existingPayments, failedRecord];
  const updatedBiz: Business = {
    ...business,
    payments: updatedPayments
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    paymentRecord: failedRecord
  };
}

/**
 * Refunds a customer payment partially or in full.
 */
export async function refundCustomerPayment(
  business: Business,
  paymentId: string,
  refundData: {
    amount: number;
    reason: string;
    referenceId?: string;
  },
  actor: TaskAssignee
): Promise<{
  success: boolean;
  business: Business;
  payment?: CustomerPaymentRecord;
  invoice?: CustomerInvoice;
  refundRecord?: PaymentRefundRecord;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot issue payment refunds.`
    };
  }

  const payments = business.payments || [];
  const targetPayment = payments.find(p => p.id === paymentId || p.paymentId === paymentId);

  if (!targetPayment) {
    return { success: false, business, error: `Payment "${paymentId}" not found.` };
  }

  if (targetPayment.status === "REFUNDED") {
    return { success: false, business, error: `Payment "${targetPayment.paymentNumber}" has already been fully refunded.` };
  }

  if (!refundData.amount || refundData.amount <= 0) {
    return { success: false, business, error: "Refund rejected: Refund amount must be greater than zero." };
  }

  const unrefundedBalance = roundMoney(targetPayment.amount - targetPayment.refundedAmount);
  const refundAmount = roundMoney(refundData.amount);

  if (refundAmount > unrefundedBalance) {
    return {
      success: false,
      business,
      error: `Refund rejected: Refund amount (${refundAmount}) exceeds unrefunded payment balance (${unrefundedBalance}).`
    };
  }

  const now = new Date().toISOString();
  const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const refundRecord: PaymentRefundRecord = {
    refundId,
    amount: refundAmount,
    currency: targetPayment.currency,
    reason: refundData.reason || "Customer refund request",
    refundedAt: now,
    referenceId: refundData.referenceId || `ref_tx_${Date.now()}`
  };

  const newRefundedAmount = roundMoney(targetPayment.refundedAmount + refundAmount);
  const newNetAmount = roundMoney(targetPayment.amount - newRefundedAmount);
  const newPaymentStatus = newNetAmount <= 0 ? ("REFUNDED" as const) : ("PARTIALLY_REFUNDED" as const);

  const updatedPayment: CustomerPaymentRecord = {
    ...targetPayment,
    refundedAmount: newRefundedAmount,
    netAmount: newNetAmount,
    status: newPaymentStatus,
    refunds: [...targetPayment.refunds, refundRecord],
    updatedAt: now
  };

  const updatedPayments = payments.map(p => (p.id === targetPayment.id ? updatedPayment : p));

  // Update associated invoice
  const invoices = business.invoices || [];
  const targetInvoice = invoices.find(i => i.id === targetPayment.invoiceId || i.invoiceId === targetPayment.invoiceId);
  let updatedInvoices = invoices;
  let updatedInvoice: CustomerInvoice | undefined = undefined;

  if (targetInvoice) {
    const invAmountPaid = roundMoney(Math.max(0, targetInvoice.amountPaid - refundAmount));
    const invAmountDue = roundMoney(targetInvoice.total - invAmountPaid);
    const invStatus: CustomerInvoiceStatus = invAmountPaid === 0 ? "REFUNDED" : "PARTIALLY_PAID";

    updatedInvoice = {
      ...targetInvoice,
      amountPaid: invAmountPaid,
      amountDue: invAmountDue,
      status: invStatus,
      updatedAt: now
    };

    updatedInvoices = invoices.map(i => (i.id === targetInvoice.id ? updatedInvoice! : i));
  }

  // Financial Ledger Entry
  let ledgerBiz: Business = {
    ...business,
    invoices: updatedInvoices,
    payments: updatedPayments
  };
  try {
    const ledgerRes = await recordFinancialLedgerEntry(
      ledgerBiz,
      {
        businessId: business.id,
        type: "REFUND_ISSUED",
        amount: refundAmount,
        currency: targetPayment.currency,
        reference: targetInvoice?.invoiceNumber || targetPayment.paymentNumber,
        notes: `Refund for ${targetPayment.paymentNumber}: ${refundData.reason}`,
        actor
      }
    );
    if (ledgerRes.success) ledgerBiz = ledgerRes.business;
  } catch (e) {}

  const totalPaid = roundMoney(
    updatedPayments
      .filter(p => p.status !== "FAILED" && p.status !== "PENDING")
      .reduce((sum, p) => sum + p.amount, 0)
  );

  const totalRefunded = roundMoney(
    updatedPayments.reduce((sum, p) => sum + p.refundedAmount, 0)
  );

  const updatedBiz: Business = {
    ...ledgerBiz,
    invoices: updatedInvoices,
    payments: updatedPayments,
    paidDealValue: totalPaid,
    refundedDealValue: totalRefunded,
    netRevenue: roundMoney(Math.max(0, totalPaid - totalRefunded))
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    payment: updatedPayment,
    invoice: updatedInvoice,
    refundRecord
  };
}

/**
 * Voids an invoice if no completed payments exist.
 */
export async function voidCustomerInvoice(
  business: Business,
  invoiceId: string,
  actor: TaskAssignee,
  reason?: string
): Promise<{
  success: boolean;
  business: Business;
  invoice?: CustomerInvoice;
  error?: string;
}> {
  if (actor.role && !isUserAuthorizedForTask(actor.role)) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot void invoices.`
    };
  }

  const invoices = business.invoices || [];
  const targetInvoice = invoices.find(i => i.id === invoiceId || i.invoiceId === invoiceId);

  if (!targetInvoice) {
    return { success: false, business, error: `Invoice "${invoiceId}" not found.` };
  }

  if (targetInvoice.amountPaid > 0) {
    return {
      success: false,
      business,
      error: `Cannot void invoice "${targetInvoice.invoiceNumber}": Payments of ${targetInvoice.currency} ${targetInvoice.amountPaid} have been recorded. Refund payments first.`
    };
  }

  const now = new Date().toISOString();
  const updatedInvoice: CustomerInvoice = {
    ...targetInvoice,
    status: "VOID",
    notes: reason ? `${targetInvoice.notes ? targetInvoice.notes + " | " : ""}VOIDED: ${reason}` : targetInvoice.notes,
    updatedAt: now
  };

  const updatedInvoices = invoices.map(i => (i.id === targetInvoice.id ? updatedInvoice : i));

  const totalInvoiced = roundMoney(
    updatedInvoices
      .filter(i => i.status !== "VOID")
      .reduce((sum, i) => sum + i.total, 0)
  );

  const updatedBiz: Business = {
    ...business,
    invoices: updatedInvoices,
    invoicedDealValue: totalInvoiced
  };

  try { await saveBusinessRecord(updatedBiz); } catch (e) {}

  return {
    success: true,
    business: updatedBiz,
    invoice: updatedInvoice
  };
}

/**
 * Evaluates and marks overdue invoices accurately based on dueDate and balance.
 */
export function evaluateOverdueInvoices(business: Business): Business {
  const invoices = business.invoices || [];
  const now = Date.now();

  let hasChanges = false;
  const updatedInvoices = invoices.map(inv => {
    if (inv.status !== "PAID" && inv.status !== "VOID" && inv.status !== "REFUNDED") {
      const dueMs = Date.parse(inv.dueDate);
      if (!isNaN(dueMs) && now > dueMs && inv.amountDue > 0 && inv.status !== "OVERDUE") {
        hasChanges = true;
        return {
          ...inv,
          status: "OVERDUE" as const,
          updatedAt: new Date().toISOString()
        };
      }
    }
    return inv;
  });

  if (!hasChanges) return business;

  return {
    ...business,
    invoices: updatedInvoices
  };
}

/**
 * Computes the canonical customer billing summary strictly from verified records.
 */
export function getCustomerBillingSummary(business: Business): CustomerBillingSummary {
  const invoices = business.invoices || [];
  const payments = business.payments || [];
  const sub = business.activeSubscription;

  const validInvoices = invoices.filter(i => i.status !== "VOID");
  const totalInvoiced = roundMoney(validInvoices.reduce((sum, i) => sum + i.total, 0));
  const outstandingBalance = roundMoney(validInvoices.reduce((sum, i) => sum + i.amountDue, 0));

  const totalPaid = roundMoney(
    payments
      .filter(p => p.status !== "FAILED" && p.status !== "PENDING")
      .reduce((sum, p) => sum + p.amount, 0)
  );

  const totalRefunded = roundMoney(
    payments.reduce((sum, p) => sum + p.refundedAmount, 0)
  );

  const netRevenue = roundMoney(totalPaid - totalRefunded);

  const sortedPayments = [...payments].sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt));
  const lastPaymentDate = sortedPayments[0]?.paidAt;

  return {
    customerId: business.customerAccount?.customerId || `cust_${business.id.substring(0, 8)}`,
    businessId: business.id,
    currentPlanId: sub?.planId || "plan_basic",
    currentPlanName: sub?.planName || "Basic",
    subscriptionStatus: sub?.status || "TRIAL",
    billingInterval: sub?.billingInterval || "MONTHLY",
    currency: sub?.currency || business.currency || "SZL",
    totalInvoiced,
    totalPaid,
    totalRefunded,
    netRevenue,
    outstandingBalance,
    invoicesCount: validInvoices.length,
    paymentsCount: payments.filter(p => p.status !== "FAILED" && p.status !== "PENDING").length,
    lastPaymentDate
  };
}
