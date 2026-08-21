/**
 * Nexvora Network Interceptor
 * Injected into the MAIN world (`window`) before Google Maps scripts execute.
 * Responsible for monkey-patching `fetch` and `XMLHttpRequest` to capture `batchexecute`
 * and other relevant data payloads.
 */

const TARGET_ENDPOINTS = [
  '/maps/preview/entity',
  '/batchexecute',
  '/search'
];

// Helper to check if URL is relevant
function isRelevantUrl(url: string | URL | Request): boolean {
  if (!url) return false;
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : url.url);
  return TARGET_ENDPOINTS.some(endpoint => urlStr.includes(endpoint));
}

// Function to send data back to the isolated content script safely
function sendToIsolatedWorld(url: string, responseText: string) {
  // To avoid UI thread locking with huge strings, we could chunk it, 
  // but for V1 of the interceptor we will send it directly via postMessage.
  // The content script will listen for this exact type.
  window.postMessage({
    type: '__NEXVORA_INTERCEPTED_PAYLOAD__',
    url: url,
    payload: responseText
  }, '*');
}

// ============================================================================
// FETCH PATCHING
// ============================================================================
const originalFetch = window.fetch;

window.fetch = async function (...args) {
  const requestUrl = args[0];
  
  if (isRelevantUrl(requestUrl)) {
    try {
      const response = await originalFetch.apply(this, args);
      // We must clone the response to read the body without consuming the original stream
      const clone = response.clone();
      
      // Read text asynchronously to avoid blocking
      clone.text().then(text => {
        if (text && text.length > 0) {
          sendToIsolatedWorld(
            typeof requestUrl === 'string' ? requestUrl : (requestUrl instanceof Request ? requestUrl.url : requestUrl.toString()), 
            text
          );
        }
      }).catch(err => console.error('[Nexvora Interceptor] Fetch Clone Error:', err));
      
      return response;
    } catch (error) {
      return originalFetch.apply(this, args);
    }
  }

  return originalFetch.apply(this, args);
};

// ============================================================================
// XHR PATCHING
// ============================================================================
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

declare global {
  interface XMLHttpRequest {
    _requestUrl?: string;
  }
}

XMLHttpRequest.prototype.open = function (
  method: string, 
  url: string | URL, 
  async?: boolean, 
  user?: string | null, 
  password?: string | null
) {
  this._requestUrl = typeof url === 'string' ? url : url.href;
  return originalXhrOpen.apply(this, arguments as any);
};

XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
  if (this._requestUrl && isRelevantUrl(this._requestUrl)) {
    this.addEventListener('load', function () {
      if (this.responseText && this.responseText.length > 0) {
        sendToIsolatedWorld(this._requestUrl!, this.responseText);
      }
    });
  }
  return originalXhrSend.apply(this, arguments as any);
};

console.log('[Nexvora] Network Interceptor successfully injected into MAIN world.');
