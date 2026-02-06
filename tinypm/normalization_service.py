#!/usr/bin/env python3
"""
===============================================================================
NORMALIZATION SERVICE v1.0 - 100% Deterministic Data Normalization
===============================================================================

Part of Project "Sovereign Seed" Phase 1

CRITICAL: This service is 100% DETERMINISTIC. NO LLM involvement.
Uses regex, parsing libraries, and rule-based logic ONLY.

Purpose:
- Normalize "$1,200" and "1200" and "$1,200.00" to the same value
- Enable conflict detection (can't detect "$1200" vs "$1500" without this)
- Support legal accuracy for lease terms comparison
- Provide deterministic calculations for financial decisions

Normalization Types:
- Currency: "$1,200.00" -> Decimal("1200.00")
- Dates: "Feb 4, 2026" -> datetime(2026, 2, 4)
- Numbers: "twelve" -> 12
- Durations: "2 hours" -> 120 (minutes)
- Booleans: "yes", "confirmed" -> True

Usage:
    from normalization_service import get_normalization_service

    service = get_normalization_service()
    result = service.normalize("$1,200.00")
    print(result.normalized)  # Decimal("1200.00")

    # Check equivalence
    service.are_equivalent("$1,200", "$1,200.00", "currency")  # True

Author: PM_Architect Claude
Date: 2026-02-04
"""

from dataclasses import dataclass, field
from typing import Union, Optional, List, Dict, Any
from decimal import Decimal, InvalidOperation
from datetime import datetime, date, timedelta
from enum import Enum
import re
import logging
from pathlib import Path

# ===============================================================================
# LOGGING
# ===============================================================================

APP_DIR = Path(__file__).parent
NORMALIZATION_LOG = APP_DIR / ".normalization.log"

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


# ===============================================================================
# ENUMS
# ===============================================================================

class ValueType(Enum):
    """Supported normalization value types"""
    CURRENCY = "currency"
    DATE = "date"
    NUMBER = "number"
    DURATION = "duration"
    BOOLEAN = "boolean"
    UNKNOWN = "unknown"


# ===============================================================================
# DATA CLASSES
# ===============================================================================

