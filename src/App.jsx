import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, BookOpen, ChevronDown, ChevronLeft, ChevronRight,
  Database, Globe2, Layers3, MapPin, Moon, Search, SlidersHorizontal, Sun,
} from 'lucide-react';
import {
  CLAIM_INCIDENCE, EMPTY_FILTERS, SOURCE_URL, filterTables, formatCount,
  groupByNation, prepareTables, tableUrl,
} from './catalog.js';
import { COUNTRY_POINTS, DEFAULT_VIEW } from './geography.js';
import Globe from './Globe.jsx';
import { catalogLabel, matchingLabel, messages, ZH } from './i18n.js';

const ASSETS = import.meta.env.BASE_URL;
const PAGE_SIZE = 4;
const NO_TABLES = [];

function SelectFilter({ name, label, allLabel, value, options, onChange }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <span className="select-wrap">
        <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)}>
          <option value="">{allLabel}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden="true" />
      </span>
    </label>
  );
}

function Filters({ language, filters, options, availableByNation, ranked, selected, onFilter, onClear, onFocus }) {
  const text = messages[language];
  const hasFilters = Object.values(filters).some(Boolean);
  const countryOptions = options.nation.map(({ value, label }) => ({
    value,
    label: `${label} (${formatCount(availableByNation.get(value)?.length ?? 0)})`,
  }));

  return (
    <aside className="filter-panel panel" aria-labelledby="filter-heading">
      <div className="panel-header">
        <h2 id="filter-heading"><SlidersHorizontal size={17} aria-hidden="true" /> {text.filters}</h2>
        <button type="button" className="text-button" disabled={!hasFilters} onClick={onClear}>{text.reset}</button>
      </div>
      <div className="filter-content">
        <div className="filter-fields">
          <label className="filter-field">
            <span>{text.search}</span>
            <span className="search-wrap">
              <Search size={16} aria-hidden="true" />
              <input type="search" value={filters.query} onChange={(event) => onFilter('query', event.target.value)} placeholder={text.keyword} />
            </span>
          </label>
          <SelectFilter name="nation" label={text.nation} allLabel={text.allNations} value={filters.nation} options={countryOptions} onChange={onFilter} />
          <SelectFilter name="usage" label={text.usage} allLabel={text.allUsages} value={filters.usage} options={options.usage} onChange={onFilter} />
          <SelectFilter name="layout" label={text.layout} allLabel={text.allLayouts} value={filters.layout} options={options.layout} onChange={onFilter} />
        </div>

        <button
          type="button"
          className="incidence-button"
          aria-pressed={filters.usage === CLAIM_INCIDENCE}
          onClick={() => onFilter('usage', filters.usage === CLAIM_INCIDENCE ? '' : CLAIM_INCIDENCE)}
        >
          <Activity size={17} aria-hidden="true" />
          <span>{catalogLabel('usage', CLAIM_INCIDENCE, language)}</span>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="top-countries">
        <h3>{text.topMatches}</h3>
        {ranked.length === 0 && <p className="no-matches">{text.noCountries}</p>}
        {ranked.slice(0, 3).map(([name, count]) => (
          <button type="button" key={name} aria-pressed={name === selected} onClick={() => onFocus(name)}>
            <span><i />{catalogLabel('nation', name, language)}</span>
            <strong>{formatCount(count)}</strong>
          </button>
        ))}
      </div>
    </aside>
  );
}

function TableRow({ table, language }) {
  return (
    <details className="table-row">
      <summary>
        <span className="row-text">
          <span className="table-meta"><span>#{table.id}</span><span className="meta-dot" />{catalogLabel('usage', table.usage, language)}</span>
          <strong lang="en">{table.name}</strong>
        </span>
        <ChevronDown size={15} className="row-chevron" aria-hidden="true" />
      </summary>
      <div className="table-extra">
        <span className="table-layout">{catalogLabel('layout', table.layout, language)}</span>
        {table.description && <p lang="en">{table.description}</p>}
        <a href={tableUrl(table.id)} target="_blank" rel="noreferrer">{messages[language].viewSource} <ArrowUpRight size={14} aria-hidden="true" /></a>
      </div>
    </details>
  );
}

