"""
QUICK VALIDATION SCRIPT
Run this to quickly validate Tiny Seed investment allocations
No external dependencies beyond yfinance, pandas, numpy
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

    print("Downloading data...")
    data = yf.download(['VTI', 'AGG'], start=start_date, end=end_date,
                      auto_adjust=True, progress=False)['Close']

    if data.empty:
        print("ERROR: Could not download data")
        return None

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
        cagr = (1 + total_ret) ** (1/n_years) - 1 if n_years > 0 else 0
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
    print("\n" + df.to_string(index=False))

    return df


def compare_allocations():
    """Compare multiple allocation strategies"""
    print("\n" + "="*70)
    print("ALLOCATION COMPARISON - 10 YEAR BACKTEST")
    print("="*70)

    allocations = [
        (90, 10),   # Ultra conservative
        (75, 25),   # Conservative (Tiny Seed default)
        (60, 40),   # Traditional balanced
        (50, 50),   # Even split
        (40, 60),   # Growth tilted
        (25, 75),   # Aggressive
    ]

    all_results = []

    for safe, growth in allocations:
        # Download data once
        end_date = datetime.now()
        start_date = datetime(end_date.year - 10, end_date.month, end_date.day)

        data = yf.download(['VTI', 'AGG'], start=start_date, end=end_date,
                          auto_adjust=True, progress=False)['Close']

        returns = data.pct_change().dropna()

        # Portfolio return
        portfolio_returns = (growth/100 * returns['VTI'] +
                            safe/100 * returns['AGG'])

        # Calculate stats
        total_ret = (1 + portfolio_returns).prod() - 1
        n_years = len(portfolio_returns) / 252
        cagr = (1 + total_ret) ** (1/n_years) - 1 if n_years > 0 else 0
        vol = portfolio_returns.std() * np.sqrt(252)
        sharpe = (cagr - 0.05) / vol if vol > 0 else 0

        cum = (1 + portfolio_returns).cumprod()
        dd = (cum - cum.cummax()) / cum.cummax()
        max_dd = dd.min()

        all_results.append({
            'Allocation': f'{safe}/{growth}',
            'Safe %': safe,
            'Growth %': growth,
            'CAGR': cagr,
            'Volatility': vol,
            'Sharpe': sharpe,
            'Max DD': max_dd
        })

    df = pd.DataFrame(all_results)

    # Print formatted
    print("\n" + "-"*70)
    print(f"{'Allocation':<12}{'CAGR':>10}{'Volatility':>12}{'Sharpe':>10}{'Max DD':>12}")
    print("-"*70)

    for _, row in df.iterrows():
        print(f"{row['Allocation']:<12}{row['CAGR']:>10.2%}{row['Volatility']:>12.2%}{row['Sharpe']:>10.2f}{row['Max DD']:>12.2%}")

    print("-"*70)

    # Find optimal
    best_sharpe_idx = df['Sharpe'].idxmax()
    best_allocation = df.loc[best_sharpe_idx]

    print(f"\nBEST RISK-ADJUSTED (Highest Sharpe): {best_allocation['Allocation']}")
    print(f"  - Sharpe Ratio: {best_allocation['Sharpe']:.2f}")
    print(f"  - CAGR: {best_allocation['CAGR']:.2%}")
    print(f"  - Max Drawdown: {best_allocation['Max DD']:.2%}")

    return df


def stress_test_periods():
    """Test strategy across different market periods"""
    print("\n" + "="*70)
    print("STRESS TEST: 75/25 ACROSS DIFFERENT MARKET PERIODS")
    print("="*70)

    periods = [
        ('2008-01-01', '2009-12-31', 'Financial Crisis'),
        ('2010-01-01', '2019-12-31', 'Bull Market'),
        ('2020-01-01', '2020-12-31', 'COVID Crash & Recovery'),
        ('2022-01-01', '2022-12-31', 'Rate Hike Year'),
        ('2015-01-01', '2025-01-01', 'Full Decade'),
    ]

    results = []

    for start, end, name in periods:
        data = yf.download(['VTI', 'AGG'], start=start, end=end,
                          auto_adjust=True, progress=False)['Close']

        if data.empty or len(data) < 10:
            continue

        returns = data.pct_change().dropna()

        # 75/25 portfolio
        portfolio_75_25 = 0.25 * returns['VTI'] + 0.75 * returns['AGG']

        # 100% stocks
        stocks_100 = returns['VTI']

        # Calculate stats for both
        def get_stats(r):
            total_ret = (1 + r).prod() - 1
            n_years = len(r) / 252
            if n_years <= 0:
                return 0, 0, 0

            cagr = (1 + total_ret) ** (1/n_years) - 1

            cum = (1 + r).cumprod()
            dd = (cum - cum.cummax()) / cum.cummax()
            max_dd = dd.min()

            return cagr, max_dd, total_ret

        cagr_75, dd_75, total_75 = get_stats(portfolio_75_25)
        cagr_100, dd_100, total_100 = get_stats(stocks_100)

        results.append({
            'Period': name,
            '75/25 Return': total_75,
            '75/25 Max DD': dd_75,
            'Stocks Return': total_100,
            'Stocks Max DD': dd_100,
            'DD Reduction': (abs(dd_100) - abs(dd_75)) / abs(dd_100) if dd_100 != 0 else 0
        })

    # Print results
    print("\n" + "-"*90)
    print(f"{'Period':<25}{'75/25 Return':>12}{'75/25 DD':>12}{'Stocks Ret':>12}{'Stocks DD':>12}{'DD Saved':>12}")
    print("-"*90)

    for r in results:
        print(f"{r['Period']:<25}{r['75/25 Return']:>12.1%}{r['75/25 Max DD']:>12.1%}"
              f"{r['Stocks Return']:>12.1%}{r['Stocks Max DD']:>12.1%}{r['DD Reduction']:>12.1%}")

    print("-"*90)

    return results


if __name__ == "__main__":
    print("="*70)
    print("TINY SEED INVESTMENT STRATEGY VALIDATOR")
    print("="*70)

    # Basic validation
    quick_validate(75, 25, 10)
    quick_validate(75, 25, 15)

    # Compare all allocations
    compare_allocations()

    # Stress test
    stress_test_periods()
