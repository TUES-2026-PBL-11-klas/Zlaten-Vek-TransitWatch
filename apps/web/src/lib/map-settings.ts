export interface MapSettings {
  showVehicles: boolean;
  showStopTimes: boolean;
}

export const MAP_SETTINGS_KEY = 'tw_map_settings';

export function loadMapSettings(): MapSettings {
  try {
    const raw = localStorage.getItem(MAP_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as MapSettings;
  } catch {
    // ignore
  }
  return { showVehicles: true, showStopTimes: true };
}

export function saveMapSettings(settings: MapSettings) {
  localStorage.setItem(MAP_SETTINGS_KEY, JSON.stringify(settings));
}
