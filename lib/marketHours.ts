/**
 * Pure Browser-Safe & Node-Safe Market Hours Helper
 * Enforces official Indian Stock Exchange trading hours: 09:15 AM - 03:30 PM IST (Mon-Fri)
 */
export function isNSEMarketOpen(now: Date = new Date()): boolean {
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (5.5 * 3600000));

  const day = istDate.getDay();
  if (day === 0 || day === 6) return false; // Weekend closed

  const mins = istDate.getHours() * 60 + istDate.getMinutes();
  const openMins = 9 * 60 + 15;   // 09:15 AM IST
  const closeMins = 15 * 60 + 30; // 03:30 PM IST

  return mins >= openMins && mins <= closeMins;
}
