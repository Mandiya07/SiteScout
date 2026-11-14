import { detectCountryFromLocation } from "./countryCurrency";

function isUnlistedPhone(phone?: string): boolean {
  if (!phone) return true;
  const trimmed = phone.trim().toLowerCase();
  return !trimmed || trimmed === "unlisted" || trimmed === "none" || trimmed === "n/a" || trimmed === "not available";
}

const DIAL_CODE_TABLE: Array<{ dialCode: string; countryCode: string; countryName: string }> = [
  { dialCode: "971", countryCode: "AE", countryName: "United Arab Emirates" },
  { dialCode: "353", countryCode: "IE", countryName: "Ireland" },
  { dialCode: "351", countryCode: "PT", countryName: "Portugal" },
  { dialCode: "268", countryCode: "SZ", countryName: "Eswatini" },
  { dialCode: "267", countryCode: "BW", countryName: "Botswana" },
  { dialCode: "266", countryCode: "LS", countryName: "Lesotho" },
  { dialCode: "264", countryCode: "NA", countryName: "Namibia" },
  { dialCode: "263", countryCode: "ZW", countryName: "Zimbabwe" },
  { dialCode: "260", countryCode: "ZM", countryName: "Zambia" },
  { dialCode: "258", countryCode: "MZ", countryName: "Mozambique" },
  { dialCode: "254", countryCode: "KE", countryName: "Kenya" },
  { dialCode: "234", countryCode: "NG", countryName: "Nigeria" },
  { dialCode: "233", countryCode: "GH", countryName: "Ghana" },
  { dialCode: "91", countryCode: "IN", countryName: "India" },
  { dialCode: "81", countryCode: "JP", countryName: "Japan" },
  { dialCode: "65", countryCode: "SG", countryName: "Singapore" },
  { dialCode: "64", countryCode: "NZ", countryName: "New Zealand" },
  { dialCode: "61", countryCode: "AU", countryName: "Australia" },
  { dialCode: "55", countryCode: "BR", countryName: "Brazil" },
  { dialCode: "49", countryCode: "DE", countryName: "Germany" },
  { dialCode: "44", countryCode: "GB", countryName: "United Kingdom" },
  { dialCode: "43", countryCode: "AT", countryName: "Austria" },
  { dialCode: "41", countryCode: "CH", countryName: "Switzerland" },
  { dialCode: "39", countryCode: "IT", countryName: "Italy" },
  { dialCode: "34", countryCode: "ES", countryName: "Spain" },
  { dialCode: "33", countryCode: "FR", countryName: "France" },
  { dialCode: "32", countryCode: "BE", countryName: "Belgium" },
  { dialCode: "31", countryCode: "NL", countryName: "Netherlands" },
  { dialCode: "27", countryCode: "ZA", countryName: "South Africa" },
  { dialCode: "1", countryCode: "US", countryName: "United States" },
];

/**
 * Detects dial code, country code, and country name from raw phone or location string.
 */
