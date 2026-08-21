import fs from 'fs';
import path from 'path';

// Define path to cities JSON
const CITIES_PATH = path.join(process.cwd(), 'lib', 'cities.json');

export function getCitiesForLocation(location: string): string[] {
  try {
    const rawData = fs.readFileSync(CITIES_PATH, 'utf8');
    const cityMap: Record<string, string[]> = JSON.parse(rawData);

    // Try to find the country (case-insensitive)
    const normalizedLocation = location.toLowerCase();
    for (const [country, cities] of Object.entries(cityMap)) {
      if (country.toLowerCase() === normalizedLocation) {
        return cities;
      }
    }

    // If not found as a country, assume the location itself is a city
    return [location];
  } catch (error) {
    console.error('Error reading cities.json:', error);
    // Fallback to just the provided location if file is missing
    return [location];
  }
}
