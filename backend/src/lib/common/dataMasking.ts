/**
 * Masks an email address to show only the first character and domain
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== "string") return "****";
  const [name, domain] = email.split("@");
  if (!name || !domain) return "****";
  return `${name.charAt(0)}***@${domain}`;
}

/**
 * Masks a phone number to show only last 4 digits
 * @example: 9876543210 -> ********10
 */
export function maskPhoneNumber(phone: string | undefined): string {
  if (!phone || typeof phone !== "string") return "****";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 2) return "********";
  return `********${cleaned.slice(-2)}`;
}

/**
 * Generic masking function - replaces content with ****
 */
export function maskData(data: any): string {
  return data ? "****" : "****";
}

/**
 * Privacy filter for user data - returns data with sensitive fields masked
 */
export function applyPrivacyFilter(
  user: any,
  options: {
    maskEmail?: boolean;
    maskPhone?: boolean;
    maskPersonalData?: boolean;
  } = {}
) {
  const {
    maskEmail: shouldMaskEmail = true,
    maskPhone: shouldMaskPhone = true,
    maskPersonalData = true
  } = options;

  const filtered = { ...user };

  if (shouldMaskEmail && filtered.email) {
    filtered.email = maskEmail(filtered.email);
  }

  if (shouldMaskPhone && filtered.phoneNumber) {
    filtered.phoneNumber = maskPhoneNumber(filtered.phoneNumber);
  }

  if (maskPersonalData) {
    delete filtered.password;
    delete filtered.isEmailVerified;
    delete filtered.isPhoneVerified;
  }

  return filtered;
}

export function filterPersonalDataByVisibility(
  personalData: any,
  visibilitySettings?: any
) {
  if (!personalData) return null;

  const filtered = { ...personalData };

  return filtered;
}
