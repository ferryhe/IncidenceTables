import { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Globe2, Hand, Minus, Plus, RotateCcw } from 'lucide-react';
import { geoDistance, geoGraticule, geoOrthographic, geoPath } from 'd3-geo';
import { formatCount } from './catalog.js';
import { COLOR_BINS, COUNTRIES, COUNTRY_POINTS, DEFAULT_VIEW, countryColor } from './geography.js';
import { catalogLabel, matchingLabel, messages, ZH } from './i18n.js';

const GRATICULE = geoGraticule().step([15, 15])();
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 2.2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function layoutMarkers(projection, view, width, height, ranked, selected, counts, language) {
  const markers = [];
  const labels = [];
  const center = [view.lon, view.lat];
  const names = [selected, ...ranked.filter(([name]) => name !== selected).map(([name]) => name)];
  for (const name of names) {
    const point = COUNTRY_POINTS.get(name);
    if (!point || geoDistance(center, point) > Math.PI / 2 - 0.035) continue;
    const [x, y] = projection(point);
    if (x < 6 || x > width - 6 || y < 6 || y > height - 6) continue;

    const count = counts.get(name) ?? 0;
    const active = name === selected;
    markers.push({ name, x, y, active });

    if (labels.length >= 6) continue;
    const number = formatCount(count);
    const label = catalogLabel('nation', name, language);
    const nameWidth = label.length * (language === ZH ? 11 : 6.7);
    const labelWidth = Math.max(49, nameWidth + number.length * 6.7 + 30);
    const top = y < 36 ? y + 10 : y - 33;
    const rightEdge = width - (top < 135 ? 57 : 5);
    if (labelWidth > rightEdge - 5) continue;
    const left = clamp(x - labelWidth / 2, 5, rightEdge - labelWidth);
    const overlaps = labels.some((label) => (
      left < label.left + label.width + 6 && left + labelWidth + 6 > label.left
      && top < label.top + 28 && top + 28 > label.top
    ));
    if (!overlaps) labels.push({ name, label, number, left, top, width: labelWidth, active });
  }
  return { markers, labels };
}

