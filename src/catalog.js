import { countryName } from './geography.js';
import { catalogLabel, ZH } from './i18n.js';

export const SOURCE_URL = 'https://mort.soa.org/Default.aspx';
export const CLAIM_INCIDENCE = 'Claim Incidence';
export const EMPTY_FILTERS = { query: '', nation: '', usage: '', layout: '' };
export const formatCount = new Intl.NumberFormat('en-US').format;

function searchable(text) {
  return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[–—]/g, '-');
}

export function prepareTables(rows) {
  return rows.map((row) => {
    const nation = countryName(row.nation);
    return {
      ...row,
      nation,
      searchText: searchable(
        [
          row.id, row.name, row.description, row.nation, nation, row.usage, row.layout,
          catalogLabel('nation', nation, ZH),
          catalogLabel('usage', row.usage, ZH),
          catalogLabel('layout', row.layout, ZH),
        ].join(' '),
      ),
    };
  }).sort((first, second) => second.id - first.id);
}

export function filterTables(tables, { query, nation, usage, layout }) {
  const words = searchable(query).trim().split(/\s+/).filter(Boolean);
  return tables.filter((table) => (
    (!nation || table.nation === nation)
    && (!usage || table.usage === usage)
    && (!layout || table.layout === layout)
    && words.every((word) => table.searchText.includes(word))
  ));
}

export function groupByNation(tables) {
  const groups = new Map();
  for (const table of tables) {
    if (!groups.has(table.nation)) groups.set(table.nation, []);
    groups.get(table.nation).push(table);
  }
  return groups;
}

export function tableUrl(id) {
  return `https://mort.soa.org/ViewTable.aspx?TableIdentity=${id}`;
}
