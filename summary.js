// ═══════════════════════════════════════════════════════════
//  MONTHLY SUMMARY — Card-based Analytics with Animations
// ═══════════════════════════════════════════════════════════

let _currentSummaryMonth = new Date(); // Track which month to display

// Format month display (e.g., "January 2025")
function formatSummaryMonthLabel(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[date.getMonth()] + ' ' + date.getFullYear();
}

function parseTradeDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  let tradeDate = null;
  if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
    tradeDate = new Date(value);
  } else if (value.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
    const parts = value.split('/');
    tradeDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  } else {
    tradeDate = new Date(value);
  }

  return isNaN(tradeDate.getTime()) ? null : tradeDate;
}

// Get trades for the specified month
function getMonthTrades(date) {
  const trades = (typeof TRADES !== 'undefined' && Array.isArray(TRADES)) ? TRADES : [];
  const year = date.getFullYear();
  const month = date.getMonth();

  return trades.filter(trade => {
    if (!trade || !trade.date) return false;
    const tradeDate = parseTradeDate(trade.date);
    return tradeDate && tradeDate.getFullYear() === year && tradeDate.getMonth() === month;
  });
}

// Calculate monthly statistics
function calculateMonthlySummary(trades) {
  const summary = {
    totalTrades: 0,
    totalPnl: 0,
    wins: 0,
    losses: 0,
    breakEvens: 0,
    bestTrade: null,
    worstTrade: null,
    totalWinsPnl: 0,
    totalLossesPnl: 0,
    tradingDays: new Set(),
    winStreak: 0,
    maxWinStreak: 0
  };

  if (!trades || trades.length === 0) {
    return summary;
  }

  summary.totalTrades = trades.length;

  // Sort trades by date for streak calculation
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return dateA - dateB;
  });

  let currentStreak = 0;

  sortedTrades.forEach(trade => {
    const pnl = Number(trade.pnl) || 0;
    
    summary.totalPnl += pnl;

    if (pnl > 0) {
      summary.wins++;
      summary.totalWinsPnl += pnl;
      currentStreak++;
    } else if (pnl < 0) {
      summary.losses++;
      summary.totalLossesPnl += Math.abs(pnl);
      if (currentStreak > summary.maxWinStreak) {
        summary.maxWinStreak = currentStreak;
      }
      currentStreak = 0;
    } else {
      summary.breakEvens++;
    }

    // Track best/worst trade
    if (summary.bestTrade === null || pnl > summary.bestTrade) {
      summary.bestTrade = pnl;
    }
    if (summary.worstTrade === null || pnl < summary.worstTrade) {
      summary.worstTrade = pnl;
    }

    // Track trading days
    if (trade.date) {
      const dateStr = typeof trade.date === 'string' ? trade.date.split(' ')[0] : trade.date;
      summary.tradingDays.add(dateStr);
    }
  });

  // Final streak check
  if (currentStreak > summary.maxWinStreak) {
    summary.maxWinStreak = currentStreak;
  }

  return summary;
}

// Format currency value
function formatCurrency(value, includeSign = true) {
  const num = Number(value) || 0;
  const sign = num > 0 && includeSign ? '+' : '';
  return sign + '$' + Math.abs(num).toFixed(2);
}

// Format percentage
function formatPercent(value) {
  return Number(value).toFixed(2) + '%';
}

function calculateMonthlyConsistencyScore(trades) {
  const dailyTotals = new Map();
  trades.forEach(trade => {
    const tradeDate = parseTradeDate(trade.date);
    if (!tradeDate) return;
    const key = `${tradeDate.getFullYear()}-${tradeDate.getMonth()}-${tradeDate.getDate()}`;
    dailyTotals.set(key, (dailyTotals.get(key) || 0) + (Number(trade.pnl) || 0));
  });

  const totalDays = dailyTotals.size;
  if (totalDays === 0) {
    return { consistency: null, totalDays: 0, winDays: 0 };
  }

  const winDays = [...dailyTotals.values()].filter(dayPnl => dayPnl > 0).length;
  const consistency = totalDays > 0 ? (winDays / totalDays) * 100 : null;
  return { consistency, totalDays, winDays };
}

function getSummaryChartBase() {
  if (typeof getAccountSize === 'function') {
    const size = getAccountSize();
    if (size && !isNaN(size)) return size;
  }
  if (typeof ACCOUNT_SIZE !== 'undefined' && ACCOUNT_SIZE) {
    return ACCOUNT_SIZE;
  }
  if (typeof ACCOUNTS !== 'undefined' && Array.isArray(ACCOUNTS) && ACCOUNTS.length > 0) {
    const first = ACCOUNTS[0];
    if (first && first.startBal) return first.startBal;
  }
  return 25000;
}