export default function Globe({ language, counts, ranked, selected, onSelect, view, onView }) {
  const text = messages[language];
  const stage = useRef(null);
  const drag = useRef(null);
  const [size, setSize] = useState({ width: 640, height: 420 });
  const [hover, setHover] = useState(null);
  const [dragging, setDragging] = useState(false);
  const { width, height } = size;

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  const radius = Math.max(30, Math.min(width - 26, height - 38) / 2) * view.zoom;
  const projection = useMemo(() => geoOrthographic()
    .translate([width / 2, height / 2])
    .scale(radius)
    .rotate([-view.lon, -view.lat])
    .clipAngle(90)
    .precision(0.65), [width, height, radius, view.lon, view.lat]);

  const { grid, shapes } = useMemo(() => {
    const path = geoPath(projection);
    return {
      grid: path(GRATICULE),
      shapes: COUNTRIES.map(({ name, geometry }) => ({ name, d: path(geometry) })).filter(({ d }) => d),
    };
  }, [projection]);

  const { markers, labels } = useMemo(
    () => layoutMarkers(projection, view, width, height, ranked, selected, counts, language),
    [projection, view, width, height, ranked, selected, counts, language],
  );

  function startDrag(event) {
    if (event.button !== 0 || !event.isPrimary) return;
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      view,
      nation: event.target.closest('[data-nation]')?.dataset.nation,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHover(null);
  }

  function movePointer(event) {
    const start = drag.current;
    if (start?.pointer === event.pointerId) {
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) < 5) return;
      if (!start.moved) {
        start.moved = true;
        setDragging(true);
      }
      const degreesPerPixel = 0.4 / start.view.zoom;
      onView({
        ...start.view,
        lon: start.view.lon - dx * degreesPerPixel,
        lat: clamp(start.view.lat + dy * degreesPerPixel, -85, 85),
      });
      return;
    }

    if (event.pointerType === 'touch') return;
    const nation = event.target.closest('[data-nation]')?.dataset.nation;
    const bounds = stage.current.getBoundingClientRect();
    setHover(nation ? { nation, x: event.clientX - bounds.left, y: event.clientY - bounds.top } : null);
  }

  function finishDrag(event) {
    const start = drag.current;
    if (start?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.type === 'pointerup' && !start.moved && start.nation) onSelect(start.nation);
  }

  function zoomBy(delta) {
    setHover(null);
    onView({ ...view, zoom: clamp(Math.round((view.zoom + delta) * 10) / 10, MIN_ZOOM, MAX_ZOOM) });
  }

  function resetView() {
    setHover(null);
    onView(DEFAULT_VIEW);
  }

  function rotateWithKeyboard(event) {
    const offset = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, 12], ArrowDown: [0, -12] };
    if (!Object.hasOwn(offset, event.key)) return;
    event.preventDefault();
    const [lon, lat] = offset[event.key];
    setHover(null);
    onView({ ...view, lon: view.lon + lon, lat: clamp(view.lat + lat, -85, 85) });
  }

  const hoverCount = hover ? counts.get(hover.nation) ?? 0 : 0;

  return (
    <section className="map-panel" aria-labelledby="map-heading">
      <div className="map-header">
        <div className="map-header-title">
          <span className="map-icon"><Globe2 size={20} aria-hidden="true" /></span>
          <div>
            <h2 id="map-heading">{text.globalCoverage}</h2>
            <p>{text.mapSubtitle}</p>
          </div>
        </div>
        <span className="map-tag"><span /> {text.globeTag}</span>
      </div>

      <div className="map-stage" ref={stage}>
        <svg
          className={`earth ${dragging ? 'is-dragging' : ''}`}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={text.globeLabel}
          aria-describedby="globe-instructions"
          tabIndex={0}
          onPointerDown={startDrag}
          onPointerMove={movePointer}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
          onPointerLeave={() => setHover(null)}
          onKeyDown={rotateWithKeyboard}
        >
          <defs>
            <radialGradient id="ocean" cx="31%" cy="24%" r="80%">
              <stop offset="0%" stopColor="var(--ocean-start)" />
              <stop offset="65%" stopColor="var(--ocean-middle)" />
              <stop offset="100%" stopColor="var(--ocean-end)" />
            </radialGradient>
            <radialGradient id="sphere-shading" cx="36%" cy="26%" r="82%">
              <stop offset="35%" stopColor="var(--sphere-shadow)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--sphere-shadow)" stopOpacity=".38" />
            </radialGradient>
          </defs>
          <g className="globe-decoration" pointerEvents="none">
            <circle className="orbit-outer" cx={width / 2} cy={height / 2} r={radius + 18} />
            <circle className="orbit-inner" cx={width / 2} cy={height / 2} r={radius + 8} />
            <circle className="ocean" cx={width / 2} cy={height / 2} r={radius} fill="url(#ocean)" />
            <path className="graticule" d={grid} />
          </g>
          <g className="land">
            {shapes.map(({ name, d }) => (
              <path
                key={name}
                data-nation={name}
                className={selected === name ? 'selected-land' : hover?.nation === name ? 'hovered-land' : undefined}
                d={d}
                fill={countryColor(counts.get(name) ?? 0)}
              />
            ))}
          </g>
          <circle
            pointerEvents="none"
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="url(#sphere-shading)"
          />
          <g className="country-markers">
            {markers.map(({ name, x, y, active }) => (
              <g key={name} data-nation={name} transform={`translate(${x}, ${y})`}>
                {active && <circle r="9" className="marker-halo" />}
                <circle r={active ? 4.8 : 3} className={active ? 'active-marker' : 'marker'} />
                <circle r="8" fill="transparent" />
              </g>
            ))}
          </g>
          <g className="country-labels">
            {labels.map(({ name, label, number, left, top, width: labelWidth, active }) => (
              <g key={name} data-nation={name} className={active ? 'active-label' : ''} transform={`translate(${left}, ${top})`}>
                <rect width={labelWidth} height="24" rx="7" />
                <text x="9" y="12" dominantBaseline="central">{label}</text>
                <text x={labelWidth - 9} y="12" dominantBaseline="central" textAnchor="end" className="label-count">{number}</text>
              </g>
            ))}
          </g>
        </svg>

        <div className="map-controls" role="group" aria-label={text.globeControls}>
          <div className="zoom-buttons">
            <button type="button" onClick={() => zoomBy(0.2)} disabled={view.zoom >= MAX_ZOOM} aria-label={text.zoomIn} title={text.zoomIn}><Plus size={17} /></button>
            <button type="button" onClick={() => zoomBy(-0.2)} disabled={view.zoom <= MIN_ZOOM} aria-label={text.zoomOut} title={text.zoomOut}><Minus size={17} /></button>
          </div>
          <button type="button" className="reset-view" onClick={resetView} aria-label={text.resetGlobe} title={text.resetGlobe}><RotateCcw size={15} /></button>
        </div>
        <span className="map-compass" aria-hidden="true"><Compass size={17} /> {text.north}</span>
        {hover && (
          <div
            className="map-tooltip"
            style={{
              left: hover.x > width - 190 ? hover.x - 12 : hover.x + 12,
              top: clamp(hover.y + 14, 8, height - 55),
              transform: hover.x > width - 190 ? 'translateX(-100%)' : undefined,
            }}
          >
            <strong>{catalogLabel('nation', hover.nation, language)}</strong>
            <span>{formatCount(hoverCount)} {matchingLabel(hoverCount, language)}</span>
          </div>
        )}
      </div>

      <div className="map-footer">
        <div className="legend" aria-label={text.legend}>
          <span className="legend-title">{text.tables}</span>
          {COLOR_BINS.map(({ label, color }) => (
            <span className="legend-item" key={label}><i style={{ backgroundColor: color }} />{label}</span>
          ))}
        </div>
        <div className="map-help"><Hand size={14} aria-hidden="true" /> {text.mapHelp}</div>
        <span id="globe-instructions" className="sr-only">{text.globeInstructions}</span>
      </div>
    </section>
  );
}