function CountryDetails({ language, selected, tables, totalMatches, hasFilters }) {
  const text = messages[language];
  const [page, setPage] = useState(0);
  const first = page * PAGE_SIZE;
  const last = Math.min(first + PAGE_SIZE, tables.length);
  const share = totalMatches ? (tables.length / totalMatches) * 100 : 0;
  const shareLabel = share > 0 && share < 1 ? '<1%' : `${Math.round(share)}%`;
  const emptyMessage = hasFilters ? text.resetFilters : text.noEntries;

  return (
    <aside className="detail-panel panel" aria-labelledby="detail-heading">
      <div className="panel-header">
        <h2 id="detail-heading"><MapPin size={17} aria-hidden="true" /> {text.countryDetails}</h2>
      </div>
      <div className="country-summary" aria-live="polite">
        <div className="country-name">
          <span className="country-icon"><Globe2 size={22} aria-hidden="true" /></span>
          <div><span className="eyebrow">{text.selectedLocation}</span><h3>{catalogLabel('nation', selected, language)}</h3></div>
        </div>
        <div className="country-count">
          <strong>{formatCount(tables.length)}</strong>
          <span>{matchingLabel(tables.length, language)}</span>
        </div>
        <div className="share-caption">
          <div className="share-track" aria-hidden="true"><div style={{ width: `${share}%` }} /></div>
          <span>{text.resultsShare(shareLabel)}</span>
        </div>
      </div>

      <div className="results-heading">
        <h3>{text.catalogTables}</h3>
        {tables.length > 0 && <span>{text.tableId}</span>}
      </div>
      {tables.length ? (
        <>
          <div className="table-list">
            <p className="catalog-note">{text.originalText}</p>
            {tables.slice(first, last).map((table) => <TableRow key={table.id} table={table} language={language} />)}
          </div>
          <div className="pagination">
            <span aria-live="polite">{text.pageRange(formatCount(first + 1), formatCount(last), formatCount(tables.length))}</span>
            <div>
              <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label={text.previousPage}><ChevronLeft size={17} /></button>
              <button type="button" onClick={() => setPage(page + 1)} disabled={last === tables.length} aria-label={text.nextPage}><ChevronRight size={17} /></button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-tables">
          <BookOpen size={21} aria-hidden="true" />
          <strong>{text.noTables}</strong>
          <p>{totalMatches > 0 ? text.otherCountry : emptyMessage}</p>
        </div>
      )}
    </aside>
  );
}

function Explorer({ catalog, language }) {
  const text = messages[language];
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selected, setSelected] = useState('United States');
  const [view, setView] = useState(DEFAULT_VIEW);
  const tables = useMemo(() => prepareTables(catalog.rows), [catalog]);
  const options = useMemo(() => Object.fromEntries(
    ['nation', 'usage', 'layout'].map((key) => [
      key,
      [...new Set(tables.map((table) => table[key]))]
        .map((value) => ({ label: catalogLabel(key, value, language), value }))
        .sort((a, b) => a.label.localeCompare(b.label, language)),
    ]),
  ), [tables, language]);

  const { query, nation, usage, layout } = filters;
  const available = useMemo(
    () => filterTables(tables, { query, nation: '', usage, layout }),
    [tables, query, usage, layout],
  );
  const availableByNation = useMemo(() => groupByNation(available), [available]);
  const matching = nation ? availableByNation.get(nation) ?? NO_TABLES : available;
  const counts = useMemo(() => new Map(
    [...availableByNation].filter(([name]) => !nation || name === nation)
      .map(([name, rows]) => [name, rows.length]),
  ), [availableByNation, nation]);
  const ranked = useMemo(
    () => [...counts].sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b)),
    [counts],
  );
  const usageCount = useMemo(() => new Set(matching.map((table) => table.usage)).size, [matching]);
  const selectedTables = nation && nation !== selected ? NO_TABLES : availableByNation.get(selected) ?? NO_TABLES;
  const snapshotDate = new Intl.DateTimeFormat(language, {
    dateStyle: 'medium', timeZone: 'UTC',
  }).format(new Date(catalog.asOf));

  function focusCountry(name) {
    setSelected(name);
    const point = COUNTRY_POINTS.get(name);
    if (point) setView((current) => ({ ...current, lon: point[0], lat: point[1] }));
  }

  function changeFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    if (name === 'nation' && value) focusCountry(value);
  }

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-heading">
        <div className="hero-copy">
          <span className="hero-tag"><span /> {text.catalogTag}</span>
          <h1 id="page-heading">{text.heading}</h1>
          <p>{text.intro}</p>
        </div>
        <div className="stats" aria-label={text.stats} aria-live="polite">
          <div className="stat"><Database size={17} aria-hidden="true" /><strong>{formatCount(matching.length)}</strong><span>{text.matchingTables}</span></div>
          <div className="stat"><Globe2 size={17} aria-hidden="true" /><strong>{formatCount(counts.size)}</strong><span>{text.countries}</span></div>
          <div className="stat"><Layers3 size={17} aria-hidden="true" /><strong>{formatCount(usageCount)}</strong><span>{text.usageTypes}</span></div>
        </div>
      </section>

      <div className="explorer">
        <Filters
          language={language}
          filters={filters}
          options={options}
          availableByNation={availableByNation}
          ranked={ranked}
          selected={selected}
          onFilter={changeFilter}
          onClear={() => setFilters(EMPTY_FILTERS)}
          onFocus={focusCountry}
        />
        <Globe language={language} counts={counts} ranked={ranked} selected={selected} onSelect={setSelected} view={view} onView={setView} />
        <CountryDetails
          key={JSON.stringify([selected, filters])}
          language={language}
          selected={selected}
          tables={selectedTables}
          totalMatches={matching.length}
          hasFilters={Object.values(filters).some(Boolean)}
        />
      </div>

      <footer className="footer">
        <div><Database size={14} aria-hidden="true" /> {text.snapshot} <span className="footer-dot">·</span> {snapshotDate}</div>
        <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">{text.boundaries} <ArrowUpRight size={13} aria-hidden="true" /></a>
      </footer>
    </main>
  );
}