@dataclass
class NormalizedValue:
    """
    Result of normalization with full provenance tracking.

    Attributes:
        original: The raw input text
        normalized: The normalized value (Decimal, datetime, int, float, bool)
        value_type: The detected/used type
        confidence: 0.0-1.0 how confident in the normalization
        method: Which normalizer/pattern was used
        pattern_matched: The regex pattern that matched (for debugging)
        warnings: Any warnings during normalization
    """
    original: str
    normalized: Union[Decimal, datetime, int, float, bool, None]
    value_type: str
    confidence: float
    method: str
    pattern_matched: Optional[str] = None
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict"""
        normalized_val = self.normalized
        if isinstance(normalized_val, Decimal):
            normalized_val = str(normalized_val)
        elif isinstance(normalized_val, datetime):
            normalized_val = normalized_val.isoformat()
        elif isinstance(normalized_val, date):
            normalized_val = normalized_val.isoformat()

        return {
            "original": self.original,
            "normalized": normalized_val,
            "value_type": self.value_type,
            "confidence": self.confidence,
            "method": self.method,
            "pattern_matched": self.pattern_matched,
            "warnings": self.warnings
        }


# ===============================================================================
# CURRENCY NORMALIZER
# ===============================================================================

class CurrencyNormalizer:
    """
    Normalizes currency values to Decimal with 2 decimal places.

    Handles:
    - Standard: $1,200.00, $1200, $1,200
    - Written: "1200 dollars", "1200 USD"
    - Shorthand: "$1.2k", "$1.5M", "1.2 thousand"
    - Written numbers: "twelve hundred dollars"
    """

    # Word to number mapping for written amounts
    WORD_NUMBERS = {
        'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
        'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
        'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
        'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
        'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
        'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
        'eighty': 80, 'ninety': 90
    }

    MULTIPLIERS = {
        'hundred': 100,
        'thousand': 1000,
        'k': 1000,
        'grand': 1000,
        'million': 1000000,
        'm': 1000000,
        'billion': 1000000000,
        'b': 1000000000
    }

    # Patterns ordered by specificity (most specific first)
    PATTERNS = [
        # $1,234.56 or $1234.56 (standard USD with cents)
        (r'^\$\s*([\d,]+(?:\.\d{1,2})?)$', 'usd_standard'),
        # 1,234.56 dollars or 1234 USD
        (r'^([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|USD|usd)$', 'usd_written'),
        # $1.5k, $2.3M (shorthand with multiplier)
        (r'^\$\s*([\d.]+)\s*(k|m|b|thousand|million|billion)$', 'usd_shorthand'),
        # 1.5k dollars, 2.3M USD
        (r'^([\d.]+)\s*(k|m|b|thousand|million|billion)\s*(?:dollars?|USD)?$', 'shorthand_written'),
        # Just a number that could be currency in context
        (r'^([\d,]+(?:\.\d{1,2})?)$', 'numeric_only'),
    ]

    def normalize(self, text: str) -> Optional[NormalizedValue]:
        """
        Normalize a currency string to Decimal.

        Examples:
            "$1,200" -> Decimal("1200.00")
            "$1,200.00" -> Decimal("1200.00")
            "1200 dollars" -> Decimal("1200.00")
            "$1.2k" -> Decimal("1200.00")
            "twelve hundred" -> Decimal("1200.00")

        Returns:
            NormalizedValue or None if cannot parse
        """
        if not text or not isinstance(text, str):
            return None

        text = text.strip()
        original = text
        text_lower = text.lower()

        # Try written numbers first (e.g., "twelve hundred dollars")
        written_result = self._parse_written_currency(text_lower)
        if written_result is not None:
            return NormalizedValue(
                original=original,
                normalized=Decimal(str(written_result)).quantize(Decimal('0.01')),
                value_type=ValueType.CURRENCY.value,
                confidence=0.85,
                method='written_number',
                pattern_matched='written_number_parser'
            )

        # Try regex patterns
        for pattern, method in self.PATTERNS:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                try:
                    value = self._extract_value(match, method)
                    if value is not None:
                        confidence = 0.95 if method.startswith('usd') else 0.80
                        return NormalizedValue(
                            original=original,
                            normalized=Decimal(str(value)).quantize(Decimal('0.01')),
                            value_type=ValueType.CURRENCY.value,
                            confidence=confidence,
                            method=method,
                            pattern_matched=pattern
                        )
                except (ValueError, InvalidOperation) as e:
                    logger.debug(f"Currency parse error for '{original}': {e}")
                    continue

        return None

    def _extract_value(self, match: re.Match, method: str) -> Optional[float]:
        """Extract numeric value from regex match"""
        groups = match.groups()

        if method in ('usd_standard', 'usd_written', 'numeric_only'):
            # Remove commas and parse
            num_str = groups[0].replace(',', '')
            return float(num_str)

        elif method in ('usd_shorthand', 'shorthand_written'):
            base = float(groups[0])
            multiplier_key = groups[1].lower()
            multiplier = self.MULTIPLIERS.get(multiplier_key, 1)
            return base * multiplier

        return None

    def _parse_written_currency(self, text: str) -> Optional[float]:
        """
        Parse written currency like "twelve hundred dollars" or "two thousand five hundred"
        """
        # Remove currency indicators
        text = re.sub(r'\s*(dollars?|usd|bucks?)\s*$', '', text, flags=re.IGNORECASE)
        text = text.strip()

        if not text:
            return None

        # Split into words
        words = text.split()

        # Check if any word is a number word
        has_number_word = any(w in self.WORD_NUMBERS or w in self.MULTIPLIERS for w in words)
        if not has_number_word:
            return None

        # Parse the number
        return self._words_to_number(words)

    def _words_to_number(self, words: List[str]) -> Optional[float]:
        """Convert word list to number"""
        if not words:
            return None

        total = 0
        current = 0

        for word in words:
            word = word.lower().strip()

            # Skip connectors
            if word in ('and', 'a', 'an'):
                continue

            # Check if it's a base number
            if word in self.WORD_NUMBERS:
                current += self.WORD_NUMBERS[word]
            # Check if it's a multiplier
            elif word in self.MULTIPLIERS:
                mult = self.MULTIPLIERS[word]
                if current == 0:
                    current = 1
                if mult >= 1000:
                    # For thousand, million, etc., add to total
                    total += current * mult
                    current = 0
                else:
                    # For hundred, multiply current
                    current *= mult
            else:
                # Unknown word - could be noise, continue
                continue

        return total + current if (total + current) > 0 else None


# ===============================================================================
# DATE NORMALIZER
# ===============================================================================

class DateNormalizer:
    """
    Normalizes date strings to datetime objects.

    Handles:
    - ISO: 2026-02-04
    - US slash: 02/04/2026, 2/4/26
    - US dash: 02-04-2026
    - Written: February 4, 2026 / February 4th, 2026
    - European: 4 February 2026
    - Compact: 20260204
    """

    MONTH_NAMES = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sept': 9, 'sep': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    }

    PATTERNS = [
        # ISO format: 2026-02-04
        (r'^(\d{4})-(\d{1,2})-(\d{1,2})$', 'iso', ('year', 'month', 'day')),
        # US slash: 02/04/2026 or 2/4/26
        (r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$', 'us_slash', ('month', 'day', 'year')),
        # US dash: 02-04-2026
        (r'^(\d{1,2})-(\d{1,2})-(\d{4})$', 'us_dash', ('month', 'day', 'year')),
        # Written month: February 4, 2026 or Feb 4th, 2026
        (r'^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$', 'written', ('month_name', 'day', 'year')),
        # European: 4 February 2026
        (r'^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$', 'european', ('day', 'month_name', 'year')),
        # Compact: 20260204
        (r'^(\d{4})(\d{2})(\d{2})$', 'compact', ('year', 'month', 'day')),
    ]

    def normalize(self, text: str) -> Optional[NormalizedValue]:
        """
        Normalize a date string to datetime.

        Examples:
            "2026-02-04" -> datetime(2026, 2, 4)
            "02/04/2026" -> datetime(2026, 2, 4)
            "February 4, 2026" -> datetime(2026, 2, 4)
            "4 February 2026" -> datetime(2026, 2, 4)

        Returns:
            NormalizedValue or None if cannot parse
        """
        if not text or not isinstance(text, str):
            return None

        text = text.strip()
        original = text

        for pattern, method, field_order in self.PATTERNS:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                try:
                    dt = self._extract_date(match, field_order)
                    if dt:
                        # Validate the date is reasonable (between 1900 and 2100)
                        if 1900 <= dt.year <= 2100:
                            confidence = 0.95 if method == 'iso' else 0.90
                            return NormalizedValue(
                                original=original,
                                normalized=dt,
                                value_type=ValueType.DATE.value,
                                confidence=confidence,
                                method=method,
                                pattern_matched=pattern
                            )
                except (ValueError, TypeError) as e:
                    logger.debug(f"Date parse error for '{original}': {e}")
                    continue

        return None

    def _extract_date(self, match: re.Match, field_order: tuple) -> Optional[datetime]:
        """Extract datetime from regex match"""
        groups = match.groups()
        values = dict(zip(field_order, groups))

        # Parse year
        year = int(values.get('year', 0))
        if year < 100:
            # Two-digit year: assume 20xx for 00-50, 19xx for 51-99
            year = 2000 + year if year <= 50 else 1900 + year

        # Parse month
        if 'month_name' in values:
            month_str = values['month_name'].lower()
            month = self.MONTH_NAMES.get(month_str)
            if month is None:
                return None
        else:
            month = int(values.get('month', 0))

        # Parse day
        day = int(values.get('day', 0))

        # Validate ranges
        if not (1 <= month <= 12):
            return None
        if not (1 <= day <= 31):
            return None

        return datetime(year, month, day)


# ===============================================================================
# NUMBER NORMALIZER
# ===============================================================================

class NumberNormalizer:
    """
    Normalizes numeric values (integers and floats).

    Handles:
    - Plain: 12, 12.5, 1,234
    - Written: "twelve", "twenty-three"
    - Ordinals: "1st", "2nd", "23rd"
    """

    WORD_NUMBERS = {
        'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
        'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
        'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
        'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
        'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
        'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
        'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000,
        'million': 1000000, 'billion': 1000000000
    }

    ORDINAL_SUFFIXES = ('st', 'nd', 'rd', 'th')

    PATTERNS = [
        # Integer with commas: 1,234
        (r'^-?([\d,]+)$', 'integer_comma'),
        # Float: 12.5, 12.50
        (r'^-?(\d+(?:\.\d+))$', 'float'),
        # Ordinal: 1st, 2nd, 23rd
        (r'^(\d+)(?:st|nd|rd|th)$', 'ordinal'),
        # Scientific: 1.5e10
        (r'^-?(\d+(?:\.\d+)?)[eE]([+-]?\d+)$', 'scientific'),
    ]

    def normalize(self, text: str) -> Optional[NormalizedValue]:
        """
        Normalize a number string to int or float.

        Examples:
            "12" -> 12
            "twelve" -> 12
            "12.5" -> 12.5
            "1,234" -> 1234
            "1st" -> 1

        Returns:
            NormalizedValue or None if cannot parse
        """
        if not text or not isinstance(text, str):
            return None

        text = text.strip()
        original = text
        text_lower = text.lower()

        # Try written numbers first
        written_result = self._parse_written_number(text_lower)
        if written_result is not None:
            return NormalizedValue(
                original=original,
                normalized=written_result,
                value_type=ValueType.NUMBER.value,
                confidence=0.90,
                method='written_number',
                pattern_matched='written_number_parser'
            )

        # Try regex patterns
        for pattern, method in self.PATTERNS:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                try:
                    value = self._extract_number(text, match, method)
                    if value is not None:
                        return NormalizedValue(
                            original=original,
                            normalized=value,
                            value_type=ValueType.NUMBER.value,
                            confidence=0.95,
                            method=method,
                            pattern_matched=pattern
                        )
                except (ValueError, TypeError) as e:
                    logger.debug(f"Number parse error for '{original}': {e}")
                    continue

        return None

    def _extract_number(self, text: str, match: re.Match, method: str) -> Optional[Union[int, float]]:
        """Extract numeric value from match"""
        is_negative = text.startswith('-')

        if method == 'integer_comma':
            num_str = match.group(1).replace(',', '')
            value = int(num_str)
            return -value if is_negative else value

        elif method == 'float':
            value = float(match.group(1))
            return -value if is_negative else value

        elif method == 'ordinal':
            return int(match.group(1))

        elif method == 'scientific':
            base = float(match.group(1))
            exp = int(match.group(2))
            value = base * (10 ** exp)
            return -value if is_negative else value

        return None

    def _parse_written_number(self, text: str) -> Optional[Union[int, float]]:
        """Parse written numbers like 'twelve' or 'twenty-three'"""
        text = text.strip()

        # Direct match
        if text in self.WORD_NUMBERS:
            return self.WORD_NUMBERS[text]

        # Handle hyphenated numbers (twenty-three)
        if '-' in text:
            parts = text.split('-')
            if len(parts) == 2 and all(p in self.WORD_NUMBERS for p in parts):
                return self.WORD_NUMBERS[parts[0]] + self.WORD_NUMBERS[parts[1]]

        # Handle multi-word (twenty three, one hundred)
        words = text.split()
        if not words:
            return None

        # Check if at least one word is a number
        if not any(w in self.WORD_NUMBERS for w in words):
            return None

        total = 0
        current = 0

        for word in words:
            word = word.lower().strip().rstrip(',')

            if word in ('and', 'a', 'an'):
                continue

            if word in self.WORD_NUMBERS:
                val = self.WORD_NUMBERS[word]
                if val >= 1000:
                    if current == 0:
                        current = 1
                    total += current * val
                    current = 0
                elif val == 100:
                    if current == 0:
                        current = 1
                    current *= val
                else:
                    current += val
            else:
                # Unknown word, stop parsing
                break

        return total + current if (total + current) > 0 else None


# ===============================================================================
# DURATION NORMALIZER
# ===============================================================================

class DurationNormalizer:
    """
    Normalizes time durations to minutes.

    Handles:
    - Hours: "2 hours", "2h", "2 hrs"
    - Minutes: "30 minutes", "30m", "30 mins"
    - Combined: "1h 30m", "1 hour 30 minutes"
    - Decimal: "1.5 hours"
    - Seconds: "90 seconds" (converted to minutes)
    - Days: "2 days" (converted to minutes)
    """

    UNIT_TO_MINUTES = {
        # Hours
        'hour': 60, 'hours': 60, 'hr': 60, 'hrs': 60, 'h': 60,
        # Minutes
        'minute': 1, 'minutes': 1, 'min': 1, 'mins': 1, 'm': 1,
        # Seconds (1/60 of a minute)
        'second': 1/60, 'seconds': 1/60, 'sec': 1/60, 'secs': 1/60, 's': 1/60,
        # Days
        'day': 1440, 'days': 1440, 'd': 1440,
        # Weeks
        'week': 10080, 'weeks': 10080, 'wk': 10080, 'wks': 10080, 'w': 10080,
    }

    PATTERNS = [
        # Combined format: 1h 30m, 1hr 30min
        (r'^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\s*(?:and\s*)?(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$', 'combined_hm'),
        # Single unit: 2 hours, 30 minutes, 1.5h
        (r'^(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|h|minute|minutes|min|mins|m|second|seconds|sec|secs|s|day|days|d|week|weeks|wk|wks|w)$', 'single_unit'),
        # Just a number (assume minutes in duration context)
        (r'^(\d+(?:\.\d+)?)$', 'numeric_only'),
    ]

    def normalize(self, text: str) -> Optional[NormalizedValue]:
        """
        Normalize a duration string to minutes.

        Examples:
            "2 hours" -> 120
            "30 minutes" -> 30
            "1.5 hours" -> 90
            "1h 30m" -> 90
            "90 mins" -> 90

        Returns:
            NormalizedValue or None if cannot parse
        """
        if not text or not isinstance(text, str):
            return None

        text = text.strip()
        original = text
        text_lower = text.lower()

        for pattern, method in self.PATTERNS:
            match = re.match(pattern, text_lower)
            if match:
                try:
                    minutes = self._extract_minutes(match, method)
                    if minutes is not None and minutes >= 0:
                        # Round to 2 decimal places
                        minutes = round(minutes, 2)
                        # Convert to int if whole number
                        if minutes == int(minutes):
                            minutes = int(minutes)

                        confidence = 0.95 if method != 'numeric_only' else 0.60
                        return NormalizedValue(
                            original=original,
                            normalized=minutes,
                            value_type=ValueType.DURATION.value,
                            confidence=confidence,
                            method=method,
                            pattern_matched=pattern
                        )
                except (ValueError, TypeError) as e:
                    logger.debug(f"Duration parse error for '{original}': {e}")
                    continue

        return None

    def _extract_minutes(self, match: re.Match, method: str) -> Optional[float]:
        """Extract minutes from match"""
        if method == 'combined_hm':
            hours = float(match.group(1))
            mins = float(match.group(3))
            return (hours * 60) + mins

        elif method == 'single_unit':
            value = float(match.group(1))
            unit = match.group(2).lower()
            multiplier = self.UNIT_TO_MINUTES.get(unit, 1)
            return value * multiplier

        elif method == 'numeric_only':
            # Assume minutes when no unit
            return float(match.group(1))

        return None


# ===============================================================================
# BOOLEAN NORMALIZER
# ===============================================================================

class BooleanNormalizer:
    """
    Normalizes boolean expressions to True/False.

    Handles:
    - Standard: "yes", "no", "true", "false"
    - Status: "confirmed", "denied", "approved", "rejected"
    - Completion: "done", "complete", "pending", "incomplete"
    - Payment: "paid", "unpaid", "received", "not received"
    """

    TRUE_PATTERNS = [
        'yes', 'y', 'true', 't', '1',
        'confirmed', 'approve', 'approved',
        'received', 'paid', 'complete', 'completed', 'done',
        'active', 'enabled', 'on', 'ok', 'okay',
        'accepted', 'success', 'successful',
        'valid', 'verified', 'correct', 'right'
    ]

    FALSE_PATTERNS = [
        'no', 'n', 'false', 'f', '0',
        'denied', 'deny', 'rejected', 'reject',
        'not received', 'unpaid', 'incomplete', 'pending',
        'inactive', 'disabled', 'off',
        'declined', 'failed', 'failure',
        'invalid', 'unverified', 'incorrect', 'wrong'
    ]

    def normalize(self, text: str) -> Optional[NormalizedValue]:
        """
        Normalize a boolean expression to True/False.

        Examples:
            "yes" -> True
            "no" -> False
            "confirmed" -> True
            "pending" -> False

        Returns:
            NormalizedValue or None if cannot determine
        """
        if not text or not isinstance(text, str):
            return None

        text = text.strip()
        original = text
        text_lower = text.lower()

        # Check true patterns
        if text_lower in self.TRUE_PATTERNS:
            return NormalizedValue(
                original=original,
                normalized=True,
                value_type=ValueType.BOOLEAN.value,
                confidence=0.95,
                method='true_pattern',
                pattern_matched=text_lower
            )

        # Check false patterns
        if text_lower in self.FALSE_PATTERNS:
            return NormalizedValue(
                original=original,
                normalized=False,
                value_type=ValueType.BOOLEAN.value,
                confidence=0.95,
                method='false_pattern',
                pattern_matched=text_lower
            )

        # Check for "not" prefix indicating negation
        if text_lower.startswith('not '):
            remainder = text_lower[4:].strip()
            if remainder in self.TRUE_PATTERNS:
                return NormalizedValue(
                    original=original,
                    normalized=False,
                    value_type=ValueType.BOOLEAN.value,
                    confidence=0.85,
                    method='negated_true',
                    pattern_matched=f'not {remainder}'
                )

        return None


# ===============================================================================
# MAIN NORMALIZATION SERVICE
# ===============================================================================

class NormalizationService:
    """
    Main service orchestrating all normalizers.

    Provides:
    - Single value normalization with optional type hint
    - Multi-interpretation normalization
    - Equivalence checking
    - Batch normalization
    """

    def __init__(self):
        self.currency = CurrencyNormalizer()
        self.date = DateNormalizer()
        self.number = NumberNormalizer()
        self.duration = DurationNormalizer()
        self.boolean = BooleanNormalizer()

        # Map hints to normalizers
        self._normalizers = {
            ValueType.CURRENCY.value: self.currency,
            ValueType.DATE.value: self.date,
            ValueType.NUMBER.value: self.number,
            ValueType.DURATION.value: self.duration,
            ValueType.BOOLEAN.value: self.boolean,
        }

        # Statistics
        self._stats = {
            'total_normalizations': 0,
            'successful': 0,
            'failed': 0,
            'by_type': {t.value: 0 for t in ValueType}
        }

    def normalize(self, text: str, hint: Optional[str] = None) -> Optional[NormalizedValue]:
        """
        Normalize text to structured value.

        Args:
            text: The raw text to normalize
            hint: Optional type hint ('currency', 'date', 'number', 'duration', 'boolean')

        Returns:
            NormalizedValue or None if can't normalize
        """
        self._stats['total_normalizations'] += 1

        if not text or not isinstance(text, str):
            self._stats['failed'] += 1
            return None

        # If hint provided, try that normalizer first
        if hint and hint in self._normalizers:
            result = self._normalizers[hint].normalize(text)
            if result:
                self._stats['successful'] += 1
                self._stats['by_type'][result.value_type] += 1
                return result

        # Try all normalizers in priority order
        priority_order = [
            self.currency,   # Most specific patterns
            self.date,       # Dates are fairly unambiguous
            self.duration,   # Duration patterns
            self.boolean,    # Boolean keywords
            self.number,     # Most generic, try last
        ]

        for normalizer in priority_order:
            result = normalizer.normalize(text)
            if result and result.confidence >= 0.80:
                self._stats['successful'] += 1
                self._stats['by_type'][result.value_type] += 1
                return result

        # No confident match - try again with lower threshold
        for normalizer in priority_order:
            result = normalizer.normalize(text)
            if result:
                self._stats['successful'] += 1
                self._stats['by_type'][result.value_type] += 1
                return result

        self._stats['failed'] += 1
        return None

    def normalize_all(self, text: str) -> List[NormalizedValue]:
        """
        Try all normalizers, return all possible interpretations.

        Useful when the type is ambiguous and multiple interpretations
        are needed for display or user selection.

        Args:
            text: The raw text to normalize

        Returns:
            List of all valid NormalizedValue interpretations
        """
        if not text or not isinstance(text, str):
            return []

        results = []
        for normalizer in [self.currency, self.date, self.number, self.duration, self.boolean]:
            result = normalizer.normalize(text)
            if result:
                results.append(result)

        # Sort by confidence descending
        results.sort(key=lambda x: x.confidence, reverse=True)
        return results

    def are_equivalent(self, text1: str, text2: str, value_type: str) -> bool:
        """
        Check if two text values normalize to the same value.

        Args:
            text1: First text value
            text2: Second text value
            value_type: The type to normalize as ('currency', 'date', 'number', 'duration', 'boolean')

        Returns:
            True if both normalize to the same value
        """
        if not text1 or not text2:
            return text1 == text2

        norm1 = self.normalize(text1, hint=value_type)
        norm2 = self.normalize(text2, hint=value_type)

        if norm1 is None or norm2 is None:
            return False

        # Compare normalized values
        if isinstance(norm1.normalized, Decimal) and isinstance(norm2.normalized, Decimal):
            return norm1.normalized == norm2.normalized
        elif isinstance(norm1.normalized, datetime) and isinstance(norm2.normalized, datetime):
            return norm1.normalized == norm2.normalized
        else:
            return norm1.normalized == norm2.normalized

    def normalize_batch(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normalize a batch of items.

        Args:
            items: List of dicts with 'text' and optional 'hint' keys

        Returns:
            List of dicts with normalization results
        """
        results = []
        for item in items:
            text = item.get('text', '')
            hint = item.get('hint')
            result = self.normalize(text, hint=hint)
            results.append({
                'input': item,
                'result': result.to_dict() if result else None,
                'success': result is not None
            })
        return results

    def get_stats(self) -> Dict[str, Any]:
        """Get normalization statistics"""
        return {
            **self._stats,
            'success_rate': (
                self._stats['successful'] / self._stats['total_normalizations']
                if self._stats['total_normalizations'] > 0 else 0
            )
        }

    def reset_stats(self):
        """Reset statistics"""
        self._stats = {
            'total_normalizations': 0,
            'successful': 0,
            'failed': 0,
            'by_type': {t.value: 0 for t in ValueType}
        }


