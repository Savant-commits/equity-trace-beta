# Combined Trades Feature — Implementation Guide

## Overview
This feature automatically groups multiple trades with identical parameters and displays them with a multiplier badge (x2, x3, etc.) in the trade log and analytics pages.

## How It Works

### Grouping Logic
Trades are automatically combined when they share:
- **Same Date** — Traded on the same calendar day
- **Same Session** — NY, London, Asian, etc.
- **Same Entry Price** — Exact same entry level
- **Same Direction** — Both LONG or both SHORT

### Example
If you have 3 trades with:
```
Date: 2024-01-15
Session: NY
Entry: 1.0850
Direction: LONG
```

They will be marked as **"x3"** in the trade log, indicating you took 3 separate entries at the same price on that day/session.

## Features

### 1. Trade Log Display
- Combined trades show an **"x2", "x3", etc. badge** next to the symbol name
- Badge appears in a distinct color (dark gray background)
- Helps identify consolidated entries at a glance

### 2. Detail Panel
- When you click on a trade, the detail panel shows the combined count badge
- Example: "EUR/USD — LONG x3"
- Each trade can still be edited individually

### 3. Automatic Calculation
- Combined count is **recalculated automatically** whenever trades are:
  - Added
  - Edited
  - Deleted
  - Imported
  - Restored from undo

## Important Notes

### Individual Trade Tracking
- Trades remain **individually stored** and editable
- Combined count is a **visual indicator only**, not a data merge
- Statistics (win rate, trade count) still reflect individual trades
- You can edit any single trade in the group independently

### Analytics Impact
- Trade count in analytics = total individual trades (not combined count)
- This allows you to track the actual number of entries taken
- The combined badge is purely informational

## UI Locations Where Combined Badge Appears

1. **Trade Log** — Symbol column shows "x2", "x3", etc.
2. **Trade Detail Panel** — Header displays combined count
3. **Any trade view** — Badge displays consistently

## Example Scenarios

### Scenario 1: Multiple Pyramid Entries
```
Trade 1: 2024-01-15 | NY | EUR/USD LONG | Entry 1.0850 | +40 pips
Trade 2: 2024-01-15 | NY | EUR/USD LONG | Entry 1.0850 | +35 pips
Trade 3: 2024-01-15 | NY | EUR/USD LONG | Entry 1.0850 | +45 pips
→ Displayed as single trade group with "x3" badge
```

### Scenario 2: Different Entry Prices (Not Combined)
```
Trade 1: 2024-01-15 | NY | EUR/USD LONG | Entry 1.0850 | +40 pips
Trade 2: 2024-01-15 | NY | EUR/USD LONG | Entry 1.0855 | +35 pips
→ Displayed as two separate trades (different entry prices)
```

### Scenario 3: Different Sessions (Not Combined)
```
Trade 1: 2024-01-15 | NY | EUR/USD LONG | Entry 1.0850 | +40 pips
Trade 2: 2024-01-15 | London | EUR/USD LONG | Entry 1.0850 | +35 pips
→ Displayed as two separate trades (different sessions)
```

## Technical Details

### Implementation Location
- **Function**: `calculateCombinedCounts()` in app.js
- **Called**: On app initialization and every save operation
- **Recalculation**: Automatic via `saveTradesToStorage()`

### Code Location
- Trade log rendering: Line ~714 in app.js (renderTrades function)
- Detail panel: Line ~1733 in app.js (showDetail function)
- Calculation: Line ~237 in app.js

## Troubleshooting

### Badge Not Showing?
1. Verify all trades have correct date, session, entry, and direction
2. Check that entry prices are exactly the same (no rounding differences)
3. Refresh the page (F5)

### Unexpected Grouping?
- Check for whitespace differences in session names
- Verify entry prices are truly identical
- Clear browser cache if data seems stale

### Want to Ungroup Trades?
- Edit one trade's entry price, session, or date slightly
- It will no longer group with the others
- Save and the badges will update immediately

## Workflow Tips

### Reviewing Combined Trades
1. Click on any trade with a combined badge
2. Detail panel opens showing all details
3. Edit if needed and save
4. Close panel and continue reviewing

### Editing Individual Trades in Groups
1. Each trade in a group can be edited independently
2. Click to edit → make changes → save
3. Combined count updates automatically
4. If edited to have different parameters, it will ungroup

### Exporting Combined Trades
- Export includes all individual trades
- Combined badge information is not in the export
- Useful for tracking actual execution count
