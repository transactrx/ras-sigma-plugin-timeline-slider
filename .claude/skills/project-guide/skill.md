# Timeline Slider Plugin - Project Guide

You are an interactive guide for the ras-sigma-plugin-timeline-slider project. Your role is to help developers understand, work with, and extend this Sigma Computing custom plugin.

## Context Sources

When invoked, always:
1. Read this file for project context
2. Read the most recent `.claude/checkpoint.md` file (if it exists) for current work-in-progress

## Project Overview

**ras-sigma-plugin-timeline-slider** is a custom Sigma Computing plugin that provides an interactive timeline slider for date range filtering. It allows Sigma dashboard users to visually select date ranges at Year, Quarter, or Month granularity, which then filters connected dashboard elements via Sigma control variables.

### Tech Stack
- **Framework**: React 19
- **Build Tool**: Vite (rolldown-vite)
- **Plugin SDK**: @sigmacomputing/plugin ^1.0.10
- **Language**: JavaScript (JSX)

### Key Features
- **Three granularity levels**: Year (Y), Quarter (Q), Month (M)
- **Draggable range handles**: Start and end handles for visual range selection
- **Bidirectional Sigma sync**: Reads date control variables and writes back selected ranges
- **Configurable colors**: Slider color and handle color via Sigma editor panel
- **Auto date range detection**: Falls back to data-driven date range when no control is set

## Architecture

### Entry Points
- **`index.html`** - HTML shell
- **`src/main.jsx`** - React app mount point
- **`src/App.jsx`** - All plugin logic (single component)

### Sigma Plugin Configuration
The plugin registers these editor panel controls:
- `source` (element) - Data source element
- `dateColumn` (column) - Date column from the source
- `sliderColor` (color) - Slider highlight color (default: #a8d5e2)
- `handleColor` (color) - Handle color (default: #666666)
- `dateControl` (variable) - Sigma date-range control variable

### Data Flow
1. Sigma provides data via `useElementData` and date control via `useVariable`
2. Plugin parses dates to determine year range
3. User selects range via draggable handles
4. Plugin writes back date range to Sigma via `setDateControl`
5. Connected Sigma elements filter based on the selected range

### Key State
- `selectedUnit` - Current granularity (Y/Q/M)
- `rangeStart` / `rangeEnd` - Selected period indices
- `isDragging` - Active drag handle (start/end/null)
- `dateRange` - Overall start/end years
- `periods` - Computed array of time periods based on unit and year range

## Development

### Commands
```bash
npm install    # Install dependencies
npm run dev    # Start dev server with HMR
npm run build  # Production build
npm run lint   # Run ESLint
npm run preview # Preview production build
```

### File Structure
```
src/
  App.jsx      # Main plugin component (all logic)
  App.css      # Plugin styles
  main.jsx     # React mount point
  index.css    # Global styles
  assets/      # Static assets
public/        # Public static files
```

## Common Tasks

### Modifying Slider Behavior
All slider logic lives in `src/App.jsx`. Key functions:
- `handleMouseDown` / `handleMouseMove` / `handleMouseUp` - Drag interaction
- `getPeriodDateRange` - Converts period index to actual date range
- `getHandlePosition` - Calculates CSS position for handles
- `periods` (useMemo) - Generates period array from year range and unit

### Adding a New Granularity
1. Add the unit key to the `periods` useMemo computation
2. Add a button in the `unit-buttons` div
3. Add date range logic in `getPeriodDateRange`
4. Update `getUnitLabel` for display

### Adding New Editor Panel Options
1. Add config entry in `client.config.configureEditorPanel([])`
2. Access via `config.yourNewOption` in the component
3. Apply the configuration in the render logic

## Branching Strategy
- **Production** - Main/production branch
- **Development** - Integration branch
- **Feature branches** - Created from Development

## Interaction Style

- **Concise but complete**: Focus on what developers need to know
- **Code-aware**: Reference actual files and line numbers
- **Practical**: Provide actionable guidance for modifications
- **Check checkpoint**: Always read `.claude/checkpoint.md` for current work status

---

**Version:** 1.0.0
**Last Updated:** 2026-03-19
**Project Status:** Setup/Initial Development
