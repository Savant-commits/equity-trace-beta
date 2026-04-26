# Quick Reference: Combined Trades Feature

## What Changed?
✅ Trade log now shows "x2", "x3" badges for trades grouped by same entry price + date + session
✅ Detail panel also shows the combined count
✅ Automatic calculation - no action needed from you!

## How to Use

### See Combined Trades
1. Open **Trade Log**
2. Look for badges like "x2" or "x3" next to trade symbols
3. These indicate multiple trades at same price/date/session

### Edit Combined Trades
1. Click on any trade with a badge
2. Detail panel shows combined count in header
3. Edit and save normally
4. Badge updates automatically

### Break Apart Combined Trades
If you want to separate trades:
1. Edit one trade's **Entry Price**, **Date**, or **Session**
2. Save
3. Badge updates - they're no longer grouped

## Grouping Rules
Trades combine when ALL match:
- ✓ Same **date**
- ✓ Same **session** (NY, London, Asian, etc.)
- ✓ Same **entry price**
- ✓ Same **direction** (LONG or SHORT)

## Examples

### ✓ These Group (x3)
- EUR/USD LONG | 2024-01-15 | NY | Entry: 1.0850
- EUR/USD LONG | 2024-01-15 | NY | Entry: 1.0850
- EUR/USD LONG | 2024-01-15 | NY | Entry: 1.0850

### ✗ These Don't Group
- EUR/USD LONG | 2024-01-15 | NY | Entry: 1.0850
- EUR/USD LONG | 2024-01-15 | NY | Entry: 1.0851 ← Different price
- EUR/USD SHORT | 2024-01-15 | NY | Entry: 1.0850 ← Different direction

## Tech Specs
- **Location**: Trade log, detail panel
- **Calculation**: Automatic on every change
- **Data Storage**: Individual trades (not merged)
- **Impact**: Visual only - statistics unchanged
