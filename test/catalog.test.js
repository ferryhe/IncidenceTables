import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CLAIM_INCIDENCE, EMPTY_FILTERS, filterTables, groupByNation, prepareTables, tableUrl } from '../src/catalog.js';
import { COUNTRIES, COUNTRY_POINTS, countryColor } from '../src/geography.js';
import { catalogLabel, matchingLabel, messages, ZH } from '../src/i18n.js';

const snapshot = JSON.parse(readFileSync(new URL('../public/catalog.json', import.meta.url), 'utf8'));
const tables = prepareTables(snapshot.rows);

test('every catalog table has a unique ID and a country or territory on the globe', () => {
  assert.equal(new Set(tables.map(({ id }) => id)).size, snapshot.rows.length);
  const groups = groupByNation(tables);
  const shapes = new Set(COUNTRIES.map(({ name }) => name));
  for (const [nation, rows] of groups) {
    assert.ok(COUNTRY_POINTS.get(nation)?.every(Number.isFinite), nation);
    assert.ok(shapes.has(nation) || ['Hong Kong', 'Singapore'].includes(nation), nation);
    assert.ok(rows.every((row) => row.nation === nation));
  }
  assert.equal([...groups.values()].reduce((sum, rows) => sum + rows.length, 0), tables.length);
  assert.ok(groups.has('United States') && groups.has('Colombia') && groups.has('South Korea'));
});

test('keyword, country, usage and layout filters work together', () => {
  const filters = {
    query: '1968-72 males 443',
    nation: 'Canada',
    usage: CLAIM_INCIDENCE,
    layout: 'Aggregate',
  };
  assert.deepEqual(filterTables(tables, filters).map(({ id }) => id), [443]);
  assert.equal(filterTables(tables, { ...filters, nation: 'United States' }).length, 0);
  assert.equal(filterTables(tables, { ...filters, layout: 'Duration' }).length, 0);
  assert.equal(filterTables(tables, EMPTY_FILTERS).length, tables.length);
  assert.equal(new URL(tableUrl(443)).searchParams.get('TableIdentity'), '443');
});

test('claim incidence country totals match the underlying records', () => {
  const matches = filterTables(tables, { ...EMPTY_FILTERS, usage: CLAIM_INCIDENCE });
  const groups = groupByNation(matches);
  assert.ok(groups.get('Canada')?.length > 0);
  assert.ok(groups.get('United States')?.length > 0);
  assert.equal(matches.length, snapshot.rows.filter(({ usage }) => usage === CLAIM_INCIDENCE).length);
  assert.notEqual(countryColor(0), countryColor(1));
  assert.equal(countryColor(100), countryColor(2059));
});

test('Chinese labels cover the catalog and work as search terms', () => {
  assert.deepEqual(Object.keys(messages[ZH]).sort(), Object.keys(messages.en).sort());
  assert.equal(catalogLabel('nation', 'Canada', ZH), '加拿大');
  assert.equal(catalogLabel('nation', 'Singapore', ZH), '新加坡');
  assert.equal(catalogLabel('usage', CLAIM_INCIDENCE, 'en'), CLAIM_INCIDENCE);
  assert.equal(matchingLabel(1, 'en'), 'matching table');
  assert.equal(matchingLabel(2, ZH), matchingLabel(1, ZH));

  for (const field of ['nation', 'usage', 'layout']) {
    for (const value of new Set(tables.map((row) => row[field]))) {
      assert.notEqual(catalogLabel(field, value, ZH), value, `${field} ${value}`);
    }
  }
  const matches = filterTables(tables, { ...EMPTY_FILTERS, query: '加拿大 理赔发生率 443' });
  assert.deepEqual(matches.map(({ id }) => id), [443]);
});