function savedPreference(key) {
  try {
    return localStorage.getItem(`rate-atlas.${key}`);
  } catch {
    return null;
  }
}

export default function App() {
  const [catalog, setCatalog] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [language, setLanguage] = useState(() => {
    const saved = savedPreference('language');
    if (saved === 'en' || saved === ZH) return saved;
    return navigator.language.toLowerCase().startsWith('zh') ? ZH : 'en';
  });
  const [theme, setTheme] = useState(() => {
    const saved = savedPreference('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const text = messages[language];
  const nextLanguage = language === 'en' ? ZH : 'en';
  const themeLabel = theme === 'dark' ? text.lightMode : text.darkMode;

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.title = text.title;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0e1822' : '#f4f7f8');
    try {
      localStorage.setItem('rate-atlas.language', language);
      localStorage.setItem('rate-atlas.theme', theme);
    } catch {
      // The controls still work when storage is disabled.
    }
  }, [language, theme, text.title]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${ASSETS}catalog.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Catalog request failed');
        return response.json();
      })
      .then((snapshot) => {
        if (!Array.isArray(snapshot.rows) || !snapshot.rows.length || !Number.isFinite(Date.parse(snapshot.asOf))) {
          throw new Error('Invalid catalog snapshot');
        }
        setCatalog(snapshot);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadFailed(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <a className="brand" href="./"><img src={`${ASSETS}atlas.svg`} alt="" width="38" height="38" /> {text.brand}</a>
          <div className="header-actions" role="group" aria-label={text.preferences}>
            <button type="button" className="header-button" lang={nextLanguage} onClick={() => setLanguage(nextLanguage)}>
              {nextLanguage === ZH ? '中文' : 'English'}
            </button>
            <button type="button" className="header-button icon-button" aria-label={themeLabel} title={themeLabel} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            </button>
            <a className="source-link" href={SOURCE_URL} target="_blank" rel="noreferrer" aria-label={text.source} title={text.source}>
              <BookOpen size={15} aria-hidden="true" /> <span>{text.source}</span> <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>
      {catalog ? <Explorer catalog={catalog} language={language} /> : (
        <main className="shell">
          <div className="load-state" role={loadFailed ? 'alert' : 'status'}>
            <h1>{loadFailed ? text.loadError : text.loading}</h1>
            {loadFailed && <button type="button" onClick={() => window.location.reload()}>{text.reload}</button>}
          </div>
        </main>
      )}
    </>
  );
}
