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
