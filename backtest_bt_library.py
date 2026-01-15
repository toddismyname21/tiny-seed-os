"""
Tiny Seed Backtest using bt library
Cleaner, more modular approach for portfolio-level strategies

Install: pip install bt
"""

import bt
import pandas as pd
import yfinance as yf
from datetime import datetime
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')


def run_bt_backtest():
    """Run portfolio backtest using bt library"""

    # Download data
    print("Downloading data...")
    tickers = ['VTI', 'AGG', 'SPY']  # Growth, Safe, Benchmark
    prices = yf.download(tickers, start='2010-01-01', end='2025-01-01',
                        auto_adjust=True, progress=False)['Close']
    prices = prices.dropna()

    print(f"Downloaded {len(prices)} days of data\n")

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

    # Get stats
    stats = results.stats

    # Print key metrics
    metrics = ['total_return', 'cagr', 'max_drawdown', 'daily_sharpe', 'daily_sortino', 'calmar']
    metric_names = ['Total Return', 'CAGR', 'Max Drawdown', 'Sharpe Ratio', 'Sortino Ratio', 'Calmar Ratio']

    print("\n" + "-"*80)
    header = f"{'Metric':<20}"
    for col in stats.columns:
        header += f"{col:>15}"
    print(header)
    print("-"*80)

    for metric, name in zip(metrics, metric_names):
        if metric in stats.index:
            row = f"{name:<20}"
            for col in stats.columns:
                val = stats.loc[metric, col]
                if 'return' in metric or 'drawdown' in metric or 'cagr' in metric:
                    row += f"{val:>15.2%}"
                else:
                    row += f"{val:>15.2f}"
            print(row)

    print("-"*80)

    # Plot results
    print("\nGenerating plots...")

    # Plot 1: Performance comparison
    fig, axes = plt.subplots(2, 1, figsize=(14, 10))

    results.plot(ax=axes[0], title='Portfolio Performance Comparison')
    axes[0].set_ylabel('Portfolio Value')
    axes[0].grid(True, alpha=0.3)

    # Plot 2: Drawdowns
    results.plot_drawdown(ax=axes[1])
    axes[1].set_title('Drawdown Comparison')
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.show()

    return results


def run_momentum_bt():
    """Run momentum-based strategy using bt"""

    print("\n" + "="*60)
    print("MOMENTUM STRATEGY BACKTEST (using bt library)")
    print("="*60)

    # Download data
    tickers = ['SPY', 'VEU', 'AGG', 'BIL']  # US, Intl, Bonds, Cash
    prices = yf.download(tickers, start='2010-01-01', end='2025-01-01',
                        auto_adjust=True, progress=False)['Close']
    prices = prices.dropna()

    # Calculate 12-month momentum
    momentum = prices.pct_change(252)  # ~252 trading days = 12 months

    # Simple momentum strategy: invest in highest momentum equity if positive
    def select_by_momentum(target):
        """Select asset with highest momentum"""
        class SelectMomentum(bt.Algo):
            def __call__(self, target):
                # Get current momentum values
                selected = []

                mom = momentum.loc[:target.now]
                if len(mom) < 252:
                    selected = ['AGG']  # Default to bonds
                else:
                    latest_mom = mom.iloc[-1]

                    # Compare US vs International
                    us_mom = latest_mom.get('SPY', 0)
                    intl_mom = latest_mom.get('VEU', 0)
                    cash_mom = latest_mom.get('BIL', 0)

                    # Relative momentum
                    if us_mom > intl_mom:
                        best_equity = 'SPY'
                        best_mom = us_mom
                    else:
                        best_equity = 'VEU'
                        best_mom = intl_mom

                    # Absolute momentum
                    if best_mom > cash_mom:
                        selected = [best_equity]
                    else:
                        selected = ['AGG']

                target.temp['selected'] = selected
                return True

        return SelectMomentum()

    # Create momentum strategy
    momentum_strategy = bt.Strategy('Dual Momentum', [
        bt.algos.RunMonthly(),
        select_by_momentum(None),
        bt.algos.WeighEqually(),
        bt.algos.Rebalance()
    ])

    # Buy and hold SPY for comparison
    buy_hold = bt.Strategy('Buy & Hold SPY', [
        bt.algos.RunOnce(),
        bt.algos.SelectAll(),
        bt.algos.WeighSpecified(SPY=1.0),
        bt.algos.Rebalance()
    ])

    # Run backtests
    bt_momentum = bt.Backtest(momentum_strategy, prices)
    bt_buy_hold = bt.Backtest(buy_hold, prices[['SPY']])

    results = bt.run(bt_momentum, bt_buy_hold)

    print(results.stats.loc[['total_return', 'cagr', 'max_drawdown', 'daily_sharpe']])

    results.plot(title='Dual Momentum vs Buy & Hold')
    plt.tight_layout()
    plt.show()

    return results


if __name__ == "__main__":
    # Run main portfolio backtest
    results = run_bt_backtest()

    # Optional: Run momentum strategy
    # momentum_results = run_momentum_bt()
