import parsePhoneNumberFromString, { CountryCode } from 'libphonenumber-js';
import { useSettingsStore } from '../../stores/settingsStore';

export interface PhoneAnalysis {
  phone: string;
  country: string;
  countryCode: string;
  valid: boolean;
}

export class PhoneAnalyzer {
  /**
   * Analyzes, normalizes, and extracts country metadata from a raw phone string.
   */
  public static analyze(rawPhone: string): PhoneAnalysis {
    // Default fallback object
    const defaultAnalysis: PhoneAnalysis = {
      phone: rawPhone,
      country: '',
      countryCode: '',
      valid: false
    };

    if (!rawPhone || typeof rawPhone !== 'string') return defaultAnalysis;

    try {
      // 1. Get default country hint from settings (e.g. '+1' -> 'US')
      const { settings } = useSettingsStore.getState();
      const defaultPrefix = settings.defaultCountryCode || '+1';
      
      // We need to map prefix to CountryCode for libphonenumber (e.g., '+1' -> 'US', '+91' -> 'IN')
      // A quick switch for the major supported default country codes in our UI
      let defaultCountry: CountryCode = 'US';
      switch (defaultPrefix) {
        case '+91': defaultCountry = 'IN'; break;
        case '+44': defaultCountry = 'GB'; break;
        case '+61': defaultCountry = 'AU'; break;
        case '+49': defaultCountry = 'DE'; break;
        case '+971': defaultCountry = 'AE'; break;
        case '+1': defaultCountry = 'US'; break;
      }

      // 2. Parse using libphonenumber-js
      // Try parsing with the default country if the number doesn't have an explicit '+'
      const phoneNumber = parsePhoneNumberFromString(rawPhone, defaultCountry);

      if (!phoneNumber) {
        return defaultAnalysis; // Parsing failed completely
      }

      // 3. Extract verified metadata
      const isValid = phoneNumber.isValid();
      const formattedNumber = phoneNumber.formatInternational();
      const countryCode = `+${phoneNumber.countryCallingCode}`;
      const countryIso = phoneNumber.country || ''; // e.g. 'US', 'IN'

      return {
        phone: formattedNumber,
        country: countryIso,
        countryCode: countryCode,
        valid: isValid
      };
      
    } catch (err) {
      console.warn(`[PhoneAnalyzer] Failed to analyze phone: ${rawPhone}`, err);
      return defaultAnalysis;
    }
  }
}
