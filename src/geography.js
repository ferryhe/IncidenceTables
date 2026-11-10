import { geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json' with { type: 'json' };
import regionCodes from './region-codes.json' with { type: 'json' };

const nationNames = new Map([
  ['United States of America', 'United States'],
  ['Columbia', 'Colombia'],
  ['Korea', 'South Korea'],
]);

export function countryName(nation) {
  return nationNames.get(nation) ?? nation;
}

export const DEFAULT_VIEW = { lon: -47, lat: 24, zoom: 1 };

export const COUNTRIES = feature(world, world.objects.countries).features.map((shape) => ({
  name: countryName(shape.properties.name),
  geometry: shape.geometry,
  regionCode: regionCodes[shape.id],
}));

export const COUNTRY_POINTS = new Map(COUNTRIES.map(({ name, geometry }) => [name, geoCentroid(geometry)]));

const CHINESE_REGIONS = new Intl.DisplayNames('zh-CN', { type: 'region', fallback: 'none' });
const REGION_CODES = new Map(COUNTRIES.map(({ name, regionCode }) => [name, regionCode]));
REGION_CODES.set('Hong Kong', 'HK');
REGION_CODES.set('Singapore', 'SG');
REGION_CODES.set('Kosovo', 'XK');
const LOCAL_NAMES = new Map([['N. Cyprus', '北塞浦路斯'], ['Somaliland', '索马里兰']]);

export function localizedRegion(name) {
  const code = REGION_CODES.get(name);
  return (code ? CHINESE_REGIONS.of(code) : LOCAL_NAMES.get(name)) ?? name;
}

// Mainland points keep markers near the principal landmass, including territories
// that are smaller than the boundary dataset's resolution.
for (const [name, point] of [
  ['United States', [-100, 39]],
  ['Canada', [-104, 56]],
  ['France', [2.2, 46.6]],
  ['Norway', [9, 61.5]],
  ['Hong Kong', [114.17, 22.32]],
  ['Singapore', [103.82, 1.35]],
]) {
  COUNTRY_POINTS.set(name, point);
}

export const COLOR_BINS = [
  { min: 0, label: '0', color: 'var(--land-0)' },
  { min: 1, label: '1–9', color: 'var(--land-1)' },
  { min: 10, label: '10–49', color: 'var(--land-10)' },
  { min: 50, label: '50–99', color: 'var(--land-50)' },
  { min: 100, label: '100+', color: 'var(--land-100)' },
];

export function countryColor(count) {
  return COLOR_BINS.findLast(({ min }) => count >= min).color;
}
