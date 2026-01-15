# BACKTESTING INVESTMENT STRATEGIES - COMPLETE RESEARCH GUIDE
**Generated: January 15, 2026**

---

## TABLE OF CONTENTS
1. [Portfolio Visualizer](#1-portfolio-visualizer)
2. [Python Backtesting Libraries](#2-python-backtesting-libraries)
3. [Backtesting Best Practices](#3-backtesting-best-practices)
4. [Historical Data Sources](#4-historical-data-sources)
5. [Key Metrics to Track](#5-key-metrics-to-track)
6. [Sample Backtest Code](#6-sample-backtest-code-for-tiny-seed-algorithm)

---

## 1. PORTFOLIO VISUALIZER

**Website:** https://www.portfoliovisualizer.com

Portfolio Visualizer is a no-code platform for visualizing, analyzing, backtesting, and optimizing portfolios based on historical data and Monte Carlo simulation.

### Key Backtesting Tools

#### 1.1 Backtest Portfolio Asset Allocation
**URL:** https://www.portfoliovisualizer.com/backtest-portfolio

- Construct portfolios based on selected asset class allocations
- Compare up to 3 portfolios against benchmarks
- Specify periodic contributions/withdrawals
- Choose rebalancing frequency (monthly, quarterly, semi-annual, annual)

**Rebalancing Bands:**
- Default: 5% absolute deviation for large allocations
- 25% relative deviation for small allocations
- Example: 60% target triggers rebalance at 55% or 65%

**Data Available:** US stocks from 1972, Total US Bond Market from 1987-present

#### 1.2 Factor Regression Analysis
**URL:** https://www.portfoliovisualizer.com/factor-analysis

Analyze returns against Fama-French and Carhart factor models:
- **Mkt (Market)** - Overall market risk premium
- **HmL (High minus Low)** - Value factor
- **SmB (Small minus Big)** - Size factor
- **UmD (Up minus Down)** - Momentum factor
- **RmW (Robust minus Weak)** - Profitability factor
- **CmA (Conservative minus Aggressive)** - Investment factor
- **QmJ (Quality minus Junk)** - Quality factor
- **BaB (Betting against Beta)** - Low volatility factor

**Data Sources:**
- Kenneth French's Data Library
- AQR Factors
- Alpha Architect Factors
- q-Factors (MKT, ME, I/A, ROE, EG)

#### 1.3 Monte Carlo Simulation
**URL:** https://www.portfoliovisualizer.com/monte-carlo-simulation

Test long-term portfolio growth and survival based on:
- Withdrawal rates for retirement planning
- Portfolio survival probability
- Confidence intervals for final balances

**Withdrawal Models:**
1. **Fixed annual percentage** - Ensures portfolio never runs out, but amounts vary
2. **Life expectancy based (RMD approach)** - 1 / Life Expectancy each year
3. **Custom sequence** - Import your own cashflow schedule

**Using Forecasted Returns:**
Select "forecasted" or "parameterized" models to enter your own estimates instead of relying on historical data.

### Free vs Paid Tiers

| Feature | Free | Basic ($19/mo) | Pro ($39/mo) |
|---------|------|----------------|--------------|
| Max Assets | 15 | 25 | 50+ |
| Historical Data | Limited | Full | Full + MTD |
| Factor Analysis | Basic | Advanced | Advanced |

---

## 2. PYTHON BACKTESTING LIBRARIES

### 2.1 Backtrader
**Website:** https://www.backtrader.com
**GitHub:** https://github.com/mementum/backtrader
**Documentation:** Excellent - best for learning

```python
# Installation
pip install backtrader
```

**Key Features:**
- Event-driven architecture
- Live trading support (Interactive Brokers, Oanda)
- Strategy optimization
- Multiple data feeds
- 100+ built-in indicators (SMA, EMA, RSI, Bollinger Bands, etc.)
- Built-in analyzers (Sharpe, TimeReturn, SQN)
- Excellent documentation

**Best For:** Retail traders, live trading, Python learners

**Basic Structure:**
```python
import backtrader as bt

class MyStrategy(bt.Strategy):
    def __init__(self):
        self.sma = bt.indicators.SimpleMovingAverage(self.data.close, period=20)

    def next(self):
        if self.data.close[0] > self.sma[0]:
            self.buy()
        elif self.data.close[0] < self.sma[0]:
            self.sell()

cerebro = bt.Cerebro()
cerebro.addstrategy(MyStrategy)
data = bt.feeds.YahooFinanceData(dataname='AAPL', fromdate=datetime(2020,1,1))
cerebro.adddata(data)
cerebro.run()
cerebro.plot()
```

### 2.2 Zipline (zipline-reloaded)
**GitHub:** https://github.com/stefan-jansen/zipline-reloaded
**History:** Original backtesting engine behind Quantopian

```python
# Installation (use zipline-reloaded fork)
pip install zipline-reloaded
```

**Key Features:**
- Pipeline API for universe selection and factor ranking
- Built-in risk and commission models
- Clean API with `initialize()` and `handle_data()` functions
- Integrates with pandas and scikit-learn

**Limitations:**
- Originally designed for Python 3.5-3.6 (installation challenges)
- Slower event-driven execution
- Not actively maintained (use zipline-reloaded fork)
- Lacks built-in plotting

**Best For:** Academic research, equity factor strategies, Quantopian alumni

### 2.3 PyAlgoTrade
**Website:** https://gbeced.github.io/pyalgotrade/
**GitHub:** https://github.com/gbeced/pyalgotrade

```python
# Installation
pip install pyalgotrade
```

**Key Features:**
- Event-driven
- Supports Market, Limit, Stop, and StopLimit orders
- Multiple CSV formats (Yahoo, Google, Quandl)
- Technical indicators (SMA, WMA, EMA, RSI, Bollinger Bands)
- Performance metrics (Sharpe, drawdown)
- Distributed backtesting support
- Bitcoin trading (Bitstamp)

**Basic Structure:**
```python
from pyalgotrade import strategy
from pyalgotrade.barfeed import yahoofeed

class MyStrategy(strategy.BacktestingStrategy):
    def onBars(self, bars):
        bar = bars["ORCL"]
        self.info(bar.getClose())

feed = yahoofeed.Feed()
feed.addBarsFromCSV("ORCL", "orcl-2000.csv")
myStrategy = MyStrategy(feed)
myStrategy.run()
```

### 2.4 bt (Backtesting)
**Website:** https://pmorissette.github.io/bt/
**GitHub:** https://github.com/pmorissette/bt

```python
# Installation
pip install bt
```

**Key Features:**
- Tree-based strategy composition
- Modular, reusable Algo components
- Excellent for portfolio strategies
- Built-in charting and PDF reports
- Detailed statistics for strategy comparison
- Built on ffn (financial functions library)

**Limitations:**
- Still in alpha stage
- Slower than vectorized alternatives

**Best For:** Portfolio-level backtesting, asset allocation strategies

**Key Algos:**
- `bt.algos.RunQuarterly()` / `RunMonthly()` / `RunDaily()` - Timing
- `bt.algos.SelectAll()` - Asset selection
- `bt.algos.WeighSpecified()` - Fixed weights
- `bt.algos.WeighEqually()` - Equal weight
- `bt.algos.WeighTarget()` - Target weights
- `bt.algos.Rebalance()` - Execute rebalancing

### 2.5 VectorBT
**Website:** https://vectorbt.dev/
**GitHub:** https://github.com/polakowo/vectorbt

```python
# Installation
pip install vectorbt
```

**Key Features:**
- Vectorized (extremely fast)
- Built on NumPy and Numba
- 1000x faster than event-driven frameworks
- Built-in visualization
- Parameter optimization

**Best For:** Research, parameter optimization, high-frequency strategy testing

### Library Comparison Summary

| Library | Speed | Ease of Use | Live Trading | Documentation | Best For |
|---------|-------|-------------|--------------|---------------|----------|
| **Backtrader** | Medium | Good | Yes | Excellent | Beginners, Live |
| **Zipline** | Slow | Good | Limited | Good | Research |
| **PyAlgoTrade** | Medium | Good | Limited | Good | Learning |
| **bt** | Slow | Excellent | No | Good | Portfolios |
| **VectorBT** | Fast | Moderate | No | Good | Research |

### Recommendation for Beginners: **Backtrader or bt**

- **Backtrader** if you want to eventually do live trading
- **bt** if you're focused on portfolio allocation strategies (like Tiny Seed's 75/25 split)

---

## 3. BACKTESTING BEST PRACTICES

### 3.1 Avoiding Overfitting

Overfitting is the "silent killer" of trading strategies - when strategies model random noise rather than actual market behavior.

**Warning Signs:**
- Sharpe Ratio above 3.0 (suspiciously high)
- Strategy only works on specific date ranges
- Many parameters with precise values
- Dramatically different in-sample vs out-of-sample performance

**Prevention Strategies:**

1. **Simplify Rules** - Fewer parameters, clearer logic
2. **Use Walk-Forward Analysis** - Rolling optimization windows
3. **Monte Carlo Simulations** - Test thousands of randomized scenarios
4. **Out-of-Sample Testing** - Never optimize on all data
5. **Cross-Validation** - Test across different market regimes

### 3.2 Out-of-Sample Testing

**Standard Split:**
- **In-Sample (Training):** 70% of data - for strategy development
- **Out-of-Sample (Validation):** 30% of data - for unbiased testing

**Rules:**
- NEVER look at out-of-sample data during development
- Only run out-of-sample test ONCE as final validation
- If you iterate, you've contaminated the test

### 3.3 Walk-Forward Analysis (WFA)

Walk-Forward Analysis is considered the **"gold standard"** for strategy validation.

**How It Works:**
1. Optimize strategy on initial in-sample window
2. Test optimized parameters on out-of-sample window
3. Roll forward - previous out-of-sample becomes in-sample
4. Repeat until all data is used

**Benefits:**
- More realistic simulation of live trading
- Identifies robust strategies vs curve-fitted ones
- Adapts to changing market conditions

**Example Window Configuration:**
```
Total Data: 10 years
In-Sample Window: 2 years
Out-of-Sample Window: 6 months
Step Forward: 6 months

Pass 1: Train 2010-2011, Test 2012 H1
Pass 2: Train 2010.5-2012 H1, Test 2012 H2
Pass 3: Train 2011-2012 H2, Test 2013 H1
... continue rolling
```

**Limitations:**
- Window size selection introduces bias
- Computationally intensive
- Reacts to regime shifts rather than predicting them

### 3.4 Transaction Cost Modeling

A backtest showing 15% annual returns can collapse to near-zero after realistic costs.

**Costs to Model:**

| Cost Type | Typical Range | Notes |
|-----------|---------------|-------|
| Commissions | $0-$5/trade | Many brokers now $0 |
| Spread | 0.01%-0.1% | Wider for small caps |
| Slippage | 0.05%-0.5% | Worse in volatile markets |
| Market Impact | 0.1%-1%+ | For large orders |
| Borrowing Costs | 0.5%-3%/year | For short positions |

**Best Practice:**
- Model costs conservatively (assume worse-than-average execution)
- Include margin of safety
- High-turnover strategies need extra scrutiny

### 3.5 Survivorship Bias

**The Problem:**
Backtests using current index constituents exclude companies that went bankrupt, were delisted, or acquired - artificially inflating returns.

**Real-World Impact:**
- S&P 100 backtest 1993-2020: Initial CAGR 26% vs SPY 9.6%
- After including delistings: CAGR dropped to 12.2%
- Nasdaq 100 example: 46% CAGR became 16.4% with 83% drawdown when dot-com bankruptcies included

**Solutions:**
1. Use survivorship-bias-free databases (CRSP, Quandl)
2. Include delisted stocks up to their delisting date
3. Add explicit survivorship adjustment (1-4% annual drag)

---

## 4. HISTORICAL DATA SOURCES

### 4.1 Free Data Sources

#### Yahoo Finance (yfinance)
**Best For:** Quick experiments, learning, small projects

```python
pip install yfinance

import yfinance as yf
data = yf.download('AAPL', start='2010-01-01', end='2025-01-01')
```

**Pros:**
- Free, no API key needed
- 20+ years of daily data
- Dividends and splits included
- Multiple tickers at once

**Cons:**
- Unofficial (scrapes Yahoo endpoints)
- May break without notice
- Terms of service concerns for commercial use
- No intraday data beyond 60 days

**How Far Back:** 1962 for major US stocks

#### Alpha Vantage
**Website:** https://www.alphavantage.co/
**Best For:** Reliable free API with structure

```python
pip install alpha-vantage

from alpha_vantage.timeseries import TimeSeries
ts = TimeSeries(key='YOUR_API_KEY')
data, meta = ts.get_daily('AAPL', outputsize='full')
```

**Free Tier:**
- 25 requests/day
- 200,000+ tickers across 20+ exchanges
- 20+ years historical data
- 50+ technical indicators

**Cons:**
- Rate limiting (25/day is restrictive)
- Need API key

**How Far Back:** 20+ years for US equities

#### Tiingo
**Website:** https://www.tiingo.com/
**Best For:** Clean data, academic research

**Free Tier:**
- 500 requests/day
- 30+ years US stock history
- Academic pricing available

**How Far Back:** 30+ years for US stocks

#### Finnhub
**Website:** https://finnhub.io/
**Best For:** Development and prototyping

**Free Tier:**
- 60 calls/minute (most generous)
- Real-time quotes
- Company fundamentals

### 4.2 Data Source Comparison

| Source | Free Limit | History | Reliability | Best For |
|--------|------------|---------|-------------|----------|
| yfinance | Unlimited | 60+ yrs | Medium | Learning |
| Alpha Vantage | 25/day | 20+ yrs | High | Structure |
| Tiingo | 500/day | 30+ yrs | High | Research |
| Finnhub | 60/min | Varies | High | Development |

### 4.3 How Far Back Can We Test?

| Asset Type | Typical Start | Notes |
|------------|---------------|-------|
| US Large Cap | 1926 | CRSP database |
| US Total Market | 1972 | Kenneth French data |
| International | 1970s | MSCI indexes |
| Bonds | 1976 | Barclays Aggregate |
| US Treasuries | 1926 | Academic sources |
| ETFs | 1993 | SPY was first |
| Most ETFs | 2000s | Limited history |

---

## 5. KEY METRICS TO TRACK

### 5.1 Return Metrics

#### CAGR (Compound Annual Growth Rate)
**What It Measures:** Annualized return assuming reinvestment

**Formula:**
```
CAGR = (Ending Value / Beginning Value)^(1/Years) - 1
```

**Benchmarks:**
- S&P 500 long-term: ~10%
- Total Stock Market: ~10%
- Bonds: ~5%

#### Total Return
**What It Measures:** Absolute percentage gain/loss

```
Total Return = (Final - Initial) / Initial
```

### 5.2 Risk-Adjusted Metrics

#### Sharpe Ratio
**What It Measures:** Excess return per unit of total volatility

**Formula:**
```
Sharpe = (Return - Risk-Free Rate) / Standard Deviation
```

**Interpretation:**
| Sharpe | Quality |
|--------|---------|
| < 1.0 | Poor (often ignored) |
| 1.0-2.0 | Acceptable |
| 2.0-3.0 | Strong |
| > 3.0 | Excellent (or overfitted) |

**Note:** Quant hedge funds typically require Sharpe > 2.0

#### Sortino Ratio
**What It Measures:** Excess return per unit of DOWNSIDE volatility

**Formula:**
```
Sortino = (Return - Risk-Free Rate) / Downside Deviation
```

**Why It Matters:** Only penalizes negative volatility (what investors actually fear)

**Better than Sharpe when:** Returns are skewed (like options strategies)

#### Calmar Ratio
**What It Measures:** Annual return relative to maximum drawdown

**Formula:**
```
Calmar = CAGR / |Maximum Drawdown|
```

**Interpretation:**
- Higher is better
- Useful for comparing strategies with different risk profiles

### 5.3 Risk Metrics

#### Maximum Drawdown
**What It Measures:** Largest peak-to-trough decline

**Formula:**
```
Max DD = (Trough - Peak) / Peak
```

**Benchmarks:**
- S&P 500 typical: -50% to -55% in crashes
- Conservative target: < 20%
- Aggressive tolerance: < 40%

**Why It Matters:**
- Non-statistical, intuitive measure
- Shows psychological/financial pain potential
- 50% loss requires 100% gain to recover

#### Volatility (Standard Deviation)
**What It Measures:** Dispersion of returns

**Annualized:**
```
Annual Vol = Daily Vol * sqrt(252)
```

### 5.4 Trade Statistics

#### Win Rate
**What It Measures:** Percentage of profitable trades

**Formula:**
```
Win Rate = Winning Trades / Total Trades
```

**Warning:** Win rate alone is misleading - a 40% win rate can be profitable if winners are much larger than losers.

#### Profit Factor
**What It Measures:** Gross profits divided by gross losses

**Formula:**
```
Profit Factor = Sum(Winning Trades) / |Sum(Losing Trades)|
```

**Interpretation:**
- > 1.0 = Profitable
- > 1.5 = Good
- > 2.0 = Excellent

---

## 6. SAMPLE BACKTEST CODE FOR TINY SEED ALGORITHM

### 6.1 Complete Metrics Calculator

```python
"""
Tiny Seed Backtesting Utilities
Performance metrics calculation for investment strategy validation
"""

import numpy as np
import pandas as pd
from datetime import datetime

class PerformanceMetrics:
    """Calculate all key performance metrics for backtesting"""

    def __init__(self, returns: pd.Series, risk_free_rate: float = 0.05, periods_per_year: int = 252):
        """
        Args:
            returns: Daily returns series (not cumulative)
            risk_free_rate: Annual risk-free rate (default 5%)
            periods_per_year: Trading days per year (252 for stocks)
        """
        self.returns = returns.dropna()
        self.rf = risk_free_rate
        self.periods = periods_per_year

    def cagr(self) -> float:
        """Compound Annual Growth Rate"""
        total_return = (1 + self.returns).prod()
        n_years = len(self.returns) / self.periods
        if n_years <= 0:
            return 0.0
        return total_return ** (1/n_years) - 1

    def total_return(self) -> float:
        """Total cumulative return"""
        return (1 + self.returns).prod() - 1

    def volatility(self) -> float:
        """Annualized volatility (standard deviation)"""
        return self.returns.std() * np.sqrt(self.periods)

    def sharpe_ratio(self) -> float:
        """Sharpe Ratio: risk-adjusted return using total volatility"""
        excess_return = self.cagr() - self.rf
        vol = self.volatility()
        if vol == 0:
            return 0.0
        return excess_return / vol

    def sortino_ratio(self) -> float:
        """Sortino Ratio: risk-adjusted return using downside volatility"""
        excess_return = self.cagr() - self.rf
        negative_returns = self.returns[self.returns < 0]
        if len(negative_returns) == 0:
            return np.inf
        downside_vol = negative_returns.std() * np.sqrt(self.periods)
        if downside_vol == 0:
            return np.inf
        return excess_return / downside_vol

    def max_drawdown(self) -> float:
        """Maximum Drawdown: largest peak-to-trough decline"""
        cumulative = (1 + self.returns).cumprod()
        running_max = cumulative.cummax()
        drawdown = (cumulative - running_max) / running_max
        return drawdown.min()

    def calmar_ratio(self) -> float:
        """Calmar Ratio: CAGR divided by maximum drawdown"""
        mdd = abs(self.max_drawdown())
        if mdd == 0:
            return np.inf
        return self.cagr() / mdd

    def win_rate(self) -> float:
        """Win Rate: percentage of positive return periods"""
        if len(self.returns) == 0:
            return 0.0
        return (self.returns > 0).sum() / len(self.returns)

    def profit_factor(self) -> float:
        """Profit Factor: sum of gains / sum of losses"""
        gains = self.returns[self.returns > 0].sum()
        losses = abs(self.returns[self.returns < 0].sum())
        if losses == 0:
            return np.inf
        return gains / losses

    def summary(self) -> dict:
        """Return all metrics as a dictionary"""
        return {
            'CAGR': f"{self.cagr():.2%}",
            'Total Return': f"{self.total_return():.2%}",
            'Volatility': f"{self.volatility():.2%}",
            'Sharpe Ratio': f"{self.sharpe_ratio():.2f}",
            'Sortino Ratio': f"{self.sortino_ratio():.2f}",
            'Max Drawdown': f"{self.max_drawdown():.2%}",
            'Calmar Ratio': f"{self.calmar_ratio():.2f}",
            'Win Rate': f"{self.win_rate():.2%}",
            'Profit Factor': f"{self.profit_factor():.2f}"
        }

    def print_summary(self):
        """Pretty print all metrics"""
        print("\n" + "="*50)
        print("PERFORMANCE METRICS SUMMARY")
        print("="*50)
        for metric, value in self.summary().items():
            print(f"{metric:20} {value:>15}")
        print("="*50)


# Example usage:
if __name__ == "__main__":
    # Generate sample returns
    np.random.seed(42)
    sample_returns = pd.Series(np.random.normal(0.0005, 0.02, 252*5))  # 5 years

    metrics = PerformanceMetrics(sample_returns)
    metrics.print_summary()
```

### 6.2 Dual Momentum Strategy Backtest

```python
"""
Dual Momentum Strategy Backtest
Based on Gary Antonacci's Global Equities Momentum (GEM)
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

class DualMomentumBacktest:
    """
    Dual Momentum Strategy:
    1. Absolute Momentum: Compare asset vs cash (T-bills)
    2. Relative Momentum: Choose best performing asset

    Default implementation:
    - Compare US stocks (SPY) vs International (VEU)
    - If winner beats cash (BIL), invest in winner
    - If cash beats both, invest in bonds (AGG)
    """

    def __init__(self,
                 us_ticker: str = 'SPY',
                 intl_ticker: str = 'VEU',
                 bond_ticker: str = 'AGG',
                 cash_ticker: str = 'BIL',
                 lookback_months: int = 12,
                 start_date: str = '2008-01-01',
                 end_date: str = None):

        self.us_ticker = us_ticker
        self.intl_ticker = intl_ticker
        self.bond_ticker = bond_ticker
        self.cash_ticker = cash_ticker
        self.lookback = lookback_months
        self.start_date = start_date
        self.end_date = end_date or datetime.now().strftime('%Y-%m-%d')

        self.data = None
        self.signals = None
        self.portfolio = None

    def download_data(self):
        """Download historical price data"""
        print("Downloading data...")

        # Download all tickers
        tickers = [self.us_ticker, self.intl_ticker, self.bond_ticker, self.cash_ticker]

        # Need extra data for lookback calculation
        lookback_start = (datetime.strptime(self.start_date, '%Y-%m-%d') -
                         timedelta(days=self.lookback * 35)).strftime('%Y-%m-%d')

        data = yf.download(tickers, start=lookback_start, end=self.end_date,
                          auto_adjust=True, progress=False)['Close']

        self.data = data.dropna()
        print(f"Downloaded {len(self.data)} days of data")
        return self.data

    def calculate_momentum(self, prices: pd.Series, periods: int = None) -> pd.Series:
        """Calculate momentum (trailing return) over lookback period"""
        if periods is None:
            periods = self.lookback * 21  # ~21 trading days per month
        return prices.pct_change(periods=periods)

    def generate_signals(self) -> pd.DataFrame:
        """Generate monthly rebalancing signals based on dual momentum"""
        if self.data is None:
            self.download_data()

        # Calculate momentum for each asset
        us_mom = self.calculate_momentum(self.data[self.us_ticker])
        intl_mom = self.calculate_momentum(self.data[self.intl_ticker])
        cash_mom = self.calculate_momentum(self.data[self.cash_ticker])

        # Create signals DataFrame
        signals = pd.DataFrame(index=self.data.index)
        signals['us_momentum'] = us_mom
        signals['intl_momentum'] = intl_mom
        signals['cash_momentum'] = cash_mom

        # Determine position each day (will filter to monthly later)
        def determine_position(row):
            # Relative momentum: which equity is stronger?
            if row['us_momentum'] > row['intl_momentum']:
                equity_winner = 'US'
                equity_mom = row['us_momentum']
            else:
                equity_winner = 'INTL'
                equity_mom = row['intl_momentum']

            # Absolute momentum: does winner beat cash?
            if equity_mom > row['cash_momentum']:
                return equity_winner
            else:
                return 'BOND'

        signals['position'] = signals.apply(determine_position, axis=1)

        # Monthly rebalancing: only change position on month-end
        signals['month'] = signals.index.to_period('M')
        signals['is_month_end'] = signals['month'] != signals['month'].shift(-1)

        # Forward fill position within each month
        monthly_positions = signals[signals['is_month_end']]['position']
        signals['active_position'] = monthly_positions.reindex(signals.index).ffill()

        self.signals = signals
        return signals

    def run_backtest(self, initial_capital: float = 10000) -> pd.DataFrame:
        """Execute backtest and calculate portfolio value"""
        if self.signals is None:
            self.generate_signals()

        # Calculate daily returns for each asset
        returns = self.data.pct_change().dropna()

        # Map positions to returns
        position_map = {
            'US': self.us_ticker,
            'INTL': self.intl_ticker,
            'BOND': self.bond_ticker
        }

        # Calculate portfolio returns based on active position
        portfolio = pd.DataFrame(index=returns.index)
        portfolio['position'] = self.signals.loc[returns.index, 'active_position']

        # Get return based on position
        portfolio['daily_return'] = portfolio.apply(
            lambda row: returns.loc[row.name, position_map.get(row['position'], self.bond_ticker)]
            if row.name in returns.index and not pd.isna(row['position'])
            else 0,
            axis=1
        )

        # Calculate cumulative portfolio value
        portfolio['cumulative_return'] = (1 + portfolio['daily_return']).cumprod()
        portfolio['portfolio_value'] = initial_capital * portfolio['cumulative_return']

        # Also track buy-and-hold SPY for comparison
        spy_returns = returns[self.us_ticker]
        portfolio['spy_cumulative'] = (1 + spy_returns).cumprod()
        portfolio['spy_value'] = initial_capital * portfolio['spy_cumulative']

        # Filter to backtest period
        portfolio = portfolio[portfolio.index >= self.start_date]

        self.portfolio = portfolio
        return portfolio

    def plot_results(self, save_path: str = None):
        """Plot backtest results"""
        if self.portfolio is None:
            self.run_backtest()

        fig, axes = plt.subplots(3, 1, figsize=(14, 10))

        # Plot 1: Portfolio Value Comparison
        ax1 = axes[0]
        ax1.plot(self.portfolio.index, self.portfolio['portfolio_value'],
                label='Dual Momentum', linewidth=2)
        ax1.plot(self.portfolio.index, self.portfolio['spy_value'],
                label='Buy & Hold SPY', linewidth=2, alpha=0.7)
        ax1.set_title('Dual Momentum Strategy vs Buy & Hold', fontsize=14)
        ax1.set_ylabel('Portfolio Value ($)')
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        # Plot 2: Drawdown
        ax2 = axes[1]
        cumulative = self.portfolio['cumulative_return']
        drawdown = (cumulative - cumulative.cummax()) / cumulative.cummax() * 100
        ax2.fill_between(self.portfolio.index, drawdown, 0, alpha=0.5, color='red')
        ax2.set_title('Drawdown (%)', fontsize=14)
        ax2.set_ylabel('Drawdown %')
        ax2.grid(True, alpha=0.3)

        # Plot 3: Position Over Time
        ax3 = axes[2]
        position_colors = {'US': 'blue', 'INTL': 'green', 'BOND': 'orange'}
        for pos in ['US', 'INTL', 'BOND']:
            mask = self.portfolio['position'] == pos
            ax3.scatter(self.portfolio.index[mask],
                       [pos] * mask.sum(),
                       c=position_colors[pos],
                       label=pos, s=1)
        ax3.set_title('Active Position Over Time', fontsize=14)
        ax3.set_ylabel('Position')
        ax3.legend()

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Chart saved to {save_path}")

        plt.show()

    def get_metrics(self) -> dict:
        """Calculate performance metrics"""
        if self.portfolio is None:
            self.run_backtest()

        from tiny_seed_backtest_utils import PerformanceMetrics

        returns = self.portfolio['daily_return']
        metrics = PerformanceMetrics(returns)

        # Also calculate for SPY benchmark
        spy_returns = self.portfolio['spy_value'].pct_change().dropna()
        spy_metrics = PerformanceMetrics(spy_returns)

        return {
            'Dual Momentum': metrics.summary(),
            'SPY Benchmark': spy_metrics.summary()
        }


# Run the backtest
if __name__ == "__main__":
    # Initialize backtest
    backtest = DualMomentumBacktest(
        start_date='2010-01-01',
        end_date='2025-01-01'
    )

    # Run backtest
    portfolio = backtest.run_backtest(initial_capital=10000)

    # Print results
    print("\n" + "="*60)
    print("DUAL MOMENTUM BACKTEST RESULTS")
    print("="*60)

    final_dm = portfolio['portfolio_value'].iloc[-1]
    final_spy = portfolio['spy_value'].iloc[-1]

    print(f"\nInitial Capital: $10,000")
    print(f"Final Value (Dual Momentum): ${final_dm:,.2f}")
    print(f"Final Value (SPY Buy & Hold): ${final_spy:,.2f}")
    print(f"\nOutperformance: ${final_dm - final_spy:,.2f}")

    # Show position breakdown
    print("\n" + "-"*40)
    print("POSITION ALLOCATION")
    print("-"*40)
    pos_counts = portfolio['position'].value_counts(normalize=True)
    for pos, pct in pos_counts.items():
        print(f"{pos}: {pct:.1%}")

    # Plot results
    backtest.plot_results()
```

### 6.3 75/25 Safe/Growth Split Backtest (Tiny Seed Algorithm)

```python
"""
Tiny Seed 75/25 Safe/Growth Allocation Backtest
Tests the core Tiny Seed investment algorithm:
- 75% in "Safe" assets (bonds, stable value)
- 25% in "Growth" assets (stocks, equity)
- Monthly rebalancing
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import matplotlib.pyplot as plt


class TinySeedBacktest:
    """
    Backtest for Tiny Seed's 75/25 Safe/Growth allocation strategy

    Safe Assets: Bond ETFs (AGG, BND)
    Growth Assets: Stock ETFs (VTI, SPY)

    Strategy:
    - Maintain fixed allocation
    - Rebalance quarterly
    - Compare against pure stock and 60/40 benchmark
    """

    def __init__(self,
                 safe_ticker: str = 'AGG',      # iShares Core US Aggregate Bond
                 growth_ticker: str = 'VTI',     # Vanguard Total Stock Market
                 safe_weight: float = 0.75,
                 growth_weight: float = 0.25,
                 rebalance_freq: str = 'Q',      # Q=quarterly, M=monthly, Y=yearly
                 start_date: str = '2010-01-01',
                 end_date: str = None):

        self.safe_ticker = safe_ticker
        self.growth_ticker = growth_ticker
        self.safe_weight = safe_weight
        self.growth_weight = growth_weight
        self.rebalance_freq = rebalance_freq
        self.start_date = start_date
        self.end_date = end_date or datetime.now().strftime('%Y-%m-%d')

        self.data = None
        self.portfolio = None

    def download_data(self):
        """Download historical price data for all assets"""
        print(f"Downloading data from {self.start_date} to {self.end_date}...")

        tickers = [self.safe_ticker, self.growth_ticker]

        self.data = yf.download(tickers, start=self.start_date, end=self.end_date,
                               auto_adjust=True, progress=False)['Close']
        self.data = self.data.dropna()

        print(f"Downloaded {len(self.data)} days of data")
        return self.data

    def run_backtest(self, initial_capital: float = 10000) -> pd.DataFrame:
        """Run the backtest with periodic rebalancing"""
        if self.data is None:
            self.download_data()

        # Calculate daily returns
        returns = self.data.pct_change().dropna()

        # Initialize portfolio
        portfolio = pd.DataFrame(index=returns.index)

        # Track shares and values
        safe_shares = (initial_capital * self.safe_weight) / self.data[self.safe_ticker].iloc[0]
        growth_shares = (initial_capital * self.growth_weight) / self.data[self.growth_ticker].iloc[0]

        portfolio_values = []
        safe_values = []
        growth_values = []

        # Determine rebalance dates
        portfolio['period'] = portfolio.index.to_period(self.rebalance_freq)
        portfolio['is_rebalance'] = portfolio['period'] != portfolio['period'].shift(-1)

        for i, (date, row) in enumerate(returns.iterrows()):
            # Current prices
            safe_price = self.data[self.safe_ticker].loc[date]
            growth_price = self.data[self.growth_ticker].loc[date]

            # Calculate current values
            safe_val = safe_shares * safe_price
            growth_val = growth_shares * growth_price
            total_val = safe_val + growth_val

            # Store values
            safe_values.append(safe_val)
            growth_values.append(growth_val)
            portfolio_values.append(total_val)

            # Rebalance if needed
            if portfolio['is_rebalance'].iloc[i]:
                # Calculate new share counts to restore target weights
                target_safe_val = total_val * self.safe_weight
                target_growth_val = total_val * self.growth_weight

                safe_shares = target_safe_val / safe_price
                growth_shares = target_growth_val / growth_price

        # Build results DataFrame
        portfolio['portfolio_value'] = portfolio_values
        portfolio['safe_value'] = safe_values
        portfolio['growth_value'] = growth_values

        # Calculate actual weights
        portfolio['safe_weight'] = portfolio['safe_value'] / portfolio['portfolio_value']
        portfolio['growth_weight'] = portfolio['growth_value'] / portfolio['portfolio_value']

        # Daily returns
        portfolio['daily_return'] = portfolio['portfolio_value'].pct_change()

        # Benchmark: 100% stocks (buy and hold)
        portfolio['stocks_only'] = initial_capital * (1 + returns[self.growth_ticker]).cumprod()

        # Benchmark: 60/40 portfolio
        portfolio['sixty_forty'] = initial_capital * (
            1 + 0.6 * returns[self.growth_ticker] + 0.4 * returns[self.safe_ticker]
        ).cumprod()

        # Benchmark: 100% bonds
        portfolio['bonds_only'] = initial_capital * (1 + returns[self.safe_ticker]).cumprod()

        self.portfolio = portfolio
        return portfolio

    def calculate_metrics(self) -> dict:
        """Calculate performance metrics for all strategies"""
        if self.portfolio is None:
            self.run_backtest()

        results = {}

        strategies = {
            f'{int(self.safe_weight*100)}/{int(self.growth_weight*100)} Safe/Growth': 'portfolio_value',
            '100% Stocks': 'stocks_only',
            '60/40 Stocks/Bonds': 'sixty_forty',
            '100% Bonds': 'bonds_only'
        }

        for name, col in strategies.items():
            returns = self.portfolio[col].pct_change().dropna()

            # Calculate metrics
            total_return = (self.portfolio[col].iloc[-1] / self.portfolio[col].iloc[0]) - 1
            n_years = len(returns) / 252
            cagr = (1 + total_return) ** (1/n_years) - 1
            volatility = returns.std() * np.sqrt(252)
            sharpe = (cagr - 0.05) / volatility if volatility > 0 else 0

            # Maximum drawdown
            cumulative = (1 + returns).cumprod()
            running_max = cumulative.cummax()
            drawdown = (cumulative - running_max) / running_max
            max_dd = drawdown.min()

            # Sortino (downside deviation)
            downside_returns = returns[returns < 0]
            downside_vol = downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 else 0.001
            sortino = (cagr - 0.05) / downside_vol

            # Calmar
            calmar = cagr / abs(max_dd) if max_dd != 0 else 0

            results[name] = {
                'Final Value': f"${self.portfolio[col].iloc[-1]:,.2f}",
                'Total Return': f"{total_return:.2%}",
                'CAGR': f"{cagr:.2%}",
                'Volatility': f"{volatility:.2%}",
                'Sharpe Ratio': f"{sharpe:.2f}",
                'Sortino Ratio': f"{sortino:.2f}",
                'Max Drawdown': f"{max_dd:.2%}",
                'Calmar Ratio': f"{calmar:.2f}"
            }

        return results

    def plot_results(self, save_path: str = None):
        """Create visualization of backtest results"""
        if self.portfolio is None:
            self.run_backtest()

        fig, axes = plt.subplots(3, 1, figsize=(14, 12))

        # Plot 1: Portfolio Values Comparison
        ax1 = axes[0]
        ax1.plot(self.portfolio.index, self.portfolio['portfolio_value'],
                label=f'{int(self.safe_weight*100)}/{int(self.growth_weight*100)} Safe/Growth',
                linewidth=2.5, color='green')
        ax1.plot(self.portfolio.index, self.portfolio['stocks_only'],
                label='100% Stocks', linewidth=1.5, alpha=0.7, color='blue')
        ax1.plot(self.portfolio.index, self.portfolio['sixty_forty'],
                label='60/40 Stocks/Bonds', linewidth=1.5, alpha=0.7, color='purple')
        ax1.plot(self.portfolio.index, self.portfolio['bonds_only'],
                label='100% Bonds', linewidth=1.5, alpha=0.7, color='orange')

        ax1.set_title('Tiny Seed 75/25 Strategy vs Benchmarks', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Portfolio Value ($)')
        ax1.legend(loc='upper left')
        ax1.grid(True, alpha=0.3)
        ax1.set_yscale('log')  # Log scale to see relative performance

        # Plot 2: Drawdowns
        ax2 = axes[1]
        for col, label, color in [
            ('portfolio_value', '75/25', 'green'),
            ('stocks_only', 'Stocks', 'blue'),
            ('sixty_forty', '60/40', 'purple')
        ]:
            cumulative = self.portfolio[col] / self.portfolio[col].iloc[0]
            running_max = cumulative.cummax()
            dd = (cumulative - running_max) / running_max * 100
            ax2.plot(self.portfolio.index, dd, label=label, alpha=0.7, color=color)

        ax2.fill_between(self.portfolio.index,
                        (self.portfolio['portfolio_value'] / self.portfolio['portfolio_value'].iloc[0]).cummax().pipe(
                            lambda x: ((self.portfolio['portfolio_value'] / self.portfolio['portfolio_value'].iloc[0]) - x) / x * 100
                        ), 0, alpha=0.3, color='green')
        ax2.set_title('Drawdown Comparison (%)', fontsize=14)
        ax2.set_ylabel('Drawdown %')
        ax2.legend()
        ax2.grid(True, alpha=0.3)

        # Plot 3: Rolling Allocation
        ax3 = axes[2]
        ax3.fill_between(self.portfolio.index, 0, self.portfolio['safe_weight'] * 100,
                        label='Safe (Bonds)', alpha=0.7, color='orange')
        ax3.fill_between(self.portfolio.index, self.portfolio['safe_weight'] * 100, 100,
                        label='Growth (Stocks)', alpha=0.7, color='green')
        ax3.axhline(y=75, color='red', linestyle='--', linewidth=1, label='Target 75%')
        ax3.set_title('Portfolio Allocation Over Time (with quarterly rebalancing)', fontsize=14)
        ax3.set_ylabel('Allocation %')
        ax3.set_ylim(0, 100)
        ax3.legend(loc='upper right')
        ax3.grid(True, alpha=0.3)

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Chart saved to {save_path}")

        plt.show()

    def print_report(self):
        """Print comprehensive backtest report"""
        metrics = self.calculate_metrics()

        print("\n" + "="*80)
        print("TINY SEED INVESTMENT ALGORITHM BACKTEST REPORT")
        print(f"Strategy: {int(self.safe_weight*100)}% Safe / {int(self.growth_weight*100)}% Growth")
        print(f"Period: {self.start_date} to {self.end_date}")
        print(f"Rebalancing: {{'Q': 'Quarterly', 'M': 'Monthly', 'Y': 'Yearly'}[self.rebalance_freq]}")
        print("="*80)

        # Create comparison table
        print("\n" + "-"*80)
        print(f"{'Metric':<20}", end="")
        for strategy in metrics.keys():
            print(f"{strategy:>15}", end="")
        print("\n" + "-"*80)

        metric_names = list(list(metrics.values())[0].keys())
        for metric in metric_names:
            print(f"{metric:<20}", end="")
            for strategy in metrics.keys():
                print(f"{metrics[strategy][metric]:>15}", end="")
            print()

        print("-"*80)

        # Key insights
        print("\nKEY INSIGHTS:")
        print("-" * 40)

        tiny_seed = metrics[f'{int(self.safe_weight*100)}/{int(self.growth_weight*100)} Safe/Growth']
        stocks = metrics['100% Stocks']

        ts_cagr = float(tiny_seed['CAGR'].strip('%')) / 100
        st_cagr = float(stocks['CAGR'].strip('%')) / 100
        ts_dd = float(tiny_seed['Max Drawdown'].strip('%')) / 100
        st_dd = float(stocks['Max Drawdown'].strip('%')) / 100
        ts_sharpe = float(tiny_seed['Sharpe Ratio'])
        st_sharpe = float(stocks['Sharpe Ratio'])

        print(f"  - CAGR: {tiny_seed['CAGR']} vs {stocks['CAGR']} (stocks)")
        print(f"  - Max Drawdown: {tiny_seed['Max Drawdown']} vs {stocks['Max Drawdown']} (stocks)")
        print(f"  - Sharpe Ratio: {tiny_seed['Sharpe Ratio']} vs {stocks['Sharpe Ratio']} (stocks)")

        if ts_sharpe > st_sharpe:
            print(f"\n  >>> 75/25 has BETTER risk-adjusted returns (higher Sharpe)")
        if abs(ts_dd) < abs(st_dd):
            print(f"  >>> 75/25 has {abs(st_dd/ts_dd):.1f}x SMALLER maximum drawdown")


# Run the Tiny Seed backtest
if __name__ == "__main__":

    print("="*60)
    print("TINY SEED ALGORITHM VALIDATION")
    print("="*60)

    # Test different configurations
    configs = [
        {'safe': 0.75, 'growth': 0.25, 'name': 'Conservative (75/25)'},
        {'safe': 0.60, 'growth': 0.40, 'name': 'Moderate (60/40)'},
        {'safe': 0.50, 'growth': 0.50, 'name': 'Balanced (50/50)'},
    ]

    for config in configs:
        print(f"\n\nTesting {config['name']}...")

        backtest = TinySeedBacktest(
            safe_ticker='AGG',      # Bonds
            growth_ticker='VTI',    # Total Stock Market
            safe_weight=config['safe'],
            growth_weight=config['growth'],
            rebalance_freq='Q',     # Quarterly rebalancing
            start_date='2010-01-01',
            end_date='2025-01-01'
        )

        backtest.run_backtest(initial_capital=10000)
        backtest.print_report()

    # Plot the main 75/25 strategy
    main_backtest = TinySeedBacktest(
        safe_weight=0.75,
        growth_weight=0.25,
        start_date='2010-01-01',
        end_date='2025-01-01'
    )
    main_backtest.run_backtest(initial_capital=10000)
    main_backtest.plot_results()
```

### 6.4 Using the bt Library for Portfolio Backtesting

```python
"""
Tiny Seed Backtest using bt library
Cleaner, more modular approach for portfolio-level strategies
"""

import bt
import pandas as pd
import yfinance as yf
from datetime import datetime
import matplotlib.pyplot as plt


def run_bt_backtest():
    """Run portfolio backtest using bt library"""

    # Download data
    print("Downloading data...")
    tickers = ['VTI', 'AGG', 'SPY']  # Growth, Safe, Benchmark
    prices = yf.download(tickers, start='2010-01-01', end='2025-01-01',
                        auto_adjust=True, progress=False)['Close']
    prices = prices.dropna()

    # Define strategies

    # Strategy 1: Tiny Seed 75/25 (Safe-heavy)
    tiny_seed_75_25 = bt.Strategy('Tiny Seed 75/25', [
        bt.algos.RunQuarterly(),
        bt.algos.SelectAll(),
        bt.algos.WeighSpecified(VTI=0.25, AGG=0.75),
        bt.algos.Rebalance()
    ])

    # Strategy 2: Traditional 60/40 (Stocks/Bonds)
    traditional_60_40 = bt.Strategy('Traditional 60/40', [
        bt.algos.RunQuarterly(),
        bt.algos.SelectAll(),
        bt.algos.WeighSpecified(VTI=0.60, AGG=0.40),
        bt.algos.Rebalance()
    ])

    # Strategy 3: 100% Stocks (Buy and Hold)
    all_stocks = bt.Strategy('100% Stocks', [
        bt.algos.RunOnce(),
        bt.algos.SelectAll(),
        bt.algos.WeighSpecified(VTI=1.0),
        bt.algos.Rebalance()
    ])

    # Strategy 4: 100% Bonds
    all_bonds = bt.Strategy('100% Bonds', [
        bt.algos.RunOnce(),
        bt.algos.SelectAll(),
        bt.algos.WeighSpecified(AGG=1.0),
        bt.algos.Rebalance()
    ])

    # Strategy 5: Equal Weight (50/50)
    equal_weight = bt.Strategy('Equal Weight 50/50', [
        bt.algos.RunQuarterly(),
        bt.algos.SelectAll(),
        bt.algos.WeighEqually(),
        bt.algos.Rebalance()
    ])

    # Create backtests
    bt_tiny_seed = bt.Backtest(tiny_seed_75_25, prices[['VTI', 'AGG']])
    bt_traditional = bt.Backtest(traditional_60_40, prices[['VTI', 'AGG']])
    bt_stocks = bt.Backtest(all_stocks, prices[['VTI']])
    bt_bonds = bt.Backtest(all_bonds, prices[['AGG']])
    bt_equal = bt.Backtest(equal_weight, prices[['VTI', 'AGG']])

    # Run all backtests
    print("Running backtests...")
    results = bt.run(bt_tiny_seed, bt_traditional, bt_stocks, bt_bonds, bt_equal)

    # Display results
    print("\n" + "="*80)
    print("BT LIBRARY BACKTEST RESULTS")
    print("="*80)
    print(results.display())

    # Plot results
    results.plot(title='Tiny Seed Strategy Comparison')
    plt.tight_layout()
    plt.show()

    # Plot drawdowns
    results.plot_drawdown()
    plt.tight_layout()
    plt.show()

    return results


if __name__ == "__main__":
    results = run_bt_backtest()
```

### 6.5 Quick Validation Script

```python
"""
QUICK VALIDATION SCRIPT
Run this to quickly validate Tiny Seed investment allocations
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime

def quick_validate(safe_pct=75, growth_pct=25, years=10):
    """
    Quick validation of allocation strategy

    Args:
        safe_pct: Percentage in bonds (default 75)
        growth_pct: Percentage in stocks (default 25)
        years: Years to backtest (default 10)
    """
    print(f"\n{'='*60}")
    print(f"QUICK VALIDATION: {safe_pct}/{growth_pct} Safe/Growth")
    print(f"Period: Last {years} years")
    print(f"{'='*60}")

    # Download data
    end_date = datetime.now()
    start_date = datetime(end_date.year - years, end_date.month, end_date.day)

    data = yf.download(['VTI', 'AGG'], start=start_date, end=end_date,
                      auto_adjust=True, progress=False)['Close']

    # Calculate returns
    returns = data.pct_change().dropna()

    # Portfolio return (daily rebalanced for simplicity)
    portfolio_returns = (growth_pct/100 * returns['VTI'] +
                        safe_pct/100 * returns['AGG'])

    # Benchmarks
    spy_returns = returns['VTI']
    bond_returns = returns['AGG']
    sixty_forty = 0.6 * returns['VTI'] + 0.4 * returns['AGG']

    def calc_stats(r, name):
        total_ret = (1 + r).prod() - 1
        n_years = len(r) / 252
        cagr = (1 + total_ret) ** (1/n_years) - 1
        vol = r.std() * np.sqrt(252)
        sharpe = (cagr - 0.05) / vol if vol > 0 else 0

        cum = (1 + r).cumprod()
        dd = (cum - cum.cummax()) / cum.cummax()
        max_dd = dd.min()

        return {
            'Strategy': name,
            'CAGR': f"{cagr:.2%}",
            'Volatility': f"{vol:.2%}",
            'Sharpe': f"{sharpe:.2f}",
            'Max DD': f"{max_dd:.2%}",
            'Total Ret': f"{total_ret:.2%}"
        }

    results = [
        calc_stats(portfolio_returns, f'{safe_pct}/{growth_pct}'),
        calc_stats(spy_returns, '100% Stocks'),
        calc_stats(bond_returns, '100% Bonds'),
        calc_stats(sixty_forty, '60/40'),
    ]

    # Print results
    df = pd.DataFrame(results)
    print(df.to_string(index=False))

    return df


if __name__ == "__main__":
    # Test the Tiny Seed allocation
    quick_validate(75, 25, 10)
    quick_validate(75, 25, 15)
    quick_validate(60, 40, 10)
    quick_validate(50, 50, 10)
```

---

## INSTALLATION REQUIREMENTS

```bash
# Create virtual environment
python -m venv backtest_env
source backtest_env/bin/activate  # Linux/Mac
# backtest_env\Scripts\activate   # Windows

# Install required packages
pip install numpy pandas matplotlib yfinance bt backtrader

# Optional: for advanced features
pip install vectorbt scipy
```

---

## SOURCES & REFERENCES

### Portfolio Visualizer
- [Portfolio Visualizer Home](https://www.portfoliovisualizer.com/)
- [Backtest Portfolio Asset Allocation](https://www.portfoliovisualizer.com/backtest-portfolio)
- [Monte Carlo Simulation](https://www.portfoliovisualizer.com/monte-carlo-simulation)
- [Portfolio Visualizer Guide - AlgoTrading101](https://algotrading101.com/learn/portfolio-visualizer-guide/)
- [Portfolio Visualizer - Rob Berger](https://robberger.com/tools/portfolio-visualizer/)

### Python Libraries
- [Backtrader Documentation](https://www.backtrader.com/docu/)
- [bt Documentation](https://pmorissette.github.io/bt/)
- [Zipline-Reloaded](https://github.com/stefan-jansen/zipline-reloaded)
- [PyAlgoTrade Tutorial](https://gbeced.github.io/pyalgotrade/docs/v0.20/html/tutorial.html)
- [VectorBT](https://vectorbt.dev/)
- [Python Backtesting Libraries Comparison - Medium](https://medium.com/@trading.dude/battle-tested-backtesters-comparing-vectorbt-zipline-and-backtrader-for-financial-strategy-dee33d33a9e0)
- [Backtesting Frameworks Comparison - AutoTradeLab](https://autotradelab.com/blog/backtrader-vs-nautilusttrader-vs-vectorbt-vs-zipline-reloaded)

### Best Practices
- [Walk-Forward Analysis - Interactive Brokers](https://www.interactivebrokers.com/campus/ibkr-quant-news/the-future-of-backtesting-a-deep-dive-into-walk-forward-analysis/)
- [Walk-Forward Optimization - QuantInsti](https://blog.quantinsti.com/walk-forward-optimization-introduction/)
- [Backtesting Best Practices 2025 - PickMyTrade](https://blog.pickmytrade.trade/backtesting-strategies-tools-methods-best-practices-2025/)
- [Avoid Overfitting - LuxAlgo](https://www.luxalgo.com/blog/what-is-overfitting-in-trading-strategies/)
- [Survivorship Bias - Quantified Strategies](https://www.quantifiedstrategies.com/survivorship-bias-in-backtesting/)

### Data Sources
- [yfinance Documentation](https://github.com/ranaroussi/yfinance)
- [Alpha Vantage](https://www.alphavantage.co/)
- [Tiingo](https://www.tiingo.com/)
- [Free Finance APIs Comparison](https://noteapiconnector.com/best-free-finance-apis)

### Performance Metrics
- [Sharpe, Sortino, Calmar - CodeArmo](https://www.codearmo.com/blog/sharpe-sortino-and-calmar-ratios-python)
- [Risk-Adjusted Metrics - Medium](https://medium.com/@mburakbedir/beyond-returns-a-deep-dive-into-risk-adjusted-metrics-with-sharpe-sortino-calmer-and-modigliani-9653a2341f51)
- [Sharpe Ratio - QuantInsti](https://blog.quantinsti.com/sharpe-ratio-applications-algorithmic-trading/)

### Dual Momentum
- [Dual Momentum Strategy - Python in Plain English](https://python.plainenglish.io/dual-momentum-strategy-using-python-a3a7dd337ae3)
- [GEM Implementation - GitHub](https://github.com/alexjansenhome/GEM)
- [Momentum Strategy - Quantified Strategies](https://www.quantifiedstrategies.com/python-momentum-trading-strategy/)
