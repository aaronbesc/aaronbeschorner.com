import type { Sky } from "./i18n";

const MADRID = { latitude: 40.4168, longitude: -3.7038 };

// WMO weather interpretation codes used by Open-Meteo.
function describe(code: number): Sky | null {
  if (code === 0) return "clear";
  if (code === 1) return "mostlyClear";
  if (code === 2) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "foggy";
  if (code >= 51 && code <= 57) return "drizzly";
  if (code >= 61 && code <= 67) return "rainy";
  if (code >= 71 && code <= 77) return "snowy";
  if (code >= 80 && code <= 82) return "showery";
  if (code === 85 || code === 86) return "snowy";
  if (code >= 95) return "stormy";
  return null;
}

/**
 * The temperature (°C) and sky, which the page words in its language.
 * Returns null if the weather service is unavailable.
 */
export async function getMadridWeather(): Promise<{ temp: number; sky: Sky | null } | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(MADRID.latitude));
  url.searchParams.set("longitude", String(MADRID.longitude));
  url.searchParams.set("current", "temperature_2m,weather_code");

  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const data: { current: { temperature_2m: number; weather_code: number } } =
      await res.json();
    return {
      temp: Math.round(data.current.temperature_2m),
      sky: describe(data.current.weather_code),
    };
  } catch {
    return null;
  }
}