# ===============================================================================
# SINGLETON ACCESS
# ===============================================================================

_service: Optional[NormalizationService] = None

def get_normalization_service() -> NormalizationService:
    """Get the singleton normalization service instance"""
    global _service
    if _service is None:
        _service = NormalizationService()
    return _service


# ===============================================================================
# CONVENIENCE FUNCTIONS
# ===============================================================================

def normalize(text: str, hint: Optional[str] = None) -> Optional[NormalizedValue]:
    """Convenience function for single normalization"""
    return get_normalization_service().normalize(text, hint)

def are_equivalent(text1: str, text2: str, value_type: str) -> bool:
    """Convenience function for equivalence checking"""
    return get_normalization_service().are_equivalent(text1, text2, value_type)

def normalize_currency(text: str) -> Optional[NormalizedValue]:
    """Convenience function for currency normalization"""
    return get_normalization_service().normalize(text, hint='currency')

def normalize_date(text: str) -> Optional[NormalizedValue]:
    """Convenience function for date normalization"""
    return get_normalization_service().normalize(text, hint='date')

def normalize_number(text: str) -> Optional[NormalizedValue]:
    """Convenience function for number normalization"""
    return get_normalization_service().normalize(text, hint='number')

def normalize_duration(text: str) -> Optional[NormalizedValue]:
    """Convenience function for duration normalization"""
    return get_normalization_service().normalize(text, hint='duration')