function calculateEquityCurve(trades) {
  const dailyMap = new Map();
  const year = _currentSummaryMonth.getFullYear();
  const month = _currentSummaryMonth.getMonth();
  const monthDays = new Date(year, month + 1, 0).getDate();

  trades.forEach(trade => {
    const tradeDate = parseTradeDate(trade.date);
    if (!tradeDate) return;
    if (tradeDate.getFullYear() !== year || tradeDate.getMonth() !== month) return;
    const day = tradeDate.getDate();
    const pnl = Number(trade.pnl) || 0;
    dailyMap.set(day, (dailyMap.get(day) || 0) + pnl);
  });

  let cumulative = 0;
  const base = getSummaryChartBase();
  const points = [{ day: 0, percent: 100 }];

  for (let day = 1; day <= monthDays; day++) {
    if (dailyMap.has(day)) {
      cumulative += dailyMap.get(day);
    }
    points.push({
      day,
      percent: 100 + (cumulative / base) * 100,
    });
  }

  return points;
}

function renderEquityCurveChart(curveData) {
  const canvas = document.getElementById('summary-equity-curve-chart');
  if (!canvas) return;

  // Check if light mode is active by looking for class
  const isLightMode = document.documentElement.classList.contains('light');
  const labelColor = isLightMode ? '#0a0b10' : '#eef2ff';
  const gridColor = isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';

  const labels = curveData.map(item => item.day === 0 ? 'Start' : `Day ${item.day}`);
  const dataset = curveData.map(item => item.percent);

  if (window.summaryEquityChart) {
    window.summaryEquityChart.destroy();
    window.summaryEquityChart = null;
  }

  window.summaryEquityChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Return %',
        data: dataset,
        borderColor: 'rgba(113, 110, 255, 0.95)',
        backgroundColor: 'rgba(113, 110, 255, 0.18)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgba(113, 110, 255, 1)',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${context.parsed.y.toFixed(2)}%`,
          },
        },
      },
      scales: {
        x: {
          type: 'category',
          grid: { color: gridColor },
          ticks: { color: labelColor },
          title: { display: true, text: 'Day', color: labelColor },
        },
        y: {
          type: 'linear',
          grid: { color: gridColor },
          ticks: {
            color: labelColor,
            callback: value => `${Number(value).toFixed(1)}%`,
          },
          title: { display: true, text: 'Return %', color: labelColor },
        },
      },
    },
  });

  // Watch for theme changes and recreate chart
  if (!window._summaryThemeObserver) {
    window._summaryThemeObserver = new MutationObserver(() => {
      if (window.summaryEquityChart && document.getElementById('summary-equity-curve-chart')) {
        const equityCurve = calculateEquityCurve(getMonthTrades(_currentSummaryMonth));
        renderEquityCurveChart(equityCurve);
      }
    });
    window._summaryThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
}

// Populate summary cards with data
function populateSummarySummary() {
  const monthTrades = getMonthTrades(_currentSummaryMonth);
  const stats = calculateMonthlySummary(monthTrades);
  const equityCurve = calculateEquityCurve(monthTrades);

  // Update month label
  const monthLabel = formatSummaryMonthLabel(_currentSummaryMonth);
  const labelEl = document.getElementById('summary-month-label');
  if (labelEl) labelEl.textContent = monthLabel;

  // Total Trades
  const totalTradesEl = document.getElementById('summary-total-trades');
  if (totalTradesEl) {
    totalTradesEl.textContent = stats.totalTrades;
    const infoEl = document.getElementById('summary-trades-info');
    if (infoEl) infoEl.textContent = 'All trades for the month';
  }

  // Total PnL
  const netPnlEl = document.getElementById('summary-net-pnl');
  if (netPnlEl) {
    netPnlEl.textContent = formatCurrency(stats.totalPnl);
    netPnlEl.style.color = stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
    const infoEl = document.getElementById('summary-pnl-info');
    if (infoEl) {
      const avgPerTrade = stats.totalTrades > 0 ? stats.totalPnl / stats.totalTrades : 0;
      infoEl.textContent = 'Avg: ' + formatCurrency(avgPerTrade);
    }
  }

  // Win Rate
  const winRateEl = document.getElementById('summary-win-rate');
  if (winRateEl) {
    const winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades * 100) : 0;
    winRateEl.textContent = formatPercent(winRate);
    const infoEl = document.getElementById('summary-winrate-info');
    if (infoEl) infoEl.textContent = stats.wins + 'W / ' + stats.losses + 'L';
  }

  // Profit Factor
  const profitFactorEl = document.getElementById('summary-profit-factor');
  if (profitFactorEl) {
    let pf = 0;
    if (stats.totalLossesPnl > 0) {
      pf = stats.totalWinsPnl / stats.totalLossesPnl;
    } else if (stats.totalWinsPnl > 0) {
      pf = stats.totalWinsPnl > 0 ? 999.99 : 0;
    }
    profitFactorEl.textContent = pf > 0 ? pf.toFixed(2) : '—';
    const infoEl = document.getElementById('summary-pf-info');
    if (infoEl) {
      infoEl.textContent = stats.wins + ' winners vs ' + stats.losses + ' losers';
    }
  }

  // Best Trade
  const bestTradeEl = document.getElementById('summary-best-trade');
  if (bestTradeEl) {
    bestTradeEl.textContent = stats.bestTrade !== null ? formatCurrency(stats.bestTrade) : '—';
    bestTradeEl.style.color = stats.bestTrade > 0 ? 'var(--green)' : 'var(--text3)';
    const infoEl = document.getElementById('summary-best-trade-info');
    if (infoEl) infoEl.textContent = 'Highest profit';
  }

  // Worst Trade
  const worstTradeEl = document.getElementById('summary-worst-trade');
  if (worstTradeEl) {
    worstTradeEl.textContent = stats.worstTrade !== null ? formatCurrency(stats.worstTrade) : '—';
    worstTradeEl.style.color = stats.worstTrade < 0 ? 'var(--red)' : 'var(--text3)';
    const infoEl = document.getElementById('summary-worst-trade-info');
    if (infoEl) infoEl.textContent = 'Largest loss';
  }

  // Average Win
  const avgWinEl = document.getElementById('summary-avg-win');
  if (avgWinEl) {
    const avgWin = stats.wins > 0 ? stats.totalWinsPnl / stats.wins : 0;
    avgWinEl.textContent = avgWin > 0 ? formatCurrency(avgWin) : '—';
    const infoEl = document.getElementById('summary-avg-win-info');
    if (infoEl) infoEl.textContent = stats.wins + ' winning trades';
  }

  // Average Loss
  const avgLossEl = document.getElementById('summary-avg-loss');
  if (avgLossEl) {
    const avgLoss = stats.losses > 0 ? stats.totalLossesPnl / stats.losses : 0;
    avgLossEl.textContent = avgLoss > 0 ? '-' + formatCurrency(avgLoss) : '—';
    const infoEl = document.getElementById('summary-avg-loss-info');
    if (infoEl) infoEl.textContent = stats.losses + ' losing trades';
  }

  // Win/Loss Ratio
  const wlRatioEl = document.getElementById('summary-win-loss-ratio');
  if (wlRatioEl) {
    wlRatioEl.textContent = stats.wins + ' / ' + stats.losses;
    const infoEl = document.getElementById('summary-wl-info');
    if (infoEl) {
      const ratio = stats.losses > 0 ? (stats.wins / stats.losses).toFixed(2) : (stats.wins > 0 ? '∞' : '—');
      infoEl.textContent = 'Ratio: ' + ratio;
    }
  }

  // Trading Days
  const tradingDaysEl = document.getElementById('summary-trading-days');
  if (tradingDaysEl) {
    tradingDaysEl.textContent = stats.tradingDays.size;
    const infoEl = document.getElementById('summary-trading-days-info');
    if (infoEl) infoEl.textContent = 'Days with trades';
  }

  // Win Streak
  const winStreakEl = document.getElementById('summary-win-streak');
  if (winStreakEl) {
    winStreakEl.textContent = stats.maxWinStreak;
    const infoEl = document.getElementById('summary-streak-info');
    if (infoEl) infoEl.textContent = 'Consecutive wins';
  }

  // Consistency Score
  const consistencyEl = document.getElementById('summary-consistency');
  if (consistencyEl) {
    const result = calculateMonthlyConsistencyScore(monthTrades);
    consistencyEl.textContent = result.consistency !== null ? `${result.consistency.toFixed(1)}%` : '—';
    const infoEl = document.getElementById('summary-consistency-info');
    if (infoEl) {
      infoEl.textContent = result.totalDays > 0
        ? `${result.winDays} winning days / ${result.totalDays} trading days`
        : 'No trading days';
    }
  }

  renderEquityCurveChart(equityCurve);
}

// Navigate to previous month
function summaryPrevMonth() {
  _currentSummaryMonth.setMonth(_currentSummaryMonth.getMonth() - 1);
  populateSummarySummary();
}

// Navigate to next month
function summaryNextMonth() {
  _currentSummaryMonth.setMonth(_currentSummaryMonth.getMonth() + 1);
  populateSummarySummary();
}

// Initialize summary on view switch
function initSummaryView() {
  _currentSummaryMonth = new Date(); // Reset to current month
  populateSummarySummary();
}
