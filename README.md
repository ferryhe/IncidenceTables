# Rate Atlas

Rate Atlas maps the Society of Actuaries' [Mortality and Other Rate Tables catalog](https://mort.soa.org/Default.aspx). Each count represents a distinct SOA table ID. The catalog opens with all usages, with a one-click filter for Claim Incidence.

Use the header controls for English or Simplified Chinese and light or dark mode. The browser remembers both choices. Search also accepts Chinese region, usage, and layout names. Table titles and descriptions come from the SOA catalog.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the URL Vite prints. Drag or use the arrow keys to rotate the globe. Click a country or select it in the filter to view its table records and links to the SOA originals.

```sh
npm test
npm run build
npm run preview
```

## Catalog and map

The app reads a dated snapshot of SOA catalog metadata. Run `npm run refresh` with Python 3.9 or newer to fetch a fresh snapshot from the SOA search endpoint, then rerun the checks and build. The snapshot keeps SOA's nation labels, and the explorer displays United States, Colombia, and South Korea for the corresponding catalog labels. Hong Kong and Singapore use point markers at the map's resolution.

The globe uses the [D3 geographic projection library](https://github.com/d3/d3-geo) and [Natural Earth boundaries via World Atlas](https://github.com/topojson/world-atlas). Region codes come from Unicode CLDR via Babel. [React Globe GL's country choropleth](https://github.com/vasturiano/react-globe.gl/tree/master/example/choropleth-countries) was a design reference.