def normalize_boolean(text: str) -> Optional[NormalizedValue]:
    """Convenience function for boolean normalization"""
    return get_normalization_service().normalize(text, hint='boolean')


# ===============================================================================
# CLI TESTING
# ===============================================================================

if __name__ == "__main__":
    import sys

    print("=" * 70)
    print("NORMALIZATION SERVICE v1.0 - Test Suite")
    print("=" * 70)

    service = get_normalization_service()

    # Test cases
    test_cases = [
        # Currency tests
        ("$1,200", "currency", Decimal("1200.00")),
        ("$1,200.00", "currency", Decimal("1200.00")),
        ("1200 dollars", "currency", Decimal("1200.00")),
        ("$1.2k", "currency", Decimal("1200.00")),
        ("twelve hundred dollars", "currency", Decimal("1200.00")),
        ("$500", "currency", Decimal("500.00")),
        ("2.5M dollars", "currency", Decimal("2500000.00")),

        # Date tests
        ("2026-02-04", "date", datetime(2026, 2, 4)),
        ("02/04/2026", "date", datetime(2026, 2, 4)),
        ("February 4, 2026", "date", datetime(2026, 2, 4)),
        ("4 February 2026", "date", datetime(2026, 2, 4)),
        ("Feb 4th, 2026", "date", datetime(2026, 2, 4)),

        # Number tests
        ("12", "number", 12),
        ("twelve", "number", 12),
        ("12.5", "number", 12.5),
        ("1,234", "number", 1234),
        ("twenty-three", "number", 23),
        ("one hundred", "number", 100),

        # Duration tests
        ("2 hours", "duration", 120),
        ("30 minutes", "duration", 30),
        ("1.5 hours", "duration", 90),
        ("1h 30m", "duration", 90),
        ("90 mins", "duration", 90),
        ("1 hour 30 minutes", "duration", 90),

        # Boolean tests
        ("yes", "boolean", True),
        ("no", "boolean", False),
        ("confirmed", "boolean", True),
        ("pending", "boolean", False),
        ("paid", "boolean", True),
        ("unpaid", "boolean", False),
    ]

    passed = 0
    failed = 0

    print("\nRunning test cases...")
    print("-" * 70)

    for text, hint, expected in test_cases:
        result = service.normalize(text, hint=hint)

        if result is None:
            print(f"FAIL: '{text}' -> None (expected {expected})")
            failed += 1
            continue

        actual = result.normalized

        # Compare values
        if isinstance(expected, Decimal):
            success = isinstance(actual, Decimal) and actual == expected
        elif isinstance(expected, datetime):
            success = isinstance(actual, datetime) and actual == expected
        else:
            success = actual == expected

        if success:
            print(f"PASS: '{text}' -> {actual} ({result.method}, {result.confidence:.0%})")
            passed += 1
        else:
            print(f"FAIL: '{text}' -> {actual} (expected {expected})")
            failed += 1

    print("-" * 70)
    print(f"\nResults: {passed} passed, {failed} failed")

    # Test equivalence
    print("\n" + "=" * 70)
    print("Equivalence Tests")
    print("-" * 70)

    equiv_tests = [
        ("$1,200", "$1,200.00", "currency", True),
        ("$1,200", "1200 dollars", "currency", True),
        ("2026-02-04", "February 4, 2026", "date", True),
        ("2026-02-04", "02/04/2026", "date", True),
        ("twelve", "12", "number", True),
        ("2 hours", "120 minutes", "duration", True),
        ("yes", "confirmed", "boolean", True),
    ]

    for text1, text2, vtype, expected in equiv_tests:
        result = service.are_equivalent(text1, text2, vtype)
        status = "PASS" if result == expected else "FAIL"
        print(f"{status}: '{text1}' == '{text2}' ({vtype}) -> {result}")

    print("\n" + "=" * 70)
    print("Statistics:")
    print(service.get_stats())
    print("=" * 70)

    sys.exit(0 if failed == 0 else 1)