export function detectCountryDialCode(addressOrCountry: string = "", rawPhone: string = ""): { dialCode: string; countryCode: string; countryName: string } {
  const phoneClean = rawPhone.trim();

  // 1. Direct dial code prefix match on raw phone string starting with '+'
  if (phoneClean.startsWith("+")) {
    const digits = phoneClean.replace(/[^0-9]/g, "");
    for (const entry of DIAL_CODE_TABLE) {
      if (digits.startsWith(entry.dialCode)) {
        return { ...entry };
      }
    }
  }

  // 2. Infer from address / location text
  if (addressOrCountry) {
    const countryConfig = detectCountryFromLocation(addressOrCountry);
    const prefixDigits = countryConfig.phonePrefix.replace(/[^0-9]/g, "");
    if (prefixDigits) {
      let dialCode = prefixDigits;
      for (const entry of DIAL_CODE_TABLE) {
        if (prefixDigits.startsWith(entry.dialCode)) {
          dialCode = entry.dialCode;
          break;
        }
      }

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
 * Converts raw local formats (e.g., "082 123 4567", "07123 456789", "(512) 480-1234")
 * to clean international E.164 digits without leading '+', suitable for wa.me/ links.
 * Returns empty string for "Unlisted" or invalid/empty placeholders.
 */
export function normalizePhoneNumber(phone?: string, addressOrCountry?: string): string {
  if (isUnlistedPhone(phone)) return "";
  const trimmed = phone!.trim();

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

  // Handle 10-digit national numbers without leading zero (e.g., US/CA 5124801234 -> 15124801234)
  if (rawDigits.length === 10 && !rawDigits.startsWith(dialCode)) {
    return `${dialCode}${rawDigits}`;
  }

  return rawDigits.length < 9 ? `${dialCode}${rawDigits}` : rawDigits;
}

/**
 * Returns formatted E.164 phone string with leading + (e.g. +27821234567).
 */
export function formatE164Phone(phone?: string, addressOrCountry?: string): string {
  if (isUnlistedPhone(phone)) return "";
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
 * Formats phone number cleanly for UI display globally (e.g., "+268 2404 1234", "+27 82 123 4567", "+44 20 7946 0000", "+1 (512) 480-1234").
 */
export function formatDisplayPhone(phone?: string, addressOrCountry?: string): string {
  if (!phone) return "";
  if (isUnlistedPhone(phone)) return "Unlisted";
  const e164 = formatE164Phone(phone, addressOrCountry);
  if (!e164) return phone;

  // Format Eswatini +268 2404 1234 / +268 7604 1234
  if (e164.startsWith("+268") && e164.length === 12) {
    return `${e164.slice(0, 4)} ${e164.slice(4, 8)} ${e164.slice(8)}`;
  }

  // Format South Africa +27 82 123 4567
  if (e164.startsWith("+27") && e164.length === 12) {
    return `${e164.slice(0, 3)} ${e164.slice(3, 5)} ${e164.slice(5, 8)} ${e164.slice(8)}`;
  }

  // Format UK +44: London (+44 20 XXXX XXXX), 3-digit area (+44 161 XXX XXXX), or Mobile (+44 7XXX XXXXXX)
  if (e164.startsWith("+44") && e164.length === 13) {
    const nsn = e164.slice(3);
    if (nsn.startsWith("20")) {
      return `+44 20 ${nsn.slice(2, 6)} ${nsn.slice(6)}`;
    }
    if (nsn.startsWith("7")) {
      return `+44 ${nsn.slice(0, 4)} ${nsn.slice(4)}`;
    }
    return `+44 ${nsn.slice(0, 3)} ${nsn.slice(3, 6)} ${nsn.slice(6)}`;
  }

  // Format North America +1 (XXX) XXX-XXXX
  if (e164.startsWith("+1") && e164.length === 12) {
    return `+1 (${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`;
  }

  // Format Australia +61 4XX XXX XXX or +61 X XXXX XXXX
  if (e164.startsWith("+61") && e164.length === 12) {
    const nsn = e164.slice(3);
    if (nsn.startsWith("4")) {
      return `+61 ${nsn.slice(0, 3)} ${nsn.slice(3, 6)} ${nsn.slice(6)}`;
    }
    return `+61 ${nsn.slice(0, 1)} ${nsn.slice(1, 5)} ${nsn.slice(5)}`;
  }

  // Format Kenya +254 / Nigeria +234 / UAE +971
  if (e164.startsWith("+254") && e164.length === 13) {
    return `+254 ${e164.slice(4, 7)} ${e164.slice(7)}`;
  }
  if (e164.startsWith("+234") && (e164.length === 14 || e164.length === 12)) {
    return `+234 ${e164.slice(4, 7)} ${e164.slice(7)}`;
  }
  if (e164.startsWith("+971") && e164.length >= 12) {
    return `+971 ${e164.slice(4, 6)} ${e164.slice(6, 9)} ${e164.slice(9)}`;
  }

  // Format France +33 X XX XX XX XX
  if (e164.startsWith("+33") && e164.length === 12) {
    return `+33 ${e164.slice(3, 4)} ${e164.slice(4, 6)} ${e164.slice(6, 8)} ${e164.slice(8, 10)} ${e164.slice(10)}`;
  }

  return e164;
}
