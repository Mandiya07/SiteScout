import { detectCountryFromLocation } from "./countryCurrency";

/**
 * Detects dial code, country code, and country name from raw phone or location string.
 */
export function detectCountryDialCode(addressOrCountry: string = "", rawPhone: string = ""): { dialCode: string; countryCode: string; countryName: string } {
  const phoneClean = rawPhone.trim();
  
  // 1. Direct dial code prefix match on raw phone string starting with '+'
  if (phoneClean.startsWith("+")) {
    const digits = phoneClean.replace(/[^0-9]/g, "");
    if (digits.startsWith("27")) return { dialCode: "27", countryCode: "ZA", countryName: "South Africa" };
    if (digits.startsWith("44")) return { dialCode: "44", countryCode: "GB", countryName: "United Kingdom" };
    if (digits.startsWith("268")) return { dialCode: "268", countryCode: "SZ", countryName: "Eswatini" };
    if (digits.startsWith("254")) return { dialCode: "254", countryCode: "KE", countryName: "Kenya" };
    if (digits.startsWith("234")) return { dialCode: "234", countryCode: "NG", countryName: "Nigeria" };
    if (digits.startsWith("61")) return { dialCode: "61", countryCode: "AU", countryName: "Australia" };
    if (digits.startsWith("91")) return { dialCode: "91", countryCode: "IN", countryName: "India" };
    if (digits.startsWith("49")) return { dialCode: "49", countryCode: "DE", countryName: "Germany" };
    if (digits.startsWith("33")) return { dialCode: "33", countryCode: "FR", countryName: "France" };
    if (digits.startsWith("971")) return { dialCode: "971", countryCode: "AE", countryName: "United Arab Emirates" };
    if (digits.startsWith("1")) return { dialCode: "1", countryCode: "US", countryName: "United States" };
  }

  // 2. Infer from address / location text
  if (addressOrCountry) {
    const countryConfig = detectCountryFromLocation(addressOrCountry);
    const prefixDigits = countryConfig.phonePrefix.replace(/[^0-9]/g, "");
    if (prefixDigits) {
      let dialCode = prefixDigits;
      if (prefixDigits.startsWith("27")) dialCode = "27";
      else if (prefixDigits.startsWith("44")) dialCode = "44";
      else if (prefixDigits.startsWith("268")) dialCode = "268";
      else if (prefixDigits.startsWith("254")) dialCode = "254";
      else if (prefixDigits.startsWith("234")) dialCode = "234";
      else if (prefixDigits.startsWith("61")) dialCode = "61";
      else if (prefixDigits.startsWith("91")) dialCode = "91";
      else if (prefixDigits.startsWith("49")) dialCode = "49";
      else if (prefixDigits.startsWith("33")) dialCode = "33";
      else if (prefixDigits.startsWith("971")) dialCode = "971";
      else if (prefixDigits.startsWith("1")) dialCode = "1";

      return {
        dialCode,
        countryCode: countryConfig.countryCode,
        countryName: countryConfig.countryName
      };
    }
  }

  // 3. Fallback heuristic based on raw digit count
  const rawDigits = phoneClean.replace(/[^0-9]/g, "");
  if (rawDigits.length === 10 && !rawDigits.startsWith("0")) {
    return { dialCode: "1", countryCode: "US", countryName: "United States" };
  }

  return { dialCode: "27", countryCode: "ZA", countryName: "South Africa" };
}

/**
 * Centralized E.164 phone normalizer with country detection.
 * Converts raw local formats (e.g., "082 123 4567", "07123 456789", "(555) 123-4567")
 * to clean international E.164 digits without leading '+', suitable for wa.me/ links.
 */
export function normalizePhoneNumber(phone?: string, addressOrCountry?: string): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (!trimmed) return "";

  // If already starts with '+', strip '+' and clean non-digits
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/[^0-9]/g, "");
  }

  const rawDigits = trimmed.replace(/[^0-9]/g, "");
  if (!rawDigits) return "";

  const { dialCode } = detectCountryDialCode(addressOrCountry, trimmed);

  // If rawDigits already starts with dialCode and has adequate length
  if (rawDigits.startsWith(dialCode) && rawDigits.length >= dialCode.length + 8) {
    return rawDigits;
  }

  // Handle local leading '0' (e.g. 082 123 4567 -> 821234567 -> 27821234567)
  if (rawDigits.startsWith("0")) {
    const withoutZero = rawDigits.slice(1);
    return `${dialCode}${withoutZero}`;
  }

  // Handle 10-digit national numbers without leading zero (e.g., US 5551234567 -> 15551234567)
  if (rawDigits.length === 10 && !rawDigits.startsWith(dialCode)) {
    return `${dialCode}${rawDigits}`;
  }

  return rawDigits.length < 9 ? `${dialCode}${rawDigits}` : rawDigits;
}

/**
 * Returns formatted E.164 phone string with leading + (e.g. +27821234567).
 */
export function formatE164Phone(phone?: string, addressOrCountry?: string): string {
  const clean = normalizePhoneNumber(phone, addressOrCountry);
  return clean ? `+${clean}` : "";
}

/**
 * Centralized WhatsApp link generator with country detection and safe message encoding.
 */
export function generateWhatsappLink(phone?: string, message?: string, addressOrCountry?: string): string {
  const cleanNumber = normalizePhoneNumber(phone, addressOrCountry);
  const encodedText = message ? `?text=${encodeURIComponent(message)}` : "";
  
  if (!cleanNumber) {
    return `https://wa.me/${encodedText}`;
  }
  
  return `https://wa.me/${cleanNumber}${encodedText}`;
}

/**
 * Formats phone number cleanly for UI display (e.g., "+27 82 123 4567", "+44 7123 456789", "+1 (555) 123-4567").
 */
export function formatDisplayPhone(phone?: string, addressOrCountry?: string): string {
  if (!phone) return "";
  const e164 = formatE164Phone(phone, addressOrCountry);
  if (!e164) return phone;

  // Format +27 82 123 4567
  if (e164.startsWith("+27") && e164.length === 12) {
    return `${e164.slice(0, 3)} ${e164.slice(3, 5)} ${e164.slice(5, 8)} ${e164.slice(8)}`;
  }
  // Format +44 7123 456789
  if (e164.startsWith("+44") && e164.length === 13) {
    return `${e164.slice(0, 3)} ${e164.slice(3, 7)} ${e164.slice(7)}`;
  }
  // Format +1 (555) 123-4567
  if (e164.startsWith("+1") && e164.length === 12) {
    return `+1 (${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`;
  }

  return e164;
}
