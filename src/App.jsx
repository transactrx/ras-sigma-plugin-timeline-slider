// App.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { client, useConfig, useElementData, useElementColumns, useVariable } from '@sigmacomputing/plugin';
import './App.css';

client.config.configureEditorPanel([
  { name: 'source', type: 'element', label: 'Data Source' },
  { name: 'dateColumn', type: 'column', source: 'source', allowMultiple: false, label: 'Date Column' },
  { name: 'sliderColor', type: 'color', label: 'Slider Color', defaultValue: '#a8d5e2' },
  { name: 'handleColor', type: 'color', label: 'Handle Color', defaultValue: '#666666' },
  { name: 'dateControl', type: 'variable', label: 'Date Control', allowedTypes: ['date-range'] }
]);

function App() {
  const config = useConfig();
  const sigmaData = useElementData(config.source);
  const columns = useElementColumns(config.source);

  const sliderColor = config.sliderColor || '#a8d5e2';
  const handleColor = config.handleColor || '#666666';

  const [selectedUnit, setSelectedUnit] = useState('Q');
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(null);
  const [dateRange, setDateRange] = useState({ startYear: 2020, endYear: 2025 });
  const lastDateControlStr = useRef(null);
  const initializedRef = useRef(false);

  // Get the date control from Sigma
  const [dateControl, setDateControl] = useVariable(config.dateControl);

  // Update date range when dateControl changes
  useEffect(() => {
    if (dateControl && Array.isArray(dateControl) && dateControl.length === 2) {
      const startDate = new Date(dateControl[0]);
      const endDate = new Date(dateControl[1]);

      // Get the years
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      setDateRange({
        startYear: startYear,
        endYear: endYear
      });
    } else {
      // If no date control, show all available data
      if (config.dateColumn && sigmaData && sigmaData[config.dateColumn]) {
        const dates = sigmaData[config.dateColumn]
          .filter(d => d != null)
          .map(d => new Date(d));

        if (dates.length > 0) {
          const years = dates.map(d => d.getFullYear());
          setDateRange({
            startYear: Math.min(...years),
            endYear: Math.max(...years)
          });
        }
      }
    }
    initializedRef.current = true;
  }, [dateControl, config.dateColumn, sigmaData]);

  const startYear = dateRange.startYear;
  const endYear = dateRange.endYear;

  const periods = useMemo(() => {
    const result = [];

    if (selectedUnit === 'Y') {
      for (let year = startYear; year <= endYear; year++) {
        result.push({
          year,
          label: year.toString(),
          fullLabel: year.toString()
        });
      }
    } else if (selectedUnit === 'Q') {
      for (let year = startYear; year <= endYear; year++) {
        for (let q = 1; q <= 4; q++) {
          result.push({
            year,
            quarter: q,
            label: `Q${q}`,
            fullLabel: `Q${q} ${year}`
          });
        }
      }
    } else if (selectedUnit === 'M') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let year = startYear; year <= endYear; year++) {
        for (let m = 0; m < 12; m++) {
          result.push({
            year,
            month: m + 1,
            quarter: Math.floor(m / 3) + 1,
            label: monthNames[m],
            fullLabel: `${monthNames[m]} ${year}`
          });
        }
      }
    }
    return result;
  }, [startYear, endYear, selectedUnit]);

  // Reset range when periods change
  useEffect(() => {
    if (initializedRef.current) {
      setRangeStart(0);
      setRangeEnd(Math.max(0, periods.length - 1));
    }
  }, [periods]);

  const handleMouseDown = (type) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || periods.length === 0) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const segmentWidth = rect.width / periods.length;

    // Calculate the index based on which segment the cursor is in
    const index = Math.floor(x / segmentWidth);
    const clampedIndex = Math.max(0, Math.min(periods.length - 1, index));

    if (isDragging === 'start') {
      setRangeStart(Math.min(clampedIndex, rangeEnd));
    } else if (isDragging === 'end') {
      setRangeEnd(Math.max(clampedIndex, rangeStart));
    }
  };

  const getPeriodDateRange = (period, unit) => {
    if (!period) return undefined;
    const year = period.year;

    switch (unit) {
      case 'Y':
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31)
        };

      case 'Q': {
        const startMonth = (period.quarter - 1) * 3;
        return {
          start: new Date(year, startMonth, 1),
          end: new Date(year, startMonth + 3, 0)
        };
      }

      case 'M': {
        return {
          start: new Date(year, period.month - 1, 1),
          end: new Date(year, period.month, 0)
        };
      }

      default:
        return { start: null, end: null };
    }
  };

  const toLocalDateString = (date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  // Send date range to Sigma when slider changes
  useEffect(() => {
    if (isDragging === null && periods.length > 0 && rangeStart >= 0 && rangeEnd >= 0) {
      const startPeriod = periods[rangeStart];
      const endPeriod = periods[rangeEnd];

      const startRange = getPeriodDateRange(startPeriod, selectedUnit);
      const endRange = getPeriodDateRange(endPeriod, selectedUnit);

      if (startRange && endRange && startRange.start && endRange.end) {
        const startDateStr = toLocalDateString(startRange.start);
        const endDateStr = toLocalDateString(endRange.end);
        const dateStr = `${startDateStr}|${endDateStr}`;

        if (lastDateControlStr.current !== dateStr) {
          lastDateControlStr.current = dateStr;
          setDateControl(startDateStr, endDateStr);
        }
      }
    }
  }, [isDragging, rangeStart, rangeEnd, selectedUnit, periods, setDateControl]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging]);

  const yearGroups = useMemo(() => {
    const groups = [];
    let currentYear = null;
    let currentGroup = null;

    periods.forEach((period, idx) => {
      if (period.year !== currentYear) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { year: period.year, periods: [], startIdx: idx };
        currentYear = period.year;
      }
      currentGroup.periods.push({ ...period, idx });
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [periods]);

  const selectedRange = periods.length > 0
    ? `${periods[rangeStart]?.fullLabel || ''} - ${periods[rangeEnd]?.fullLabel || ''}`
    : '';

  const getUnitLabel = () => {
    const labels = { 'Y': 'Year', 'Q': 'Quarter', 'M': 'Month' };
    return labels[selectedUnit] || 'Quarter';
  };

  const showDefault = !config.source || !config.dateColumn;

  // Calculate the proper positions for handles (exactly at segment boundaries)
  const getHandlePosition = (index, isEnd) => {
    if (periods.length <= 1) return '0%';

    // For the start handle, position at the left edge of the segment
    // For the end handle, position at the right edge of the segment
    const position = index / (periods.length);
    const exactPosition = isEnd ? position : position;

    return `${exactPosition * 100}%`;
  };

  return (
    <div className="timeline-container">
      {showDefault && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#856404'
        }}>
          ⚠️ Please configure a data source and date column in the editor panel for live data
        </div>
      )}

      <div className="time-unit-selector">
        <div className="unit-buttons">
          {['Y', 'Q', 'M'].map(unit => (
            <button
              key={unit}
              className={`unit-button ${selectedUnit === unit ? 'active' : ''}`}
              data-unit={unit}
              onClick={() => setSelectedUnit(unit)}
            >
              {unit}
            </button>
          ))}
        </div>
        <div className="unit-label">{getUnitLabel()}</div>
      </div>

      <div className="selected-range">
        {selectedRange}
      </div>

      {periods.length > 0 && (
        <div className="timeline">
          <div className="year-headers">
            {yearGroups.map((group) => (
              <div
                key={group.year}
                className="year-header"
                style={{ flex: group.periods.length }}
              >
                {group.year}
              </div>
            ))}
          </div>

          {/* Only render period labels if not in Year mode */}
          {selectedUnit !== 'Y' && (
            <div className="period-labels">
              {periods.map((period, idx) => {
                // For Month view, show only first letter; for other views, show the full label
                const displayLabel = selectedUnit === 'M' ? period.label.charAt(0) : period.label;

                return (
                  <div key={idx} className="period-label">
                    {displayLabel}
                  </div>
                );
              })}
            </div>
          )}

          <div
            className={`timeline-bar ${isDragging ? 'dragging' : ''}`}
            onMouseMove={handleMouseMove}
          >
            {periods.map((period, idx) => {
              const isInRange = idx >= rangeStart && idx <= rangeEnd;

              return (
                <div
                  key={idx}
                  className={`quarter-segment ${idx === rangeStart ? 'range-start' : ''} ${idx === rangeEnd ? 'range-end' : ''}`}
                  style={{
                    backgroundColor: isInRange ? sliderColor : 'white'
                  }}
                />
              );
            })}

            {periods.length > 1 && (
              <>
                <div
                  onMouseDown={handleMouseDown('start')}
                  className="range-handle start"
                  style={{
                    position: 'absolute',
                    left: getHandlePosition(rangeStart, false),
                    backgroundColor: handleColor,
                    width: '15px',
                    height: '50px',
                    borderRadius: '8px',
                    cursor: 'grab',
                    zIndex: 100,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    top: 0,
                    transform: 'translateX(-50%)'
                  }}
                />

                <div
                  onMouseDown={handleMouseDown('end')}
                  className="range-handle end"
                  style={{
                    position: 'absolute',
                    left: getHandlePosition(rangeEnd + 1, true),
                    backgroundColor: handleColor,
                    width: '15px',
                    height: '50px',
                    borderRadius: '8px',
                    cursor: 'grab',
                    zIndex: 100,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    top: 0,
                    transform: 'translateX(-50%)'
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;