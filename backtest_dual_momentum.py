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
            if pd.isna(row['us_momentum']) or pd.isna(row['intl_momentum']) or pd.isna(row['cash_momentum']):
                return 'BOND'  # Default to safe asset if no data

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

        # Fill any remaining NaN with default position
        signals['active_position'] = signals['active_position'].fillna('BOND')

        self.signals = signals
        return signals

    def run_backtest(self, initial_capital: float = 10000) -> pd.DataFrame:
        """Execute backtest and calculate portfolio value"""
        if self.signals is None:
            self.generate_signals()

        # Calculate daily returns for each asset
        returns = self.data.pct_change().dropna()

        # Filter to backtest period
        returns = returns[returns.index >= self.start_date]

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
        def get_daily_return(row):
            ticker = position_map.get(row['position'], self.bond_ticker)
            if row.name in returns.index and ticker in returns.columns:
                return returns.loc[row.name, ticker]
            return 0

        portfolio['daily_return'] = portfolio.apply(get_daily_return, axis=1)

        # Calculate cumulative portfolio value
        portfolio['cumulative_return'] = (1 + portfolio['daily_return']).cumprod()
        portfolio['portfolio_value'] = initial_capital * portfolio['cumulative_return']

        # Also track buy-and-hold SPY for comparison
        spy_returns = returns[self.us_ticker]
        portfolio['spy_cumulative'] = (1 + spy_returns).cumprod()
        portfolio['spy_value'] = initial_capital * portfolio['spy_cumulative']

        self.portfolio = portfolio
        return portfolio

    def calculate_metrics(self) -> dict:
        """Calculate performance metrics"""
        if self.portfolio is None:
            self.run_backtest()

        results = {}

        for name, col in [('Dual Momentum', 'daily_return'),
                          ('SPY Buy & Hold', None)]:

            if col:
                returns = self.portfolio[col].dropna()
            else:
                # Calculate SPY returns
                returns = self.portfolio['spy_value'].pct_change().dropna()

            # Metrics
            total_return = (1 + returns).prod() - 1
            n_years = len(returns) / 252
            cagr = (1 + total_return) ** (1/n_years) - 1 if n_years > 0 else 0
            volatility = returns.std() * np.sqrt(252)
            sharpe = (cagr - 0.05) / volatility if volatility > 0 else 0

            # Maximum drawdown
            cumulative = (1 + returns).cumprod()
            running_max = cumulative.cummax()
            drawdown = (cumulative - running_max) / running_max
            max_dd = drawdown.min()

            # Sortino
            downside = returns[returns < 0]
            downside_vol = downside.std() * np.sqrt(252) if len(downside) > 0 else 0.001
            sortino = (cagr - 0.05) / downside_vol

            # Calmar
            calmar = cagr / abs(max_dd) if max_dd != 0 else 0

            results[name] = {
                'CAGR': f"{cagr:.2%}",
                'Total Return': f"{total_return:.2%}",
                'Volatility': f"{volatility:.2%}",
                'Sharpe Ratio': f"{sharpe:.2f}",
                'Sortino Ratio': f"{sortino:.2f}",
                'Max Drawdown': f"{max_dd:.2%}",
                'Calmar Ratio': f"{calmar:.2f}"
            }

        return results

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
            if mask.sum() > 0:
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

    def print_report(self):
        """Print comprehensive backtest report"""
        metrics = self.calculate_metrics()

        print("\n" + "="*60)
        print("DUAL MOMENTUM BACKTEST RESULTS")
        print("="*60)

        final_dm = self.portfolio['portfolio_value'].iloc[-1]
        final_spy = self.portfolio['spy_value'].iloc[-1]

        print(f"\nInitial Capital: $10,000")
        print(f"Final Value (Dual Momentum): ${final_dm:,.2f}")
        print(f"Final Value (SPY Buy & Hold): ${final_spy:,.2f}")
        print(f"\nOutperformance: ${final_dm - final_spy:,.2f}")

        # Metrics comparison
        print("\n" + "-"*60)
        print(f"{'Metric':<20}{'Dual Momentum':>20}{'SPY Buy & Hold':>20}")
        print("-"*60)

        for metric in metrics['Dual Momentum'].keys():
            print(f"{metric:<20}{metrics['Dual Momentum'][metric]:>20}{metrics['SPY Buy & Hold'][metric]:>20}")

        # Show position breakdown
        print("\n" + "-"*40)
        print("POSITION ALLOCATION")
        print("-"*40)
        pos_counts = self.portfolio['position'].value_counts(normalize=True)
        for pos, pct in pos_counts.items():
            print(f"{pos}: {pct:.1%}")


# Run the backtest
if __name__ == "__main__":
    # Initialize backtest
    backtest = DualMomentumBacktest(
        start_date='2010-01-01',
        end_date='2025-01-01'
    )

    # Run backtest
    portfolio = backtest.run_backtest(initial_capital=10000)

    # Print report
    backtest.print_report()

    # Plot results
    backtest.plot_results()
