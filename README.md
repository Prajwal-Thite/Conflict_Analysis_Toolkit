# Conflict Analysis Toolkit

An interactive visual analytics dashboard for exploring armed conflict event data, focused on the Russia-Ukraine conflict. Built with React, D3.js, and Leaflet.

**Live Demo:** [https://prajwal-thite.github.io/Conflict_Analysis_Toolkit/](https://prajwal-thite.github.io/Conflict_Analysis_Toolkit/)

![Conflict Analysis Toolkit](Conflict%20analysis%20toolkit.png)

---

## Features

The toolkit offers multiple coordinated views, each accessible as a standalone page or as a linked panel within the main dashboard.

| View | Route | Description |
|---|---|---|
| Main Dashboard | `/` | Integrated map with geofencing selection linked to all other views |
| Geo Map | `/geomap` | Standalone event/fatality map with timeline slider |
| Parallel Coordinates | `/pcp` | Multi-dimensional analysis with Parallel Sets toggle |
| Heatmap | `/heatmap` | Geographic density heatmap with source-scale legend |
| Theme River | `/themeriver` | Stacked area chart of event types over time |
| Pixel Visualization | `/pixel` | Glyph-based calendar/pixel view of events |
| Word Cloud | `/wordcloud` | Frequency cloud generated from event notes |

### Key interactions
- **Geofencing** — draw a rectangle on the map to filter events; linked views update automatically
- **Timeline slider** — scrub through dates to see events day by day
- **Display mode toggle** — switch between event markers and fatality count clusters
- **Marker clustering** — auto-clusters at scale, expands on zoom
- **Custom icons** — 18 distinct SVG icons per sub-event type (drone strike, artillery, protest, etc.)
- **Color coding** — red = Russia (ISO 643), black = Ukraine (ISO 804), gray = other actors

---

## Tech Stack

- **React 18** with React Router v7
- **D3.js v7** — PCP, Pixel, Word Cloud, Parallel Sets
- **Leaflet + React-Leaflet** — map rendering, marker clustering, geofencing draw
- **Recharts** — Theme River (stacked area chart)
- **GitHub Pages** — deployment via `gh-pages`

---

## Getting Started

**Prerequisites:** Node.js 16+

```bash
# Install dependencies
npm install

# Start development server
npm start
# Opens at http://localhost:3000
```

### Build & Deploy

```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

---

## Data

The dataset (`complete_dataset.json`) contains ACLED-format conflict events with fields including:
`event_date`, `event_type`, `sub_event_type`, `actor1`, `actor2`, `latitude`, `longitude`, `fatalities`, `notes`, `iso`, `interaction`

Fatality levels: **Low** (≤5), **Medium** (6–20), **High** (>20)
