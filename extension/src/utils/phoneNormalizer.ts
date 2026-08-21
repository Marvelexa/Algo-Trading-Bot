/**
 * Strict phone number normalization and validation for Indian mobile numbers.
 * Enforces strict digit-length matches and prefix checks to avoid losing digits.
 */
export interface PhoneValidationResult {
  isValid: boolean;
  rawPhone: string;
  digitsCount: number;
  normalizedPhone: string | null;
}

export function validateAndNormalizePhone(rawPhone: string, defaultCountryCode: string = '+91'): PhoneValidationResult {
  if (!rawPhone || rawPhone.trim() === '') {
    return {
      isValid: false,
      rawPhone: '',
      digitsCount: 0,
      normalizedPhone: null,
    };
  }

  const cleanRaw = rawPhone.trim();
  
  // 1. Count digits only (strip all non-numeric characters)
  const digits = cleanRaw.replace(/\D/g, '');
  const digitsCount = digits.length;

  let coreNumber = '';
  let isValid = false;

  // Rules:
  // Rule 1: Exactly 13 characters starting with +91 (digits count is 12, starts with + and 91)
  if (digitsCount === 12 && cleanRaw.startsWith('+') && digits.startsWith('91')) {
    coreNumber = digits.slice(2);
    isValid = coreNumber.length >= 10;
  }
  // Rule 2: Exactly 12 digits starting with 91
  else if (digitsCount === 12 && digits.startsWith('91')) {
    coreNumber = digits.slice(2);
    isValid = coreNumber.length >= 10;
  }
  // Rule 3: Exactly 11 digits starting with 0
  else if (digitsCount === 11 && digits.startsWith('0')) {
    coreNumber = digits.slice(1);
    isValid = coreNumber.length >= 10;
  }
  // Rule 4: Exactly 10 digits
  else if (digitsCount === 10) {
    if (digits.startsWith('0')) {
      // 10 digits starting with 0, cleanup removes 0, leaving 9 digits (Invalid)
      coreNumber = digits.slice(1);
      isValid = false;
    } else {
      coreNumber = digits;
      isValid = true;
    }
  } else {
    // Other counts: clean up prefix to check remaining length
    if (digits.startsWith('0')) {
      coreNumber = digits.slice(1);
    } else if (digits.startsWith('91')) {
      coreNumber = digits.slice(2);
    } else {
      coreNumber = digits;
    }
    isValid = false;
  }

  // If number becomes less than 10 digits after cleanup, do not save
  if (coreNumber.length < 10) {
    isValid = false;
  }

  const normalizedPhone = isValid ? `${defaultCountryCode}${coreNumber}` : null;

  return {
    isValid,
    rawPhone,
    digitsCount,
    normalizedPhone,
  };
}

export function normalizePhone(rawPhone: string, defaultCountryCode: string = '+91'): string | null {
  const result = validateAndNormalizePhone(rawPhone, defaultCountryCode);
  return result.normalizedPhone;
}

/**
 * Robust Unit Test runner for phone validation.
 * Verifies standard valid and invalid number cases.
 */
export function runPhoneUnitTests(): void {
  console.log('[DEBUG] --- Start Phone Normalizer Unit Tests ---');
  
  const testCases = [
    { input: '9876543210', expected: '+919876543210', desc: 'Standard 10 digits' },
    { input: '09876543210', expected: '+919876543210', desc: '11 digits with leading 0' },
    { input: '919876543210', expected: '+919876543210', desc: '12 digits starting with 91' },
    { input: '+919876543210', expected: '+919876543210', desc: '13 digits starting with +91' },
    { input: '0982519860', expected: null, desc: 'Invalid: 10 digits starting with 0 (becomes 9 digits)' },
    { input: '982519860', expected: null, desc: 'Invalid: 9 digits total' },
    { input: '+91 98765-43210', expected: '+919876543210', desc: 'Valid with dashes and spaces' },
  ];

  let passedCount = 0;

  testCases.forEach((tc, idx) => {
    const result = validateAndNormalizePhone(tc.input);
    const passed = result.normalizedPhone === tc.expected;
    if (passed) passedCount++;

    console.log(`[DEBUG] Test #${idx + 1} (${tc.desc}):
      • Input: "${tc.input}"
      • Digits Count: ${result.digitsCount}
      • Expected: "${tc.expected}"
      • Result: "${result.normalizedPhone}"
      • Outcome: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  console.log(`[DEBUG] Phone Normalizer Unit Tests: ${passedCount}/${testCases.length} Passed.`);
  console.log('[DEBUG] --- End Phone Normalizer Unit Tests ---');
}
