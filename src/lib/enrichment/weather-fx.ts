import type { WeatherState } from '@/types';

/**
 * Fetch weather data from wttr.in (free, no API key needed).
 * Falls back to OpenWeatherMap if key is available.
 */
export async function fetchWeather(): Promise<WeatherState | null> {
  // Try wttr.in first (free, no key)
  try {
    const response = await fetch('https://wttr.in/?format=j1', {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return null;
    const data = await response.json();

    const current = data.current_condition?.[0];
    if (!current) return null;

    const weatherCode = parseInt(current.weatherCode, 10);
    const condition = mapWeatherCode(weatherCode);

    return {
      condition,
      temp: parseInt(current.temp_C, 10),
      icon: current.weatherIconUrl?.[0]?.value || '',
      description: current.weatherDesc?.[0]?.value || '',
    };
  } catch {
    return null;
  }
}

function mapWeatherCode(code: number): WeatherState['condition'] {
  if (code === 113) return 'clear';
  if (code >= 116 && code <= 122) return 'clouds';
  // Thunderstorm must be checked before rain (codes 200-202 overlap)
  if (code >= 200 && code <= 202) return 'thunderstorm';
  if (code >= 176 && code <= 199) return 'rain';
  if (code >= 227 && code <= 230) return 'snow';
  if (code >= 248 && code <= 260) return 'fog';
  if (code >= 263 && code <= 356) return 'rain';
  if (code >= 368 && code <= 395) return 'snow';
  return 'other';
}
