"""
Tiny Seed 75/25 Safe/Growth Allocation Backtest
Tests the core Tiny Seed investment algorithm:
- 75% in "Safe" assets (bonds, stable value)
- 25% in "Growth" assets (stocks, equity)
- Quarterly rebalancing
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
    print("\n\nGenerating visualization for 75/25 strategy...")
    main_backtest = TinySeedBacktest(
        safe_weight=0.75,
        growth_weight=0.25,
        start_date='2010-01-01',
        end_date='2025-01-01'
    )
    main_backtest.run_backtest(initial_capital=10000)
    main_backtest.plot_results()
