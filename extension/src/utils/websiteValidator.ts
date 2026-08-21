/**
 * Robust validation logic to identify and filter out internal Google URLs,
 * CDN subdomains, street view images, tracking domains, and other invalid business websites.
 */

/**
 * Extracts the true destination URL from a Google redirect URL if present.
 * Example: https://www.google.com/url?q=https://www.mycafe.com/&sa=U... => https://www.mycafe.com/
 */
export function extractActualWebsite(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  const clean = url.trim();
  try {
    const urlWithProto = clean.includes('://') ? clean : `https://${clean}`;
    const parsed = new URL(urlWithProto);
    
    // Check if the hostname is a Google domain and it is a redirect endpoint
    if (/(?:^|\.)google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(parsed.hostname) && parsed.pathname === '/url') {
      const actualUrl = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (actualUrl) {
        return actualUrl;
      }
    }
  } catch {
    // Ignore URL parsing errors and return the original URL
  }
  
  return clean;
}

/**
 * Validates whether a given URL is a legitimate business website.
 */
export function isValidBusinessWebsite(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Always resolve any tracking/redirect wrappers first
  const resolvedUrl = extractActualWebsite(url);
  const clean = resolvedUrl.trim().toLowerCase();
  
  // Exclude javascript and void targets
  if (clean.startsWith('javascript:')) return false;

  // Extract hostname for comparison
  let hostname = '';
  try {
    const urlWithProto = clean.includes('://') ? clean : `https://${clean}`;
    const parsed = new URL(urlWithProto);
    hostname = parsed.hostname;
  } catch {
    return false;
  }

  if (!hostname) return false;

  // List of domains that must NOT be present in any part of the hostname or as subdomains
  const blockedDomainKeywords = [
    'googleusercontent.com',
    'ggpht.com',
    'gstatic.com',
    'googleapis.com',
    'googletagmanager.com',
    'doubleclick.net',
    'streetviewpixels',
    'schema.org',
    'w3.org',
    'youtube.com',
    'apple.com',
    'android.com',
    'wikipedia.org'
  ];

  // Specific check for localized google domains (e.g. google.com, google.co.in, google.de)
  // Ensure we don't accidentally match custom domains like "mygooglecafe.com" but we do match "google.com", "sub.google.co.in"
  const isGoogleDomain = /(?:^|\.)google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(hostname);
  if (isGoogleDomain) {
    return false;
  }

  // Check against all blocked keywords/domains
  for (const keyword of blockedDomainKeywords) {
    if (hostname === keyword || hostname.endsWith('.' + keyword) || hostname.includes(keyword)) {
      return false;
    }
  }

  return true;
}
