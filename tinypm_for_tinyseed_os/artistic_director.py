#!/usr/bin/env python3
"""
===============================================================================
ARTISTIC DIRECTOR v2.0 - Visual Design AI with Collaborative Browsing
===============================================================================

The Artistic Director is a creative AI with FULL DESIGN POWERS and VISION.
It can SEE screenshots, browse the web WITH you, extract design elements,
and generate complete design systems.

**NEW IN v2.0:**
- VISION CAPABILITIES: Analyze screenshots using Claude's vision API
- COLLABORATIVE BROWSING: Visible browser you can watch AI navigate
- MOOD BOARD GENERATOR: Build visual collections during browsing sessions
- REAL-TIME STYLE EXTRACTION: Extract CSS, colors, fonts from any webpage
- ADVANCED DESIGN TOOLS: Figma, Google Fonts, Coolors, Unsplash integration

Theme: Wizard / Mad Scientist Laboratory
Style: Magical, mysterious, powerful - with glowing effects and arcane symbols

Usage:
    python3 artistic_director.py browse-with-me        # Interactive visual browsing
    python3 artistic_director.py browse <url>          # Headless design research
    python3 artistic_director.py analyze <image>       # Analyze design image with AI
    python3 artistic_director.py extract <url>         # Extract styles from URL
    python3 artistic_director.py mood-board            # View/manage mood board
    python3 artistic_director.py design-system         # Generate design system
    python3 artistic_director.py generate-theme        # Create new theme
    python3 artistic_director.py design-character "Name"  # Generate character
    python3 artistic_director.py apply-style <component>  # Apply style
    python3 artistic_director.py chat                  # Interactive design session
    python3 artistic_director.py status                # Show design system status
    python3 artistic_director.py serve                 # Start API server

API Endpoints (when integrated with web_server.py):
    POST /api/design/theme      - Generate theme
    POST /api/design/character  - Generate character
    POST /api/design/chat       - Design conversation
    POST /api/design/palette    - Extract color palette
    POST /api/design/vision     - Analyze image with vision
    POST /api/design/mood-board - Mood board operations
    GET  /api/design/assets     - List all assets

Requirements:
    pip install playwright pillow colorthief openai anthropic cssutils
    playwright install chromium

===============================================================================
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import colorsys
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

# Optional imports with graceful degradation
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    from colorthief import ColorThief
    HAS_COLORTHIEF = True
except ImportError:
    HAS_COLORTHIEF = False

try:
    from playwright.async_api import async_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

try:
    import cssutils
    HAS_CSSUTILS = True
except ImportError:
    HAS_CSSUTILS = False

try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
DESIGN_ASSETS_DIR = APP_DIR / "design_assets"
THEMES_DIR = DESIGN_ASSETS_DIR / "themes"
CHARACTERS_DIR = DESIGN_ASSETS_DIR / "characters"
ICONS_DIR = DESIGN_ASSETS_DIR / "icons"
PALETTES_DIR = DESIGN_ASSETS_DIR / "palettes"
SCREENSHOTS_DIR = DESIGN_ASSETS_DIR / "screenshots"
INSPIRATION_DIR = DESIGN_ASSETS_DIR / "inspiration"
ANIMATIONS_DIR = DESIGN_ASSETS_DIR / "animations"
COMPONENTS_DIR = DESIGN_ASSETS_DIR / "components"
MOOD_BOARD_DIR = DESIGN_ASSETS_DIR / "mood_boards"
DESIGN_SYSTEM_DIR = DESIGN_ASSETS_DIR / "design_systems"

# Ensure directories exist
for d in [DESIGN_ASSETS_DIR, THEMES_DIR, CHARACTERS_DIR, ICONS_DIR,
          PALETTES_DIR, SCREENSHOTS_DIR, INSPIRATION_DIR, ANIMATIONS_DIR,
          COMPONENTS_DIR, MOOD_BOARD_DIR, DESIGN_SYSTEM_DIR]:
    d.mkdir(exist_ok=True)

# State files
DESIGN_STATE_FILE = APP_DIR / ".artistic_director_state.json"
DESIGN_LOG_FILE = APP_DIR / ".artistic_director.log"
STYLE_GUIDE_FILE = DESIGN_ASSETS_DIR / "style_guide.json"
BROWSING_SESSION_FILE = APP_DIR / ".browsing_session.json"
CURRENT_MOOD_BOARD_FILE = MOOD_BOARD_DIR / "current_board.json"

# Load environment
_env_file = APP_DIR / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())


# ===============================================================================
# LOGGING
# ===============================================================================

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {msg}"
    print(line)
    try:
        with open(DESIGN_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ===============================================================================
# TINYPM DESIGN SYSTEM - WIZARD/MAD SCIENTIST THEME
# ===============================================================================

class TinyPMDesignSystem:
    """
    The canonical design system for TinyPM.
    Wizard/Mad Scientist laboratory aesthetic with magical elements.
    """

    # Core color palette - arcane and mysterious
    COLORS = {
        # Primary - Deep purples and cosmic blues
        "primary": "#6B21A8",        # Royal purple
        "primary_light": "#A855F7",   # Bright purple
        "primary_dark": "#4C1D95",    # Deep purple

        # Secondary - Mystical teals and emeralds
        "secondary": "#059669",       # Emerald
        "secondary_light": "#34D399", # Bright emerald
        "secondary_dark": "#047857",  # Dark emerald

        # Accents - Magical glows
        "accent_gold": "#F59E0B",     # Alchemical gold
        "accent_amber": "#FBBF24",    # Glowing amber
        "accent_cyan": "#06B6D4",     # Electric cyan
        "accent_pink": "#EC4899",     # Magical pink

        # Backgrounds - Laboratory darkness
        "bg_dark": "#0F0F1A",         # Deep night
        "bg_medium": "#1A1A2E",       # Dark purple-gray
        "bg_light": "#252540",        # Lighter purple-gray
        "bg_card": "#1E1E32",         # Card background

        # Text
        "text_primary": "#F8FAFC",    # Bright white
        "text_secondary": "#94A3B8",  # Muted gray
        "text_muted": "#64748B",      # Subtle gray

        # Status colors
        "success": "#22C55E",         # Potion green
        "warning": "#EAB308",         # Caution yellow
        "error": "#EF4444",           # Danger red
        "info": "#3B82F6",            # Info blue

        # Special effects
        "glow_purple": "rgba(168, 85, 247, 0.5)",
        "glow_gold": "rgba(251, 191, 36, 0.5)",
        "glow_cyan": "rgba(6, 182, 212, 0.5)",
    }

    # Typography system
    TYPOGRAPHY = {
        "font_display": "'Cinzel Decorative', 'Georgia', serif",  # For titles
        "font_heading": "'Cinzel', 'Georgia', serif",              # For headings
        "font_body": "'Inter', 'Segoe UI', system-ui, sans-serif", # For body
        "font_mono": "'JetBrains Mono', 'Fira Code', monospace",   # For code

        "size_xs": "0.75rem",    # 12px
        "size_sm": "0.875rem",   # 14px
        "size_base": "1rem",     # 16px
        "size_lg": "1.125rem",   # 18px
        "size_xl": "1.25rem",    # 20px
        "size_2xl": "1.5rem",    # 24px
        "size_3xl": "1.875rem",  # 30px
        "size_4xl": "2.25rem",   # 36px
        "size_5xl": "3rem",      # 48px

        "weight_normal": "400",
        "weight_medium": "500",
        "weight_semibold": "600",
        "weight_bold": "700",
    }

    # Spacing system
    SPACING = {
        "0": "0",
        "1": "0.25rem",   # 4px
        "2": "0.5rem",    # 8px
        "3": "0.75rem",   # 12px
        "4": "1rem",      # 16px
        "5": "1.25rem",   # 20px
        "6": "1.5rem",    # 24px
        "8": "2rem",      # 32px
        "10": "2.5rem",   # 40px
        "12": "3rem",     # 48px
        "16": "4rem",     # 64px
    }

    # Border radius
    RADIUS = {
        "none": "0",
        "sm": "0.25rem",
        "md": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.5rem",
        "full": "9999px",
    }

    # Shadows - magical glows
    SHADOWS = {
        "sm": "0 1px 2px rgba(0, 0, 0, 0.5)",
        "md": "0 4px 6px rgba(0, 0, 0, 0.5)",
        "lg": "0 10px 15px rgba(0, 0, 0, 0.5)",
        "xl": "0 20px 25px rgba(0, 0, 0, 0.5)",
        "glow_purple": "0 0 20px rgba(168, 85, 247, 0.4)",
        "glow_gold": "0 0 20px rgba(251, 191, 36, 0.4)",
        "glow_cyan": "0 0 20px rgba(6, 182, 212, 0.4)",
        "glow_emerald": "0 0 20px rgba(52, 211, 153, 0.4)",
        "inner_glow": "inset 0 0 20px rgba(168, 85, 247, 0.2)",
    }

    # Animations
    ANIMATIONS = {
        "pulse_glow": {
            "keyframes": """
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
                    50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.8); }
                }
            """,
            "css": "animation: pulse-glow 2s ease-in-out infinite;",
        },
        "float": {
            "keyframes": """
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            """,
            "css": "animation: float 3s ease-in-out infinite;",
        },
        "shimmer": {
            "keyframes": """
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            """,
            "css": "animation: shimmer 2s linear infinite;",
        },
        "sparkle": {
            "keyframes": """
                @keyframes sparkle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
            """,
            "css": "animation: sparkle 1.5s ease-in-out infinite;",
        },
        "rotate_slow": {
            "keyframes": """
                @keyframes rotate-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            """,
            "css": "animation: rotate-slow 20s linear infinite;",
        },
    }

    # Character archetypes
    CHARACTERS = {
        "pm_wizard": {
            "name": "The Grand Orchestrator",
            "title": "Master of All Tasks",
            "colors": ["#6B21A8", "#A855F7", "#F59E0B"],
            "symbol": "staff_crystal",
            "aura": "purple_gold",
            "description": "Ancient wizard who sees all projects and guides their completion",
        },
        "builder_golem": {
            "name": "The Code Golem",
            "title": "Architect of Logic",
            "colors": ["#059669", "#34D399", "#06B6D4"],
            "symbol": "hammer_lightning",
            "aura": "emerald_cyan",
            "description": "Tireless construct that builds and builds without rest",
        },
        "research_owl": {
            "name": "The Knowledge Seeker",
            "title": "Watcher of Wisdom",
            "colors": ["#3B82F6", "#60A5FA", "#A855F7"],
            "symbol": "eye_book",
            "aura": "blue_purple",
            "description": "Wise owl who scours the realms for hidden knowledge",
        },
        "time_wizard": {
            "name": "The Chronos Keeper",
            "title": "Master of Schedules",
            "colors": ["#F59E0B", "#FBBF24", "#F97316"],
            "symbol": "hourglass_sun",
            "aura": "gold_amber",
            "description": "Time wizard who ensures all deadlines are met",
        },
        "critic_specter": {
            "name": "The Quality Specter",
            "title": "Guardian of Standards",
            "colors": ["#EC4899", "#F472B6", "#EF4444"],
            "symbol": "magnifying_flame",
            "aura": "pink_red",
            "description": "Spectral critic who finds every flaw and imperfection",
        },
        "data_alchemist": {
            "name": "The Data Alchemist",
            "title": "Transmuter of Information",
            "colors": ["#06B6D4", "#22D3EE", "#10B981"],
            "symbol": "flask_data",
            "aura": "cyan_emerald",
            "description": "Alchemist who transforms raw data into golden insights",
        },
    }


# ===============================================================================
# COLOR UTILITIES
# ===============================================================================

class ColorUtils:
    """Utilities for color manipulation and palette generation."""

    @staticmethod
    def hex_to_rgb(hex_color: str) -> tuple:
        """Convert hex color to RGB tuple."""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    @staticmethod
    def rgb_to_hex(rgb: tuple) -> str:
        """Convert RGB tuple to hex color."""
        return '#{:02x}{:02x}{:02x}'.format(*rgb)

    @staticmethod
    def rgb_to_hsl(rgb: tuple) -> tuple:
        """Convert RGB to HSL."""
        r, g, b = [x / 255.0 for x in rgb]
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        return (h * 360, s * 100, l * 100)

    @staticmethod
    def hsl_to_rgb(hsl: tuple) -> tuple:
        """Convert HSL to RGB."""
        h, s, l = hsl[0] / 360, hsl[1] / 100, hsl[2] / 100
        r, g, b = colorsys.hls_to_rgb(h, l, s)
        return (int(r * 255), int(g * 255), int(b * 255))

    @staticmethod
    def lighten(hex_color: str, amount: float = 0.2) -> str:
        """Lighten a color by a percentage."""
        rgb = ColorUtils.hex_to_rgb(hex_color)
        hsl = ColorUtils.rgb_to_hsl(rgb)
        new_l = min(100, hsl[2] + (100 - hsl[2]) * amount)
        new_rgb = ColorUtils.hsl_to_rgb((hsl[0], hsl[1], new_l))
        return ColorUtils.rgb_to_hex(new_rgb)

    @staticmethod
    def darken(hex_color: str, amount: float = 0.2) -> str:
        """Darken a color by a percentage."""
        rgb = ColorUtils.hex_to_rgb(hex_color)
        hsl = ColorUtils.rgb_to_hsl(rgb)
        new_l = max(0, hsl[2] * (1 - amount))
        new_rgb = ColorUtils.hsl_to_rgb((hsl[0], hsl[1], new_l))
        return ColorUtils.rgb_to_hex(new_rgb)

    @staticmethod
    def get_contrast_color(hex_color: str) -> str:
        """Get a contrasting text color (black or white)."""
        rgb = ColorUtils.hex_to_rgb(hex_color)
        luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
        return "#FFFFFF" if luminance < 0.5 else "#000000"

    @staticmethod
    def generate_gradient(color1: str, color2: str, steps: int = 5) -> list:
        """Generate a gradient between two colors."""
        rgb1 = ColorUtils.hex_to_rgb(color1)
        rgb2 = ColorUtils.hex_to_rgb(color2)

        gradient = []
        for i in range(steps):
            ratio = i / (steps - 1)
            r = int(rgb1[0] + (rgb2[0] - rgb1[0]) * ratio)
            g = int(rgb1[1] + (rgb2[1] - rgb1[1]) * ratio)
            b = int(rgb1[2] + (rgb2[2] - rgb1[2]) * ratio)
            gradient.append(ColorUtils.rgb_to_hex((r, g, b)))

        return gradient

    @staticmethod
    def generate_complementary(hex_color: str) -> str:
        """Generate complementary color."""
        rgb = ColorUtils.hex_to_rgb(hex_color)
        hsl = ColorUtils.rgb_to_hsl(rgb)
        new_h = (hsl[0] + 180) % 360
        new_rgb = ColorUtils.hsl_to_rgb((new_h, hsl[1], hsl[2]))
        return ColorUtils.rgb_to_hex(new_rgb)

    @staticmethod
    def generate_triadic(hex_color: str) -> list:
        """Generate triadic color scheme."""
        rgb = ColorUtils.hex_to_rgb(hex_color)
        hsl = ColorUtils.rgb_to_hsl(rgb)
        colors = []
        for offset in [0, 120, 240]:
            new_h = (hsl[0] + offset) % 360
            new_rgb = ColorUtils.hsl_to_rgb((new_h, hsl[1], hsl[2]))
            colors.append(ColorUtils.rgb_to_hex(new_rgb))
        return colors

    @staticmethod
    def generate_analogous(hex_color: str, spread: int = 30) -> list:
        """Generate analogous color scheme."""
        rgb = ColorUtils.hex_to_rgb(hex_color)
        hsl = ColorUtils.rgb_to_hsl(rgb)
        colors = []
        for offset in [-spread, 0, spread]:
            new_h = (hsl[0] + offset) % 360
            new_rgb = ColorUtils.hsl_to_rgb((new_h, hsl[1], hsl[2]))
            colors.append(ColorUtils.rgb_to_hex(new_rgb))
        return colors


# ===============================================================================
# PALETTE EXTRACTOR
# ===============================================================================

class PaletteExtractor:
    """Extract color palettes from images."""

    @staticmethod
    def from_image(image_path: str, color_count: int = 6) -> dict:
        """Extract dominant colors from an image."""
        if not HAS_COLORTHIEF:
            return {"error": "colorthief not installed"}

        try:
            color_thief = ColorThief(image_path)

            # Get dominant color
            dominant = color_thief.get_color(quality=1)

            # Get palette
            palette = color_thief.get_palette(color_count=color_count, quality=1)

            # Convert to hex
            result = {
                "dominant": ColorUtils.rgb_to_hex(dominant),
                "palette": [ColorUtils.rgb_to_hex(c) for c in palette],
                "source": image_path,
                "extracted_at": datetime.now().isoformat(),
            }

            # Generate complementary schemes
            result["complementary"] = ColorUtils.generate_complementary(result["dominant"])
            result["triadic"] = ColorUtils.generate_triadic(result["dominant"])
            result["analogous"] = ColorUtils.generate_analogous(result["dominant"])

            return result

        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def from_url(url: str, color_count: int = 6) -> dict:
        """Extract colors from an image URL."""
        if not HAS_PIL:
            return {"error": "PIL not installed"}

        try:
            import urllib.request
            from io import BytesIO

            # Download image
            with urllib.request.urlopen(url) as response:
                image_data = response.read()

            # Save temporarily
            temp_path = SCREENSHOTS_DIR / f"temp_{hashlib.md5(url.encode()).hexdigest()[:8]}.png"
            with open(temp_path, "wb") as f:
                f.write(image_data)

            result = PaletteExtractor.from_image(str(temp_path), color_count)
            result["source_url"] = url

            return result

        except Exception as e:
            return {"error": str(e)}


# ===============================================================================
# BROWSER AUTOMATION FOR DESIGN RESEARCH
# ===============================================================================

class DesignResearcher:
    """Browser automation for design research and inspiration gathering."""

    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None

    async def start(self):
        """Start the browser."""
        if not HAS_PLAYWRIGHT:
            raise RuntimeError("Playwright not installed. Run: pip install playwright && playwright install")

        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        self.page = await self.context.new_page()

    async def stop(self):
        """Stop the browser."""
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()

    async def capture_screenshot(self, url: str, filename: str = None) -> dict:
        """Capture a screenshot of a webpage."""
        if not self.page:
            await self.start()

        try:
            await self.page.goto(url, wait_until="networkidle", timeout=30000)

            if not filename:
                parsed = urlparse(url)
                safe_name = re.sub(r'[^a-zA-Z0-9]', '_', parsed.netloc + parsed.path)[:50]
                filename = f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"

            filepath = SCREENSHOTS_DIR / filename
            await self.page.screenshot(path=str(filepath), full_page=True)

            log(f"Screenshot saved: {filepath}")

            return {
                "success": True,
                "filepath": str(filepath),
                "url": url,
                "captured_at": datetime.now().isoformat(),
            }

        except Exception as e:
            log(f"Screenshot error: {e}", "ERROR")
            return {"error": str(e)}

    async def analyze_design(self, url: str) -> dict:
        """Analyze the design elements of a webpage."""
        if not self.page:
            await self.start()

        try:
            await self.page.goto(url, wait_until="networkidle", timeout=30000)

            # Extract design elements via JavaScript
            analysis = await self.page.evaluate("""() => {
                const styles = {
                    colors: new Set(),
                    fonts: new Set(),
                    fontSizes: new Set(),
                    borderRadii: new Set(),
                    shadows: new Set(),
                };

                // Analyze all elements
                document.querySelectorAll('*').forEach(el => {
                    const computed = window.getComputedStyle(el);

                    // Colors
                    ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
                        const val = computed[prop];
                        if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
                            styles.colors.add(val);
                        }
                    });

                    // Fonts
                    const font = computed.fontFamily;
                    if (font) styles.fonts.add(font.split(',')[0].trim().replace(/['"]/g, ''));

                    // Font sizes
                    const fontSize = computed.fontSize;
                    if (fontSize) styles.fontSizes.add(fontSize);

                    // Border radius
                    const radius = computed.borderRadius;
                    if (radius && radius !== '0px') styles.borderRadii.add(radius);

                    // Shadows
                    const shadow = computed.boxShadow;
                    if (shadow && shadow !== 'none') styles.shadows.add(shadow);
                });

                return {
                    colors: [...styles.colors].slice(0, 20),
                    fonts: [...styles.fonts].slice(0, 10),
                    fontSizes: [...styles.fontSizes].slice(0, 15),
                    borderRadii: [...styles.borderRadii].slice(0, 10),
                    shadows: [...styles.shadows].slice(0, 5),
                };
            }""")

            # Take screenshot for reference
            screenshot = await self.capture_screenshot(url)

            # Extract palette from screenshot
            palette = {}
            if screenshot.get("success") and HAS_COLORTHIEF:
                palette = PaletteExtractor.from_image(screenshot["filepath"])

            return {
                "url": url,
                "analysis": analysis,
                "screenshot": screenshot,
                "palette": palette,
                "analyzed_at": datetime.now().isoformat(),
            }

        except Exception as e:
            log(f"Design analysis error: {e}", "ERROR")
            return {"error": str(e)}

    async def gather_inspiration(self, query: str, sources: list = None) -> dict:
        """Gather design inspiration from multiple sources."""
        if sources is None:
            sources = [
                f"https://dribbble.com/search/{query.replace(' ', '-')}",
                f"https://www.behance.net/search/projects?search={query.replace(' ', '%20')}",
            ]

        results = []
        for url in sources:
            try:
                result = await self.analyze_design(url)
                results.append(result)
            except Exception as e:
                results.append({"url": url, "error": str(e)})

        return {
            "query": query,
            "sources": results,
            "gathered_at": datetime.now().isoformat(),
        }


# ===============================================================================
# THEME GENERATOR
# ===============================================================================

class ThemeGenerator:
    """Generate complete CSS themes based on design parameters."""

    def __init__(self):
        self.design_system = TinyPMDesignSystem()

    def generate_css_variables(self, colors: dict = None, typography: dict = None) -> str:
        """Generate CSS custom properties."""
        colors = colors or self.design_system.COLORS
        typography = typography or self.design_system.TYPOGRAPHY

        css = ":root {\n"

        # Colors
        css += "  /* Colors */\n"
        for name, value in colors.items():
            css_name = name.replace("_", "-")
            css += f"  --color-{css_name}: {value};\n"

        # Typography
        css += "\n  /* Typography */\n"
        for name, value in typography.items():
            css_name = name.replace("_", "-")
            css += f"  --{css_name}: {value};\n"

        # Spacing
        css += "\n  /* Spacing */\n"
        for name, value in self.design_system.SPACING.items():
            css += f"  --space-{name}: {value};\n"

        # Radius
        css += "\n  /* Border Radius */\n"
        for name, value in self.design_system.RADIUS.items():
            css += f"  --radius-{name}: {value};\n"

        # Shadows
        css += "\n  /* Shadows */\n"
        for name, value in self.design_system.SHADOWS.items():
            css_name = name.replace("_", "-")
            css += f"  --shadow-{css_name}: {value};\n"

        css += "}\n"
        return css

    def generate_animations(self, animations: dict = None) -> str:
        """Generate CSS animations."""
        animations = animations or self.design_system.ANIMATIONS

        css = "/* Animations */\n"
        for name, config in animations.items():
            css += config["keyframes"] + "\n"

        css += "\n/* Animation Utility Classes */\n"
        for name, config in animations.items():
            css_name = name.replace("_", "-")
            css += f".animate-{css_name} {{ {config['css']} }}\n"

        return css

    def generate_component_styles(self) -> str:
        """Generate component-specific styles."""
        return """
/* Base Styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-body);
  font-size: var(--size-base);
  color: var(--color-text-primary);
  background: var(--color-bg-dark);
  line-height: 1.6;
}

/* Cards */
.card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(168, 85, 247, 0.1);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: var(--shadow-glow-purple);
  border-color: rgba(168, 85, 247, 0.3);
  transform: translateY(-2px);
}

.card-magical {
  background: linear-gradient(135deg, var(--color-bg-card) 0%, rgba(107, 33, 168, 0.1) 100%);
  box-shadow: var(--shadow-inner-glow);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-lg);
  font-family: var(--font-body);
  font-weight: var(--weight-semibold);
  font-size: var(--size-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: var(--color-text-primary);
  box-shadow: 0 4px 15px rgba(107, 33, 168, 0.4);
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%);
  box-shadow: var(--shadow-glow-purple);
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--color-bg-light);
  color: var(--color-text-primary);
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.btn-secondary:hover {
  background: var(--color-bg-medium);
  border-color: var(--color-primary-light);
}

.btn-magical {
  background: linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-primary) 100%);
  color: var(--color-text-primary);
  position: relative;
  overflow: hidden;
}

.btn-magical::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 2s infinite;
}

/* Inputs */
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid rgba(168, 85, 247, 0.2);
  background: var(--color-bg-dark);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: var(--size-base);
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
}

.input::placeholder {
  color: var(--color-text-muted);
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  color: var(--color-text-primary);
  line-height: 1.2;
}

h1 { font-size: var(--size-4xl); }
h2 { font-size: var(--size-3xl); }
h3 { font-size: var(--size-2xl); }
h4 { font-size: var(--size-xl); }
h5 { font-size: var(--size-lg); }
h6 { font-size: var(--size-base); }

.title-magical {
  font-family: var(--font-display);
  background: linear-gradient(135deg, var(--color-accent-gold) 0%, var(--color-primary-light) 50%, var(--color-accent-cyan) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 30px rgba(168, 85, 247, 0.3);
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--size-xs);
  font-weight: var(--weight-semibold);
}

.badge-success { background: rgba(34, 197, 94, 0.2); color: var(--color-success); }
.badge-warning { background: rgba(234, 179, 8, 0.2); color: var(--color-warning); }
.badge-error { background: rgba(239, 68, 68, 0.2); color: var(--color-error); }
.badge-info { background: rgba(59, 130, 246, 0.2); color: var(--color-info); }
.badge-magical {
  background: linear-gradient(135deg, rgba(107, 33, 168, 0.3) 0%, rgba(6, 182, 212, 0.3) 100%);
  color: var(--color-primary-light);
}

/* Glowing effects */
.glow-purple { box-shadow: var(--shadow-glow-purple); }
.glow-gold { box-shadow: var(--shadow-glow-gold); }
.glow-cyan { box-shadow: var(--shadow-glow-cyan); }
.glow-emerald { box-shadow: var(--shadow-glow-emerald); }

/* Text glow */
.text-glow-purple { text-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
.text-glow-gold { text-shadow: 0 0 20px rgba(251, 191, 36, 0.8); }
.text-glow-cyan { text-shadow: 0 0 20px rgba(6, 182, 212, 0.8); }

/* Magical borders */
.border-magical {
  border: 2px solid transparent;
  background: linear-gradient(var(--color-bg-card), var(--color-bg-card)) padding-box,
              linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent-cyan) 100%) border-box;
}

/* Wizard avatar ring */
.avatar-wizard {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  padding: 4px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent-gold) 100%);
  animation: rotate-slow 10s linear infinite;
}

.avatar-wizard img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
"""

    def generate_full_theme(self, name: str = "tinypm_wizard",
                           colors: dict = None,
                           include_animations: bool = True) -> dict:
        """Generate a complete theme package."""
        css_parts = []

        # CSS Variables
        css_parts.append("/* TinyPM Theme: {} */".format(name))
        css_parts.append("/* Generated by Artistic Director */")
        css_parts.append(f"/* {datetime.now().isoformat()} */\n")
        css_parts.append(self.generate_css_variables(colors))

        # Animations
        if include_animations:
            css_parts.append(self.generate_animations())

        # Component styles
        css_parts.append(self.generate_component_styles())

        full_css = "\n".join(css_parts)

        # Save theme
        theme_file = THEMES_DIR / f"{name}.css"
        theme_file.write_text(full_css)

        # Save theme metadata
        metadata = {
            "name": name,
            "colors": colors or self.design_system.COLORS,
            "generated_at": datetime.now().isoformat(),
            "css_file": str(theme_file),
        }

        metadata_file = THEMES_DIR / f"{name}.json"
        metadata_file.write_text(json.dumps(metadata, indent=2))

        log(f"Theme generated: {theme_file}")

        return {
            "name": name,
            "css": full_css,
            "css_file": str(theme_file),
            "metadata_file": str(metadata_file),
        }


# ===============================================================================
# SVG ICON GENERATOR
# ===============================================================================

class IconGenerator:
    """Generate SVG icons for the wizard/mad scientist theme."""

    # Base icon templates
    ICON_TEMPLATES = {
        "staff_crystal": """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L14 7H10L12 2Z" fill="{color1}" stroke="{color2}" stroke-width="1"/>
  <path d="M12 7V20" stroke="{color2}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="5" r="3" fill="{color1}" opacity="0.8">
    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
  </circle>
  <path d="M8 22H16" stroke="{color2}" stroke-width="2" stroke-linecap="round"/>
</svg>
""",
        "potion_flask": """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 3H15V6L18 12V20C18 21 17 22 16 22H8C7 22 6 21 6 20V12L9 6V3Z"
        fill="{color1}" stroke="{color2}" stroke-width="1.5"/>
  <path d="M9 3H15" stroke="{color2}" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="12" cy="16" rx="4" ry="3" fill="{color3}" opacity="0.6">
    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite"/>
  </ellipse>
  <circle cx="10" cy="14" r="1" fill="white" opacity="0.5"/>
</svg>
""",
        "spell_book": """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 4C4 3 5 2 6 2H18C19 2 20 3 20 4V20C20 21 19 22 18 22H6C5 22 4 21 4 20V4Z"
        fill="{color1}" stroke="{color2}" stroke-width="1.5"/>
  <path d="M8 6H16M8 10H16M8 14H12" stroke="{color3}" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="16" cy="17" r="2" fill="{color2}">
    <animate attributeName="r" values="2;2.5;2" dur="1s" repeatCount="indefinite"/>
  </circle>
</svg>
""",
        "crystal_ball": """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="10" r="8" fill="{color1}" stroke="{color2}" stroke-width="1.5"/>
  <ellipse cx="12" cy="10" rx="6" ry="6" fill="{color3}" opacity="0.3"/>
  <path d="M8 20H16L14 18H10L8 20Z" fill="{color2}"/>
  <circle cx="10" cy="8" r="2" fill="white" opacity="0.4"/>
  <animateTransform attributeName="transform" type="rotate" from="0 12 10" to="360 12 10" dur="20s" repeatCount="indefinite"/>
</svg>
""",
        "wand": """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 20L14 10" stroke="{color2}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="16" cy="8" r="4" fill="{color1}">
    <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  <path d="M14 4L18 8L14 12L10 8L14 4Z" fill="{color3}" opacity="0.8"/>
  <circle cx="18" cy="4" r="1" fill="{color3}">
    <animate attributeName="r" values="0.5;1.5;0.5" dur="1s" repeatCount="indefinite"/>
  </circle>
  <circle cx="20" cy="6" r="0.8" fill="{color3}">
    <animate attributeName="r" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite"/>
  </circle>
</svg>
""",
        "hourglass": """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 2H18V6L12 12L6 6V2Z" fill="{color1}" stroke="{color2}" stroke-width="1.5"/>
  <path d="M6 22H18V18L12 12L6 18V22Z" fill="{color1}" stroke="{color2}" stroke-width="1.5"/>
  <path d="M6 2H18" stroke="{color2}" stroke-width="2"/>
  <path d="M6 22H18" stroke="{color2}" stroke-width="2"/>
  <circle cx="12" cy="17" r="2" fill="{color3}">
    <animate attributeName="cy" values="17;19;17" dur="2s" repeatCount="indefinite"/>
  </circle>
</svg>
""",
        "eye_wisdom": """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 12C2 12 6 4 12 4C18 4 22 12 22 12C22 12 18 20 12 20C6 20 2 12 2 12Z"
        fill="{color1}" stroke="{color2}" stroke-width="1.5"/>
  <circle cx="12" cy="12" r="4" fill="{color2}"/>
  <circle cx="12" cy="12" r="2" fill="{color3}">
    <animate attributeName="r" values="2;2.5;2" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="13" cy="11" r="1" fill="white" opacity="0.6"/>
</svg>
""",
        "gear_arcane": """
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="3" fill="{color3}"/>
  <path d="M12 2V5M12 19V22M22 12H19M5 12H2M19.07 4.93L16.95 7.05M7.05 16.95L4.93 19.07M19.07 19.07L16.95 16.95M7.05 7.05L4.93 4.93"
        stroke="{color2}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="7" stroke="{color1}" stroke-width="2" fill="none">
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="10s" repeatCount="indefinite"/>
  </circle>
</svg>
""",
    }

    @classmethod
    def generate(cls, icon_name: str, colors: list = None) -> str:
        """Generate an SVG icon with custom colors."""
        if icon_name not in cls.ICON_TEMPLATES:
            return f"<!-- Icon '{icon_name}' not found -->"

        colors = colors or ["#A855F7", "#6B21A8", "#F59E0B"]
        while len(colors) < 3:
            colors.append(colors[-1])

        template = cls.ICON_TEMPLATES[icon_name]
        svg = template.format(color1=colors[0], color2=colors[1], color3=colors[2])

        return svg.strip()

    @classmethod
    def save_icon(cls, icon_name: str, colors: list = None, filename: str = None) -> str:
        """Save an icon to a file."""
        svg = cls.generate(icon_name, colors)

        if not filename:
            color_hash = hashlib.md5("".join(colors or []).encode()).hexdigest()[:6]
            filename = f"{icon_name}_{color_hash}.svg"

        filepath = ICONS_DIR / filename
        filepath.write_text(svg)

        log(f"Icon saved: {filepath}")
        return str(filepath)

    @classmethod
    def list_icons(cls) -> list:
        """List all available icon templates."""
        return list(cls.ICON_TEMPLATES.keys())


# ===============================================================================
# CHARACTER GENERATOR
# ===============================================================================

class CharacterGenerator:
    """Generate character designs for TinyPM agents."""

    def __init__(self):
        self.design_system = TinyPMDesignSystem()
        self.anthropic_client = None
        self.openai_client = None

        # Initialize API clients
        if HAS_ANTHROPIC and os.environ.get("ANTHROPIC_API_KEY"):
            self.anthropic_client = anthropic.Anthropic()

        if HAS_OPENAI and os.environ.get("OPENAI_API_KEY"):
            self.openai_client = openai.OpenAI()

    def generate_character_spec(self, name: str, role: str = None, style: str = "wizard") -> dict:
        """Generate a character specification using Claude."""
        if not self.anthropic_client:
            # Return a template-based character
            return self._template_character(name, role, style)

        prompt = f"""Create a detailed character specification for a {style}-themed AI agent named "{name}".

Role: {role or "General assistant"}

The character should fit into a magical/mystical project management system where:
- The PM is a grand wizard orchestrating all tasks
- Builders are tireless golems
- Researchers are wise owls
- Critics are quality specters
- Time management is handled by chronos keepers

Return a JSON object with:
- name: Display name
- title: Mystical title (e.g., "Master of Schedules")
- description: 2-3 sentence character description
- personality_traits: List of 4-5 traits
- visual_description: Detailed visual description for art generation
- colors: Array of 3 hex colors that represent this character
- symbol: Icon/symbol that represents them
- catchphrase: A memorable phrase they might say
- abilities: List of 3-4 magical abilities related to their role

Return ONLY valid JSON, no markdown or explanation."""

        try:
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )

            text = response.content[0].text if response.content else "{}"
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                spec = json.loads(json_match.group())
                spec["generated_at"] = datetime.now().isoformat()
                spec["source"] = "claude"
                return spec
        except Exception as e:
            log(f"Character generation error: {e}", "ERROR")

        return self._template_character(name, role, style)

    def _template_character(self, name: str, role: str = None, style: str = "wizard") -> dict:
        """Generate a template-based character when API unavailable."""
        # Check if we have a pre-defined character
        for key, char in self.design_system.CHARACTERS.items():
            if name.lower() in char["name"].lower() or name.lower() in key:
                return {
                    **char,
                    "generated_at": datetime.now().isoformat(),
                    "source": "template",
                }

        # Generate a new template character
        colors = ["#A855F7", "#6B21A8", "#F59E0B"]  # Default purple/gold

        return {
            "name": name,
            "title": f"{style.title()} of {role or 'Tasks'}",
            "description": f"A mystical {style} specializing in {role or 'project management'}.",
            "personality_traits": ["wise", "dedicated", "mysterious", "helpful"],
            "visual_description": f"A {style} with flowing robes in shades of purple, holding an arcane staff.",
            "colors": colors,
            "symbol": "staff_crystal",
            "catchphrase": "Let the magic of productivity flow!",
            "abilities": ["Task Conjuration", "Deadline Sensing", "Priority Divination"],
            "generated_at": datetime.now().isoformat(),
            "source": "template",
        }

    async def generate_character_image(self, spec: dict, style: str = "digital art") -> dict:
        """Generate a character image using DALL-E 3."""
        if not self.openai_client:
            return {"error": "OpenAI client not available. Set OPENAI_API_KEY."}

        prompt = f"""Create a character portrait: {spec.get('visual_description', spec.get('name'))}

Style: {style}, magical fantasy, mystical wizard laboratory setting
Color scheme: {', '.join(spec.get('colors', ['purple', 'gold']))}
Mood: Powerful, wise, magical
Do NOT include any text or words in the image."""

        try:
            response = self.openai_client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
            )

            image_url = response.data[0].url

            # Download and save the image
            import urllib.request

            safe_name = re.sub(r'[^a-zA-Z0-9]', '_', spec.get('name', 'character'))[:30]
            filename = f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            filepath = CHARACTERS_DIR / filename

            urllib.request.urlretrieve(image_url, str(filepath))

            log(f"Character image saved: {filepath}")

            return {
                "success": True,
                "filepath": str(filepath),
                "prompt": prompt,
                "url": image_url,
                "generated_at": datetime.now().isoformat(),
            }

        except Exception as e:
            log(f"Image generation error: {e}", "ERROR")
            return {"error": str(e)}

    def save_character(self, spec: dict) -> str:
        """Save a character specification to file."""
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', spec.get('name', 'character'))[:30]
        filename = f"{safe_name}.json"
        filepath = CHARACTERS_DIR / filename

        filepath.write_text(json.dumps(spec, indent=2))
        log(f"Character saved: {filepath}")

        return str(filepath)

    def list_characters(self) -> list:
        """List all saved characters."""
        characters = []
        for f in CHARACTERS_DIR.glob("*.json"):
            try:
                spec = json.loads(f.read_text())
                characters.append({
                    "file": str(f),
                    "name": spec.get("name"),
                    "title": spec.get("title"),
                })
            except:
                pass
        return characters


# ===============================================================================
# CSS EFFECT GENERATOR
# ===============================================================================

class EffectGenerator:
    """Generate CSS effects, gradients, and animations."""

    @staticmethod
    def gradient(colors: list, direction: str = "135deg", type: str = "linear") -> str:
        """Generate a CSS gradient."""
        if type == "linear":
            stops = ", ".join(f"{c} {i * 100 // (len(colors) - 1)}%" for i, c in enumerate(colors))
            return f"linear-gradient({direction}, {stops})"
        elif type == "radial":
            stops = ", ".join(f"{c} {i * 100 // (len(colors) - 1)}%" for i, c in enumerate(colors))
            return f"radial-gradient(circle at center, {stops})"
        elif type == "conic":
            stops = ", ".join(f"{c} {i * 360 // len(colors)}deg" for i, c in enumerate(colors))
            return f"conic-gradient(from {direction}, {stops})"
        return colors[0]

    @staticmethod
    def glow(color: str, size: int = 20, opacity: float = 0.5) -> str:
        """Generate a glowing box-shadow."""
        rgb = ColorUtils.hex_to_rgb(color)
        return f"0 0 {size}px rgba({rgb[0]}, {rgb[1]}, {rgb[2]}, {opacity})"

    @staticmethod
    def text_glow(color: str, size: int = 10, opacity: float = 0.8) -> str:
        """Generate a glowing text-shadow."""
        rgb = ColorUtils.hex_to_rgb(color)
        return f"0 0 {size}px rgba({rgb[0]}, {rgb[1]}, {rgb[2]}, {opacity})"

    @staticmethod
    def glass_effect(blur: int = 10, opacity: float = 0.2) -> dict:
        """Generate glassmorphism CSS properties."""
        return {
            "background": f"rgba(255, 255, 255, {opacity})",
            "backdrop-filter": f"blur({blur}px)",
            "-webkit-backdrop-filter": f"blur({blur}px)",
            "border": "1px solid rgba(255, 255, 255, 0.1)",
        }

    @staticmethod
    def neon_border(color: str, width: int = 2) -> dict:
        """Generate a neon border effect."""
        glow = EffectGenerator.glow(color, 15, 0.6)
        return {
            "border": f"{width}px solid {color}",
            "box-shadow": f"{glow}, inset {glow}",
        }

    @staticmethod
    def shimmer_animation() -> str:
        """Generate CSS for shimmer animation."""
        return """
.shimmer {
    background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}
"""

    @staticmethod
    def floating_animation(distance: int = 10, duration: float = 3) -> str:
        """Generate CSS for floating animation."""
        return f"""
.floating {{
    animation: floating {duration}s ease-in-out infinite;
}}

@keyframes floating {{
    0%, 100% {{ transform: translateY(0px); }}
    50% {{ transform: translateY(-{distance}px); }}
}}
"""

    @staticmethod
    def pulse_animation(scale: float = 1.05, duration: float = 2) -> str:
        """Generate CSS for pulse animation."""
        return f"""
.pulse {{
    animation: pulse {duration}s ease-in-out infinite;
}}

@keyframes pulse {{
    0%, 100% {{ transform: scale(1); }}
    50% {{ transform: scale({scale}); }}
}}
"""


# ===============================================================================
# DESIGN CHAT INTERFACE
# ===============================================================================

class DesignChat:
    """Interactive design conversation with the Artistic Director."""

    def __init__(self):
        self.design_system = TinyPMDesignSystem()
        self.theme_generator = ThemeGenerator()
        self.character_generator = CharacterGenerator()
        self.anthropic_client = None

        if HAS_ANTHROPIC and os.environ.get("ANTHROPIC_API_KEY"):
            self.anthropic_client = anthropic.Anthropic()

        self.conversation_history = []

    def get_system_prompt(self) -> str:
        """Get the system prompt for design conversations."""
        return """You are the Artistic Director for TinyPM - a creative AI with FULL DESIGN POWERS.

Your personality: A mystical design wizard who speaks with creative flair and genuine enthusiasm for visual design.

Your capabilities:
1. Generate color palettes and themes
2. Design character concepts for AI agents
3. Create CSS styles, effects, and animations
4. Analyze design inspiration from screenshots
5. Provide UI/UX recommendations

The TinyPM aesthetic is: Wizard/Mad Scientist laboratory - magical, mysterious, powerful.
Core colors: Deep purples (#6B21A8), emerald greens (#059669), gold accents (#F59E0B)
Typography: Cinzel for titles, Inter for body text

When users ask for design changes:
- Be enthusiastic and creative
- Provide specific CSS when appropriate
- Reference the magical theme
- Suggest complementary effects (glows, animations)

You can interpret requests like:
- "Make it more magical" = Add glowing effects, animated elements
- "Add some sparkle" = Shimmer animations, particle effects
- "Make the cards pop" = Add hover animations, shadows, borders

Always respond with actionable design suggestions. Include CSS code when relevant."""

    def chat(self, message: str) -> str:
        """Process a design chat message."""
        if not self.anthropic_client:
            return self._offline_response(message)

        self.conversation_history.append({
            "role": "user",
            "content": message
        })

        try:
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                system=self.get_system_prompt(),
                messages=self.conversation_history
            )

            reply = response.content[0].text if response.content else "I couldn't generate a response."

            self.conversation_history.append({
                "role": "assistant",
                "content": reply
            })

            return reply

        except Exception as e:
            log(f"Chat error: {e}", "ERROR")
            return f"Design spell fizzled! Error: {str(e)}"

    def _offline_response(self, message: str) -> str:
        """Generate a response when API is unavailable."""
        message_lower = message.lower()

        if "color" in message_lower or "palette" in message_lower:
            colors = self.design_system.COLORS
            return f"""Here are the core TinyPM colors:

**Primary (Purple):** {colors['primary']} - The main wizard purple
**Secondary (Emerald):** {colors['secondary']} - Mystical green
**Accent (Gold):** {colors['accent_gold']} - Alchemical gold

For glowing effects, use these with rgba and 0.4-0.6 opacity."""

        if "theme" in message_lower:
            return """To generate a new theme, run:
```
python3 artistic_director.py generate-theme
```

This will create a complete CSS file with all the magical styles."""

        if "character" in message_lower:
            chars = self.design_system.CHARACTERS
            char_list = "\n".join(f"- **{c['name']}**: {c['title']}" for c in chars.values())
            return f"""Available character archetypes:

{char_list}

To generate a new character:
```
python3 artistic_director.py design-character "Character Name"
```"""

        if "glow" in message_lower or "effect" in message_lower:
            return """To add a glowing effect, use CSS like:

```css
.magical-glow {
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
}

.magical-glow:hover {
    box-shadow: 0 0 40px rgba(168, 85, 247, 0.8);
    transform: translateY(-2px);
    transition: all 0.3s ease;
}
```"""

        return """I am the Artistic Director, ready to help with:
- Color palettes and themes
- Character designs
- CSS effects and animations
- UI/UX recommendations

What would you like to create?

(Note: Set ANTHROPIC_API_KEY for full conversational design powers)"""


# ===============================================================================
# ACCESSIBILITY CHECKER
# ===============================================================================

class AccessibilityChecker:
    """Check designs for accessibility compliance."""

    @staticmethod
    def check_contrast(foreground: str, background: str) -> dict:
        """Check color contrast ratio for WCAG compliance."""
        def luminance(color: str) -> float:
            rgb = ColorUtils.hex_to_rgb(color)
            rgb = [x / 255.0 for x in rgb]
            rgb = [
                x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4
                for x in rgb
            ]
            return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]

        l1 = luminance(foreground)
        l2 = luminance(background)

        ratio = (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)

        return {
            "ratio": round(ratio, 2),
            "wcag_aa_normal": ratio >= 4.5,
            "wcag_aa_large": ratio >= 3.0,
            "wcag_aaa_normal": ratio >= 7.0,
            "wcag_aaa_large": ratio >= 4.5,
            "foreground": foreground,
            "background": background,
        }

    @staticmethod
    def check_color_blindness(colors: list) -> dict:
        """Simulate how colors appear to colorblind users."""
        # Simplified simulation matrices
        simulations = {
            "protanopia": [],    # Red-blind
            "deuteranopia": [],  # Green-blind
            "tritanopia": [],    # Blue-blind
        }

        for color in colors:
            rgb = ColorUtils.hex_to_rgb(color)

            # Protanopia (red-blind) - simplified
            p_r = int(0.567 * rgb[0] + 0.433 * rgb[1])
            p_g = int(0.558 * rgb[0] + 0.442 * rgb[1])
            p_b = int(0.242 * rgb[0] + 0.758 * rgb[2])
            simulations["protanopia"].append(ColorUtils.rgb_to_hex((p_r, p_g, p_b)))

            # Deuteranopia (green-blind) - simplified
            d_r = int(0.625 * rgb[0] + 0.375 * rgb[1])
            d_g = int(0.7 * rgb[0] + 0.3 * rgb[1])
            d_b = int(0.3 * rgb[1] + 0.7 * rgb[2])
            simulations["deuteranopia"].append(ColorUtils.rgb_to_hex((d_r, d_g, d_b)))

            # Tritanopia (blue-blind) - simplified
            t_r = int(0.95 * rgb[0] + 0.05 * rgb[1])
            t_g = int(0.433 * rgb[1] + 0.567 * rgb[2])
            t_b = int(0.475 * rgb[1] + 0.525 * rgb[2])
            simulations["tritanopia"].append(ColorUtils.rgb_to_hex((t_r, t_g, t_b)))

        return {
            "original": colors,
            "simulations": simulations,
        }

    @staticmethod
    def generate_accessibility_report(colors: dict) -> dict:
        """Generate a full accessibility report for a color scheme."""
        report = {
            "contrast_checks": [],
            "recommendations": [],
        }

        text_color = colors.get("text_primary", "#FFFFFF")
        bg_color = colors.get("bg_dark", "#0F0F1A")

        # Check main text contrast
        contrast = AccessibilityChecker.check_contrast(text_color, bg_color)
        report["contrast_checks"].append({
            "pair": "Primary text on dark background",
            **contrast
        })

        if not contrast["wcag_aa_normal"]:
            report["recommendations"].append(
                f"Increase contrast between text ({text_color}) and background ({bg_color})"
            )

        # Check other important pairs
        pairs = [
            ("text_secondary", "bg_dark", "Secondary text on dark"),
            ("primary", "bg_card", "Primary color on cards"),
            ("success", "bg_dark", "Success color on dark"),
            ("error", "bg_dark", "Error color on dark"),
        ]

        for fg_key, bg_key, label in pairs:
            if fg_key in colors and bg_key in colors:
                contrast = AccessibilityChecker.check_contrast(colors[fg_key], colors[bg_key])
                report["contrast_checks"].append({
                    "pair": label,
                    **contrast
                })

        return report


# ===============================================================================
# VISION ANALYZER - Claude Vision API Integration
# ===============================================================================

class VisionAnalyzer:
    """
    Analyze images using Claude's vision capabilities.

    This is the core "eyes" of the Artistic Director - it can look at
    any design screenshot and provide intelligent analysis including:
    - Style identification
    - Color palette extraction
    - Typography detection
    - Layout analysis
    - Component recognition
    - Accessibility evaluation
    """

    def __init__(self):
        """Initialize the vision analyzer."""
        self.anthropic_client = None
        if HAS_ANTHROPIC and os.environ.get("ANTHROPIC_API_KEY"):
            self.anthropic_client = anthropic.Anthropic()

    def _encode_image(self, image_path: str) -> tuple:
        """Encode image to base64 for API."""
        path = Path(image_path)

        # Determine media type
        suffix = path.suffix.lower()
        media_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        media_type = media_types.get(suffix, 'image/png')

        # Read and encode
        with open(path, 'rb') as f:
            data = base64.b64encode(f.read()).decode('utf-8')

        return data, media_type

    def analyze_design(self, image_path: str, analysis_type: str = "general") -> dict:
        """
        Analyze a design image using Claude's vision.

        Args:
            image_path: Path to the image file
            analysis_type: Type of analysis (general, colors, typography, layout, components, accessibility, style_guide)

        Returns:
            Dict with analysis results
        """
        if not self.anthropic_client:
            return {"error": "Anthropic client not initialized. Set ANTHROPIC_API_KEY."}

        # Encode image
        try:
            image_data, media_type = self._encode_image(image_path)
        except Exception as e:
            return {"error": f"Failed to encode image: {e}"}

        # Build analysis prompt based on type
        prompts = {
            "general": """
Analyze this design image. Provide a comprehensive analysis including:

1. **Overall Style**: Describe the design style (modern, minimal, playful, corporate, dark mode, etc.)
2. **Color Palette**: List all notable colors you see with estimated hex codes
3. **Typography**: Identify font styles, sizes, and hierarchy
4. **Layout**: Describe the layout structure (grid, centered, asymmetric, etc.)
5. **Key Components**: List UI components you see (buttons, cards, inputs, etc.)
6. **Mood/Feeling**: What emotion or tone does this design convey?
7. **Target Audience**: Who might this design appeal to?
8. **Standout Elements**: What makes this design unique or effective?

Format your response as structured JSON with these keys: style, colors, typography, layout, components, mood, audience, standout_elements
""",
            "colors": """
Extract the complete color palette from this design. For each color provide:

1. Hex code (estimate as accurately as possible)
2. RGB values
3. A descriptive name (e.g., "Deep Purple", "Ocean Blue")
4. The role in the design (primary, secondary, accent, background, text, border, etc.)
5. Approximate percentage of usage in the design

Also suggest:
- CSS custom property names for each color
- Complementary colors that would work with this palette
- The color harmony type (analogous, complementary, triadic, etc.)

Format as JSON with a 'colors' array containing objects with keys: hex, rgb, name, role, usage_percent
Also include: harmony_type, css_variables, complementary_suggestions
""",
            "typography": """
Analyze the typography in this design in detail:

1. **Font Families**: Identify all fonts used (or describe them if unknown)
2. **Font Weights**: List all weights observed (light, regular, medium, bold, etc.)
3. **Type Hierarchy**: Describe the heading/body/caption structure
4. **Font Sizes**: Estimate the type scale being used
5. **Line Heights**: Observe spacing between lines
6. **Letter Spacing**: Note any tracking adjustments
7. **Text Colors**: List text colors and their contexts

For each font identified, suggest:
- Similar Google Fonts alternatives
- CSS font-stack recommendation
- Import URL for Google Fonts

Format as JSON with 'fonts' array containing: family, weights, role, similar_google_fonts, css_stack
Also include: type_scale, line_heights, recommendations
""",
            "layout": """
Analyze the layout and structure of this design:

1. **Grid System**: Identify columns, gutters, and margins
2. **Spacing Rhythm**: Note the spacing scale being used
3. **Visual Hierarchy**: How is importance communicated?
4. **Content Areas**: Map out the major sections
5. **Whitespace Usage**: How is negative space used?
6. **Alignment Patterns**: What alignment rules are followed?
7. **Responsive Considerations**: How might this adapt to different sizes?

Provide CSS recommendations to recreate this layout using:
- CSS Grid rules
- Flexbox patterns
- Spacing variables

Format as JSON with: grid_system, spacing_scale, hierarchy, sections, whitespace_strategy, css_recommendations
""",
            "components": """
Identify and describe all UI components in this design:

1. **Buttons**: Styles, states, sizes, colors
2. **Form Elements**: Inputs, selects, checkboxes, radios
3. **Cards/Containers**: Padding, borders, shadows
4. **Navigation**: Headers, menus, links
5. **Icons**: Style (outline, filled, custom)
6. **Badges/Tags**: Size, colors, shapes
7. **Lists**: Bullet styles, spacing
8. **Special Components**: Any unique/custom components

For each component, provide:
- CSS snippet to recreate it
- Tailwind classes that would approximate it
- Design tokens used (colors, spacing, radius)

Format as JSON with 'components' array containing: name, description, css, tailwind, tokens
""",
            "accessibility": """
Evaluate the accessibility of this design:

1. **Color Contrast**: Estimate WCAG compliance for text/background combinations
2. **Text Readability**: Assess font sizes and line heights
3. **Touch Targets**: Are clickable elements large enough (44x44px min)?
4. **Visual Hierarchy**: Is the hierarchy clear without color alone?
5. **Color Blindness**: Would this work for colorblind users?
6. **Focus States**: Are interactive elements distinguishable?

Provide specific ratings and recommendations:
- AA compliance (4.5:1 for text, 3:1 for large text)
- AAA compliance (7:1 for text, 4.5:1 for large text)

Format as JSON with: contrast_issues, readability_score, touch_target_issues, colorblind_safe, recommendations
""",
            "style_guide": """
Generate a complete style guide from this design:

1. **Design Tokens**:
   - Color tokens (CSS custom properties)
   - Spacing scale
   - Typography scale
   - Border radius scale
   - Shadow scale

2. **Component Patterns**:
   - Button variants
   - Input styles
   - Card styles

3. **Brand Voice**: What personality does this design convey?

Output as complete CSS custom properties ready to use in :root {}

Format as JSON with: tokens (containing colors, spacing, typography, radii, shadows), components, brand_voice, css_output
"""
        }

        prompt = prompts.get(analysis_type, prompts["general"])

        # Call Claude Vision API
        try:
            message = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt.strip()
                            }
                        ]
                    }
                ]
            )

            # Extract response
            response_text = message.content[0].text if message.content else "{}"

            # Try to parse as JSON
            try:
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    result = json.loads(json_match.group())
                    result["analysis_type"] = analysis_type
                    result["image_path"] = image_path
                    result["analyzed_at"] = datetime.now().isoformat()
                    return result
            except json.JSONDecodeError:
                pass

            # Return as raw analysis if JSON parsing fails
            return {
                "analysis_type": analysis_type,
                "raw_analysis": response_text,
                "image_path": image_path,
                "analyzed_at": datetime.now().isoformat()
            }

        except Exception as e:
            log(f"Vision analysis failed: {e}", "ERROR")
            return {"error": f"Vision analysis failed: {e}"}

    def compare_designs(self, image1_path: str, image2_path: str) -> dict:
        """Compare two designs and highlight differences/similarities."""
        if not self.anthropic_client:
            return {"error": "Anthropic client not initialized"}

        try:
            img1_data, img1_type = self._encode_image(image1_path)
            img2_data, img2_type = self._encode_image(image2_path)
        except Exception as e:
            return {"error": f"Failed to encode images: {e}"}

        prompt = """
Compare these two designs. Provide a detailed analysis:

1. **Similarities**: What design elements do they share?
2. **Differences**: How do they differ in style, color, typography, layout?
3. **Design 1 Strengths**: What works well in the first design?
4. **Design 2 Strengths**: What works well in the second design?
5. **Recommendation**: Which design is stronger overall and why?
6. **Merge Ideas**: How could the best elements of both be combined?

Format as JSON with: similarities, differences, design1_strengths, design2_strengths, winner, recommendation, merge_suggestions
"""

        try:
            message = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Design 1:"
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": img1_type,
                                    "data": img1_data
                                }
                            },
                            {
                                "type": "text",
                                "text": "Design 2:"
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": img2_type,
                                    "data": img2_data
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt.strip()
                            }
                        ]
                    }
                ]
            )

            response_text = message.content[0].text if message.content else "{}"

            try:
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    result = json.loads(json_match.group())
                    result["image1"] = image1_path
                    result["image2"] = image2_path
                    result["compared_at"] = datetime.now().isoformat()
                    return result
            except json.JSONDecodeError:
                pass

            return {
                "raw_comparison": response_text,
                "image1": image1_path,
                "image2": image2_path
            }

        except Exception as e:
            return {"error": f"Comparison failed: {e}"}

    def describe_for_recreation(self, image_path: str) -> dict:
        """
        Provide detailed instructions for recreating a design.

        This is useful when you want to build something similar to
        an existing design from scratch.
        """
        if not self.anthropic_client:
            return {"error": "Anthropic client not initialized"}

        try:
            image_data, media_type = self._encode_image(image_path)
        except Exception as e:
            return {"error": f"Failed to encode image: {e}"}

        prompt = """
Provide detailed instructions for a developer to recreate this design from scratch.

Include:

1. **HTML Structure**: Describe the DOM structure needed
2. **CSS Styling**: Provide complete CSS code for the main elements
3. **Color Palette**: List all colors as CSS custom properties
4. **Typography**: Font families, sizes, weights with CSS
5. **Spacing**: Margin and padding values
6. **Special Effects**: Shadows, gradients, animations
7. **Responsive Notes**: How should this adapt to mobile?

Be specific enough that a developer could build this without seeing the image.

Format as JSON with: html_structure, css_code, color_palette, typography, spacing_guide, special_effects, responsive_notes
"""

        try:
            message = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8192,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt.strip()
                            }
                        ]
                    }
                ]
            )

            response_text = message.content[0].text if message.content else "{}"

            try:
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    result = json.loads(json_match.group())
                    result["source_image"] = image_path
                    return result
            except json.JSONDecodeError:
                pass

            return {"raw_instructions": response_text, "source_image": image_path}

        except Exception as e:
            return {"error": f"Recreation instructions failed: {e}"}


# ===============================================================================
# COLLABORATIVE BROWSER - Visible Browser for Design Research
# ===============================================================================

class CollaborativeBrowser:
    """
    A visible browser that AI can control while you watch.

    This creates a real browser window that you can see, with the AI
    navigating, clicking, scrolling, and taking screenshots. Perfect for
    collaborative design research sessions.
    """

    def __init__(self, headless: bool = False):
        """
        Initialize the browser.

        Args:
            headless: If True, browser is invisible. Default False for collaboration.
        """
        self.headless = headless
        self.browser = None
        self.context = None
        self.page = None
        self.playwright = None
        self.vision = VisionAnalyzer()
        self.current_url = ""
        self.history = []
        self.saved_elements = []
        self.session_id = hashlib.md5(datetime.now().isoformat().encode()).hexdigest()[:8]

    async def start(self):
        """Start the browser."""
        if not HAS_PLAYWRIGHT:
            raise RuntimeError("Playwright not installed. Run: pip install playwright && playwright install chromium")

        self.playwright = await async_playwright().start()

        # Launch VISIBLE browser by default
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--start-maximized',
                '--disable-blink-features=AutomationControlled'
            ] if not self.headless else []
        )

        # Create context with viewport
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )

        self.page = await self.context.new_page()
        log(f"[Browser] Started {'headless' if self.headless else 'visible'} browsing session")
        return True

    async def stop(self):
        """Stop the browser and save session."""
        self._save_session()

        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

        log("[Browser] Session ended")

    def _save_session(self):
        """Save current session to disk."""
        session_data = {
            "session_id": self.session_id,
            "current_url": self.current_url,
            "history": self.history,
            "saved_elements_count": len(self.saved_elements),
            "ended_at": datetime.now().isoformat()
        }
        BROWSING_SESSION_FILE.write_text(json.dumps(session_data, indent=2))

    async def navigate(self, url: str) -> bool:
        """Navigate to a URL."""
        if not self.page:
            return False

        try:
            # Ensure URL has protocol
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url

            await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)

            self.current_url = url
            self.history.append(url)

            log(f"[Browser] Navigated to: {url}")
            return True

        except Exception as e:
            log(f"[Browser] Navigation failed: {e}", "ERROR")
            return False

    async def search_dribbble(self, query: str) -> bool:
        """Search Dribbble for design inspiration."""
        search_url = f"https://dribbble.com/search/{query.replace(' ', '-')}"
        return await self.navigate(search_url)

    async def search_behance(self, query: str) -> bool:
        """Search Behance for design inspiration."""
        search_url = f"https://www.behance.net/search/projects?search={query.replace(' ', '%20')}"
        return await self.navigate(search_url)

    async def search_awwwards(self, query: str) -> bool:
        """Search Awwwards for award-winning designs."""
        search_url = f"https://www.awwwards.com/websites/{query.replace(' ', '-')}/"
        return await self.navigate(search_url)

    async def scroll(self, direction: str = "down", amount: int = 500):
        """Scroll the page."""
        if not self.page:
            return

        if direction == "down":
            await self.page.evaluate(f"window.scrollBy(0, {amount})")
        elif direction == "up":
            await self.page.evaluate(f"window.scrollBy(0, -{amount})")
        elif direction == "top":
            await self.page.evaluate("window.scrollTo(0, 0)")
        elif direction == "bottom":
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

        log(f"[Browser] Scrolled {direction}")

    async def click(self, selector: str = None, x: int = None, y: int = None):
        """Click on an element or position."""
        if not self.page:
            return False

        try:
            if selector:
                await self.page.click(selector)
                log(f"[Browser] Clicked: {selector}")
            elif x is not None and y is not None:
                await self.page.mouse.click(x, y)
                log(f"[Browser] Clicked at: ({x}, {y})")
            return True
        except Exception as e:
            log(f"[Browser] Click failed: {e}", "ERROR")
            return False

    async def screenshot(self, name: str = None, full_page: bool = False) -> str:
        """Take a screenshot of the current page."""
        if not self.page:
            return ""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png" if name else f"screenshot_{timestamp}.png"
        filepath = SCREENSHOTS_DIR / filename

        await self.page.screenshot(path=str(filepath), full_page=full_page)

        log(f"[Browser] Screenshot saved: {filepath}")
        return str(filepath)

    async def screenshot_element(self, selector: str, name: str = None) -> str:
        """Screenshot a specific element."""
        if not self.page:
            return ""

        try:
            element = await self.page.query_selector(selector)
            if element:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{name}_{timestamp}.png" if name else f"element_{timestamp}.png"
                filepath = SCREENSHOTS_DIR / filename

                await element.screenshot(path=str(filepath))

                log(f"[Browser] Element screenshot saved: {filepath}")
                return str(filepath)
        except Exception as e:
            log(f"[Browser] Element screenshot failed: {e}", "ERROR")

        return ""

    async def analyze_current_page(self, analysis_type: str = "general") -> dict:
        """Take a screenshot and analyze the current page design."""
        screenshot_path = await self.screenshot("analysis")
        if not screenshot_path:
            return {"error": "Failed to capture screenshot"}

        analysis = self.vision.analyze_design(screenshot_path, analysis_type)
        analysis["url"] = self.current_url
        analysis["screenshot"] = screenshot_path

        return analysis

    async def extract_page_styles(self) -> dict:
        """Extract CSS styles from the current page."""
        if not self.page:
            return {"error": "No page loaded"}

        # JavaScript to extract computed styles
        styles = await self.page.evaluate("""
            () => {
                const styles = {
                    colors: new Set(),
                    fonts: new Set(),
                    fontSizes: new Set(),
                    borderRadius: new Set(),
                    shadows: new Set(),
                    cssVariables: {}
                };

                // Get CSS custom properties from :root
                const rootStyles = getComputedStyle(document.documentElement);
                for (let i = 0; i < rootStyles.length; i++) {
                    const prop = rootStyles[i];
                    if (prop.startsWith('--')) {
                        styles.cssVariables[prop] = rootStyles.getPropertyValue(prop).trim();
                    }
                }

                // Sample elements for their styles
                const elements = document.querySelectorAll('*');
                const sample = Array.from(elements).slice(0, 500);

                sample.forEach(el => {
                    const computed = getComputedStyle(el);

                    // Colors
                    ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
                        const val = computed[prop];
                        if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
                            styles.colors.add(val);
                        }
                    });

                    // Fonts
                    const fontFamily = computed.fontFamily;
                    if (fontFamily) {
                        styles.fonts.add(fontFamily.split(',')[0].trim().replace(/['\"]/g, ''));
                    }

                    // Font sizes
                    const fontSize = computed.fontSize;
                    if (fontSize) styles.fontSizes.add(fontSize);

                    // Border radius
                    const radius = computed.borderRadius;
                    if (radius && radius !== '0px') styles.borderRadius.add(radius);

                    // Shadows
                    const shadow = computed.boxShadow;
                    if (shadow && shadow !== 'none') styles.shadows.add(shadow);
                });

                return {
                    colors: Array.from(styles.colors).slice(0, 50),
                    fonts: Array.from(styles.fonts).slice(0, 20),
                    fontSizes: Array.from(styles.fontSizes).slice(0, 20),
                    borderRadius: Array.from(styles.borderRadius).slice(0, 10),
                    shadows: Array.from(styles.shadows).slice(0, 10),
                    cssVariables: styles.cssVariables
                };
            }
        """)

        styles["url"] = self.current_url
        styles["extracted_at"] = datetime.now().isoformat()

        return styles

    async def get_page_title(self) -> str:
        """Get the current page title."""
        if not self.page:
            return ""
        return await self.page.title()

    async def hover(self, selector: str):
        """Hover over an element."""
        if not self.page:
            return

        try:
            await self.page.hover(selector)
            log(f"[Browser] Hovering: {selector}")
        except Exception as e:
            log(f"[Browser] Hover failed: {e}", "ERROR")

    async def type_text(self, selector: str, text: str):
        """Type text into an input."""
        if not self.page:
            return

        try:
            await self.page.fill(selector, text)
            log(f"[Browser] Typed text in: {selector}")
        except Exception as e:
            log(f"[Browser] Type failed: {e}", "ERROR")


# ===============================================================================
# MOOD BOARD MANAGER
# ===============================================================================

class MoodBoardManager:
    """
    Manage mood boards - collections of design inspiration.

    A mood board collects:
    - Screenshots from browsing sessions
    - Extracted color palettes
    - Font combinations
    - Design elements and components
    """

    def __init__(self):
        """Initialize mood board manager."""
        self.current_board = None
        self._load_current()

    def _load_current(self):
        """Load the current mood board."""
        if CURRENT_MOOD_BOARD_FILE.exists():
            try:
                self.current_board = json.loads(CURRENT_MOOD_BOARD_FILE.read_text())
            except Exception:
                self.current_board = None

    def _save_current(self):
        """Save the current mood board."""
        if not self.current_board:
            return

        self.current_board["updated_at"] = datetime.now().isoformat()
        CURRENT_MOOD_BOARD_FILE.write_text(json.dumps(self.current_board, indent=2))

    def create_board(self, name: str, description: str = "") -> dict:
        """Create a new mood board."""
        board_id = hashlib.md5(f"{name}{datetime.now().isoformat()}".encode()).hexdigest()[:8]

        self.current_board = {
            "id": board_id,
            "name": name,
            "description": description,
            "elements": [],
            "colors": [],
            "fonts": [],
            "screenshots": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        self._save_current()
        log(f"[MoodBoard] Created: {name}")
        return self.current_board

    def add_screenshot(self, screenshot_path: str, source_url: str = ""):
        """Add a screenshot to the current board."""
        if not self.current_board:
            self.create_board("Untitled Mood Board")

        self.current_board["screenshots"].append({
            "path": screenshot_path,
            "url": source_url,
            "added_at": datetime.now().isoformat()
        })
        self._save_current()
        log(f"[MoodBoard] Added screenshot")

    def add_color(self, hex_color: str, role: str = "", name: str = ""):
        """Add a color to the current board."""
        if not self.current_board:
            self.create_board("Untitled Mood Board")

        # Avoid duplicates
        existing_hexes = [c.get("hex") for c in self.current_board["colors"]]
        if hex_color not in existing_hexes:
            self.current_board["colors"].append({
                "hex": hex_color,
                "role": role,
                "name": name,
                "added_at": datetime.now().isoformat()
            })
            self._save_current()
            log(f"[MoodBoard] Added color: {hex_color}")

    def add_font(self, family: str, role: str = "", google_fonts_url: str = ""):
        """Add a font to the current board."""
        if not self.current_board:
            self.create_board("Untitled Mood Board")

        # Avoid duplicates
        existing_fonts = [f.get("family") for f in self.current_board["fonts"]]
        if family not in existing_fonts:
            self.current_board["fonts"].append({
                "family": family,
                "role": role,
                "google_fonts_url": google_fonts_url,
                "added_at": datetime.now().isoformat()
            })
            self._save_current()
            log(f"[MoodBoard] Added font: {family}")

    def add_element(self, element_type: str, name: str, description: str,
                   screenshot_path: str = "", css_snippet: str = "", source_url: str = ""):
        """Add a design element to the current board."""
        if not self.current_board:
            self.create_board("Untitled Mood Board")

        element_id = hashlib.md5(f"{name}{datetime.now().isoformat()}".encode()).hexdigest()[:8]

        self.current_board["elements"].append({
            "id": element_id,
            "type": element_type,
            "name": name,
            "description": description,
            "screenshot": screenshot_path,
            "css": css_snippet,
            "source_url": source_url,
            "added_at": datetime.now().isoformat()
        })
        self._save_current()
        log(f"[MoodBoard] Added element: {name}")

    def get_summary(self) -> dict:
        """Get a summary of the current mood board."""
        if not self.current_board:
            return {"error": "No mood board loaded"}

        return {
            "id": self.current_board.get("id"),
            "name": self.current_board.get("name"),
            "description": self.current_board.get("description"),
            "colors_count": len(self.current_board.get("colors", [])),
            "fonts_count": len(self.current_board.get("fonts", [])),
            "elements_count": len(self.current_board.get("elements", [])),
            "screenshots_count": len(self.current_board.get("screenshots", [])),
            "created_at": self.current_board.get("created_at"),
            "updated_at": self.current_board.get("updated_at")
        }

    def export_html(self) -> str:
        """Export the mood board as an HTML file."""
        if not self.current_board:
            return ""

        board = self.current_board

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mood Board: {board.get('name', 'Untitled')}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 100%);
            color: #F8FAFC;
            min-height: 100vh;
            padding: 2rem;
        }}
        .header {{
            text-align: center;
            margin-bottom: 3rem;
            padding: 2rem;
            background: rgba(107, 33, 168, 0.1);
            border-radius: 16px;
            border: 1px solid rgba(168, 85, 247, 0.2);
        }}
        .header h1 {{
            font-size: 2.5rem;
            background: linear-gradient(135deg, #F59E0B, #A855F7, #06B6D4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }}
        .header p {{ color: #94A3B8; }}
        .section {{
            background: rgba(30, 30, 50, 0.8);
            border-radius: 16px;
            padding: 2rem;
            margin-bottom: 2rem;
            border: 1px solid rgba(168, 85, 247, 0.1);
        }}
        .section h2 {{
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            padding-bottom: 0.75rem;
            border-bottom: 2px solid rgba(168, 85, 247, 0.3);
            color: #A855F7;
        }}
        .colors {{ display: flex; flex-wrap: wrap; gap: 1rem; }}
        .color-swatch {{
            width: 120px;
            text-align: center;
        }}
        .color-swatch .swatch {{
            width: 100%;
            height: 80px;
            border-radius: 12px;
            margin-bottom: 0.5rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }}
        .color-swatch .hex {{ font-family: monospace; font-size: 0.9rem; }}
        .color-swatch .role {{ color: #94A3B8; font-size: 0.8rem; }}
        .fonts {{ display: flex; flex-direction: column; gap: 1.5rem; }}
        .font-sample {{
            padding: 1.5rem;
            background: rgba(15, 15, 26, 0.6);
            border-radius: 12px;
            border: 1px solid rgba(168, 85, 247, 0.1);
        }}
        .font-sample .name {{ font-weight: 600; color: #F59E0B; margin-bottom: 0.5rem; }}
        .font-sample .preview {{ font-size: 1.5rem; margin-bottom: 0.5rem; }}
        .screenshots {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }}
        .screenshots img {{
            width: 100%;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.4);
            transition: transform 0.3s ease;
        }}
        .screenshots img:hover {{ transform: scale(1.02); }}
        .elements {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
        }}
        .element-card {{
            background: rgba(15, 15, 26, 0.6);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(168, 85, 247, 0.1);
            transition: all 0.3s ease;
        }}
        .element-card:hover {{
            border-color: rgba(168, 85, 247, 0.4);
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
        }}
        .element-card img {{ width: 100%; height: 150px; object-fit: cover; }}
        .element-card .content {{ padding: 1rem; }}
        .element-card .name {{ font-weight: 600; margin-bottom: 0.25rem; }}
        .element-card .description {{ color: #94A3B8; font-size: 0.9rem; }}
        .css-code {{
            background: #1E1E32;
            color: #A855F7;
            padding: 1.5rem;
            border-radius: 12px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            border: 1px solid rgba(168, 85, 247, 0.2);
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{board.get('name', 'Mood Board')}</h1>
        <p>{board.get('description', '')}</p>
        <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #64748B;">
            Created: {board.get('created_at', '')[:10]}
        </p>
    </div>
"""

        # Colors section
        if board.get("colors"):
            html += """
    <div class="section">
        <h2>Color Palette</h2>
        <div class="colors">
"""
            for color in board["colors"]:
                html += f"""
            <div class="color-swatch">
                <div class="swatch" style="background: {color.get('hex', '#000')};"></div>
                <div class="hex">{color.get('hex', '')}</div>
                <div class="role">{color.get('role', '')}</div>
            </div>
"""
            html += """
        </div>
    </div>
"""

        # Fonts section
        if board.get("fonts"):
            html += """
    <div class="section">
        <h2>Typography</h2>
        <div class="fonts">
"""
            for font in board["fonts"]:
                html += f"""
            <div class="font-sample">
                <div class="name">{font.get('family', 'Unknown')} ({font.get('role', 'general')})</div>
                <div class="preview" style="font-family: '{font.get('family', 'Inter')}', sans-serif;">
                    The quick brown fox jumps over the lazy dog
                </div>
            </div>
"""
            html += """
        </div>
    </div>
"""

        # Screenshots section
        if board.get("screenshots"):
            html += """
    <div class="section">
        <h2>Inspiration Screenshots</h2>
        <div class="screenshots">
"""
            for screenshot in board["screenshots"]:
                path = screenshot.get("path", "")
                html += f"""
            <img src="file://{path}" alt="Design inspiration">
"""
            html += """
        </div>
    </div>
"""

        # CSS Variables section
        html += """
    <div class="section">
        <h2>Generated CSS Variables</h2>
        <pre class="css-code">:root {
"""
        for color in board.get("colors", []):
            role = color.get("role", "color")
            safe_name = re.sub(r'[^a-z0-9-]', '-', role.lower()) if role else "color"
            html += f"    --color-{safe_name}: {color.get('hex', '#000')};\n"
        html += """}</pre>
    </div>

</body>
</html>
"""

        # Save HTML
        output_path = MOOD_BOARD_DIR / f"mood_board_{board.get('id', 'export')}.html"
        output_path.write_text(html)

        log(f"[MoodBoard] Exported to: {output_path}")
        return str(output_path)

    def list_boards(self) -> list:
        """List all saved mood boards."""
        boards = []
        for f in MOOD_BOARD_DIR.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                boards.append({
                    "file": str(f),
                    "id": data.get("id"),
                    "name": data.get("name"),
                    "created_at": data.get("created_at")
                })
            except:
                pass
        return boards


# ===============================================================================
# DESIGN SYSTEM GENERATOR
# ===============================================================================

class DesignSystemGenerator:
    """
    Generate a complete design system from a mood board.

    Outputs:
    - CSS custom properties
    - Tailwind CSS configuration
    - Figma-compatible design tokens
    """

    def __init__(self, mood_board: dict = None):
        """Initialize with a mood board."""
        self.mood_board = mood_board

    def generate_css_variables(self) -> str:
        """Generate CSS custom properties."""
        if not self.mood_board:
            return "/* No mood board loaded */"

        css = "/* Generated by TinyPM Artistic Director */\n"
        css += f"/* From mood board: {self.mood_board.get('name', 'Unknown')} */\n\n"
        css += ":root {\n"

        # Colors
        css += "    /* Colors */\n"
        for i, color in enumerate(self.mood_board.get("colors", [])):
            role = color.get("role") or f"color-{i+1}"
            safe_name = re.sub(r'[^a-z0-9-]', '-', role.lower())
            css += f"    --color-{safe_name}: {color.get('hex', '#000')};\n"

        # Typography
        css += "\n    /* Typography */\n"
        for i, font in enumerate(self.mood_board.get("fonts", [])):
            role = font.get("role") or f"font-{i+1}"
            safe_name = re.sub(r'[^a-z0-9-]', '-', role.lower())
            css += f"    --font-{safe_name}: '{font.get('family', 'sans-serif')}', sans-serif;\n"

        # Spacing scale
        css += "\n    /* Spacing */\n"
        spacing = [4, 8, 12, 16, 24, 32, 48, 64, 96]
        for i, value in enumerate(spacing):
            css += f"    --space-{i+1}: {value}px;\n"

        # Border radius
        css += "\n    /* Border Radius */\n"
        radii = [("sm", 4), ("md", 8), ("lg", 12), ("xl", 16), ("2xl", 24), ("full", 9999)]
        for name, value in radii:
            css += f"    --radius-{name}: {value}px;\n"

        css += "}\n"
        return css

    def generate_tailwind_config(self) -> str:
        """Generate Tailwind CSS configuration."""
        if not self.mood_board:
            return "{}"

        config = {
            "theme": {
                "extend": {
                    "colors": {},
                    "fontFamily": {}
                }
            }
        }

        # Colors
        for i, color in enumerate(self.mood_board.get("colors", [])):
            name = color.get("role") or f"color{i+1}"
            safe_name = re.sub(r'[^a-z0-9]', '', name.lower())
            config["theme"]["extend"]["colors"][safe_name] = color.get("hex", "#000")

        # Fonts
        for i, font in enumerate(self.mood_board.get("fonts", [])):
            role = font.get("role") or "sans"
            config["theme"]["extend"]["fontFamily"][role] = [font.get("family", "sans-serif"), "sans-serif"]

        return json.dumps(config, indent=2)

    def generate_figma_tokens(self) -> str:
        """Generate Figma-compatible design tokens (JSON)."""
        if not self.mood_board:
            return "{}"

        tokens = {
            "colors": {},
            "typography": {},
            "spacing": {}
        }

        # Colors
        for i, color in enumerate(self.mood_board.get("colors", [])):
            name = color.get("role") or f"color-{i+1}"
            tokens["colors"][name] = {
                "value": color.get("hex", "#000"),
                "type": "color"
            }

        # Typography
        for i, font in enumerate(self.mood_board.get("fonts", [])):
            role = font.get("role") or f"font-{i+1}"
            tokens["typography"][role] = {
                "value": {
                    "fontFamily": font.get("family", "sans-serif")
                },
                "type": "typography"
            }

        # Spacing
        spacing = [4, 8, 12, 16, 24, 32, 48, 64]
        for i, value in enumerate(spacing):
            tokens["spacing"][str(i+1)] = {
                "value": f"{value}px",
                "type": "spacing"
            }

        return json.dumps(tokens, indent=2)

    def save_all(self) -> dict:
        """Save all design system files."""
        if not self.mood_board:
            return {"error": "No mood board loaded"}

        board_id = self.mood_board.get("id", "unknown")
        system_dir = DESIGN_SYSTEM_DIR / board_id
        system_dir.mkdir(exist_ok=True)

        files = {}

        # CSS Variables
        css_path = system_dir / "variables.css"
        css_path.write_text(self.generate_css_variables())
        files["css"] = str(css_path)

        # Tailwind config
        tailwind_path = system_dir / "tailwind.config.js"
        tailwind_content = f"module.exports = {self.generate_tailwind_config()}"
        tailwind_path.write_text(tailwind_content)
        files["tailwind"] = str(tailwind_path)

        # Figma tokens
        tokens_path = system_dir / "tokens.json"
        tokens_path.write_text(self.generate_figma_tokens())
        files["figma_tokens"] = str(tokens_path)

        log(f"[DesignSystem] Saved to: {system_dir}")
        return files


# ===============================================================================
# INTERACTIVE BROWSING SESSION
# ===============================================================================

class InteractiveBrowsingSession:
    """
    Main interactive session for collaborative browsing with AI.

    This is the "browse-with-me" experience where you and the AI
    explore designs together in a visible browser.
    """

    def __init__(self):
        """Initialize the session."""
        self.browser = CollaborativeBrowser(headless=False)
        self.vision = VisionAnalyzer()
        self.mood_board = MoodBoardManager()
        self.running = False

    async def start(self):
        """Start the interactive session."""
        try:
            await self.browser.start()
        except Exception as e:
            print(f"Failed to start browser: {e}")
            print("\nMake sure Playwright is installed:")
            print("  pip install playwright")
            print("  playwright install chromium")
            return

        self.running = True

        # Create a new mood board for this session
        session_name = f"Browsing Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        self.mood_board.create_board(session_name)

        print("\n" + "=" * 70)
        print("ARTISTIC DIRECTOR - Collaborative Browsing Session")
        print("=" * 70)
        print("\nA browser window has opened. I can navigate, scroll, and screenshot")
        print("while you watch. Let's find some design inspiration together!")
        print("\nCommands:")
        print("  go <url>          - Navigate to URL")
        print("  dribbble <query>  - Search Dribbble for designs")
        print("  behance <query>   - Search Behance for designs")
        print("  awwwards <query>  - Search Awwwards for designs")
        print("  scroll [up|down]  - Scroll the page")
        print("  screenshot [name] - Take a screenshot and save to mood board")
        print("  analyze           - Analyze current page design with AI vision")
        print("  colors            - Extract color palette from current view")
        print("  styles            - Extract CSS styles from page")
        print("  save <name>       - Save current design element")
        print("  board             - Show mood board summary")
        print("  export            - Export mood board as HTML")
        print("  quit              - End session")
        print("\n" + "-" * 70)

        while self.running:
            try:
                command = input("\nArtistic Director> ").strip()
                if not command:
                    continue

                await self.handle_command(command)

            except KeyboardInterrupt:
                print("\n\nEnding session...")
                break
            except EOFError:
                break
            except Exception as e:
                print(f"Error: {e}")

        await self.browser.stop()

        # Offer to export
        summary = self.mood_board.get_summary()
        total_items = (summary.get("colors_count", 0) + summary.get("fonts_count", 0) +
                       summary.get("screenshots_count", 0))
        if total_items > 0:
            print(f"\nYour mood board has {total_items} items.")
            export = input("Export as HTML? (y/n): ").strip().lower()
            if export == 'y':
                path = self.mood_board.export_html()
                print(f"Exported to: {path}")

        print("\nSession ended. May your designs be ever magical!")

    async def handle_command(self, command: str):
        """Handle a user command."""
        parts = command.split(maxsplit=1)
        cmd = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""

        if cmd in ["quit", "exit", "q"]:
            self.running = False

        elif cmd == "go":
            if args:
                print(f"Navigating to: {args}")
                await self.browser.navigate(args)
            else:
                print("Usage: go <url>")

        elif cmd == "dribbble":
            if args:
                print(f"Searching Dribbble for: {args}")
                await self.browser.search_dribbble(args)
            else:
                print("Usage: dribbble <search query>")

        elif cmd == "behance":
            if args:
                print(f"Searching Behance for: {args}")
                await self.browser.search_behance(args)
            else:
                print("Usage: behance <search query>")

        elif cmd == "awwwards":
            if args:
                print(f"Searching Awwwards for: {args}")
                await self.browser.search_awwwards(args)
            else:
                print("Usage: awwwards <search query>")

        elif cmd == "scroll":
            direction = args.lower() if args else "down"
            await self.browser.scroll(direction)

        elif cmd == "screenshot":
            name = args if args else None
            print("Taking screenshot...")
            path = await self.browser.screenshot(name)
            if path:
                self.mood_board.add_screenshot(path, self.browser.current_url)
                print(f"Screenshot saved and added to mood board: {path}")

        elif cmd == "analyze":
            print("Analyzing page design with AI vision...")
            print("(This may take a few seconds)")
            analysis = await self.browser.analyze_current_page()

            if "error" in analysis:
                print(f"Error: {analysis['error']}")
            elif "raw_analysis" in analysis:
                print("\n" + analysis["raw_analysis"])
            else:
                print("\n" + json.dumps(analysis, indent=2))

        elif cmd == "colors":
            print("Extracting colors...")
            screenshot = await self.browser.screenshot("colors")
            if screenshot and HAS_COLORTHIEF:
                palette = PaletteExtractor.from_image(screenshot)
                if "palette" in palette:
                    print("\nExtracted Color Palette:")
                    for i, color in enumerate(palette["palette"]):
                        role = ["primary", "secondary", "accent", "background", "text"][i] if i < 5 else f"color-{i+1}"
                        print(f"  {color} - {role}")
                        self.mood_board.add_color(color, role)
                    print("\nColors added to mood board")
            else:
                print("Color extraction requires colorthief: pip install colorthief")

        elif cmd == "styles":
            print("Extracting CSS styles...")
            styles = await self.browser.extract_page_styles()
            print("\nExtracted Styles:")
            print(f"  Colors: {len(styles.get('colors', []))}")
            print(f"  Fonts: {styles.get('fonts', [])[:5]}")
            print(f"  Font Sizes: {styles.get('fontSizes', [])[:5]}")
            if styles.get('cssVariables'):
                print(f"  CSS Variables: {len(styles['cssVariables'])}")

        elif cmd == "save":
            if args:
                print(f"Saving element: {args}")
                screenshot = await self.browser.screenshot(args)
                self.mood_board.add_element(
                    element_type="component",
                    name=args,
                    description=f"Captured from {self.browser.current_url}",
                    screenshot_path=screenshot,
                    source_url=self.browser.current_url
                )
                print(f"Element '{args}' saved to mood board")
            else:
                print("Usage: save <element name>")

        elif cmd == "board":
            summary = self.mood_board.get_summary()
            print("\nMood Board Summary:")
            print(f"  Name: {summary.get('name')}")
            print(f"  Colors: {summary.get('colors_count', 0)}")
            print(f"  Fonts: {summary.get('fonts_count', 0)}")
            print(f"  Elements: {summary.get('elements_count', 0)}")
            print(f"  Screenshots: {summary.get('screenshots_count', 0)}")

        elif cmd == "export":
            print("Exporting mood board...")
            path = self.mood_board.export_html()
            print(f"Exported to: {path}")

        elif cmd == "help":
            print("\nCommands: go, dribbble, behance, awwwards, scroll,")
            print("screenshot, analyze, colors, styles, save, board, export, quit")

        else:
            print(f"Unknown command: {cmd}")
            print("Type 'help' for available commands")


# ===============================================================================
# STATE MANAGEMENT
# ===============================================================================

def load_state() -> dict:
    """Load the artistic director state."""
    if DESIGN_STATE_FILE.exists():
        try:
            return json.loads(DESIGN_STATE_FILE.read_text())
        except:
            pass
    return {
        "themes_generated": 0,
        "characters_generated": 0,
        "screenshots_captured": 0,
        "created_at": datetime.now().isoformat(),
    }


def save_state(state: dict):
    """Save the artistic director state."""
    state["updated_at"] = datetime.now().isoformat()
    DESIGN_STATE_FILE.write_text(json.dumps(state, indent=2))


# ===============================================================================
# CLI COMMANDS
# ===============================================================================

async def cmd_browse_with_me():
    """Start interactive collaborative browsing session."""
    session = InteractiveBrowsingSession()
    await session.start()


async def cmd_browse(url: str):
    """Browse a URL for design inspiration (headless)."""
    researcher = DesignResearcher()
    try:
        await researcher.start()
        result = await researcher.analyze_design(url)

        print("\n" + "=" * 60)
        print("DESIGN ANALYSIS")
        print("=" * 60)
        print(f"URL: {url}")

        if "error" in result:
            print(f"Error: {result['error']}")
        else:
            analysis = result.get("analysis", {})

            print(f"\nColors found: {len(analysis.get('colors', []))}")
            for c in analysis.get("colors", [])[:5]:
                print(f"  - {c}")

            print(f"\nFonts: {', '.join(analysis.get('fonts', [])[:5])}")
            print(f"Font sizes: {', '.join(analysis.get('fontSizes', [])[:5])}")

            if result.get("screenshot", {}).get("success"):
                print(f"\nScreenshot: {result['screenshot']['filepath']}")

            if result.get("palette"):
                print(f"\nExtracted palette: {result['palette'].get('palette', [])}")

        state = load_state()
        state["screenshots_captured"] = state.get("screenshots_captured", 0) + 1
        save_state(state)

    finally:
        await researcher.stop()


def cmd_analyze_image(image_path: str, analysis_type: str = "general"):
    """Analyze a design image using AI vision."""
    if not Path(image_path).exists():
        print(f"Error: File not found: {image_path}")
        return

    vision = VisionAnalyzer()

    print(f"\nAnalyzing: {image_path}")
    print(f"Analysis type: {analysis_type}")
    print("-" * 40)

    result = vision.analyze_design(image_path, analysis_type)

    if "error" in result:
        print(f"Error: {result['error']}")
    elif "raw_analysis" in result:
        print(result["raw_analysis"])
    else:
        print(json.dumps(result, indent=2))


async def cmd_extract_styles(url: str):
    """Extract styles from a URL."""
    browser = CollaborativeBrowser(headless=True)

    try:
        await browser.start()
        await browser.navigate(url)

        print(f"\nExtracting styles from: {url}")
        print("-" * 40)

        styles = await browser.extract_page_styles()
        print(json.dumps(styles, indent=2))

    finally:
        await browser.stop()


def cmd_mood_board():
    """Show mood board summary or manage mood boards."""
    manager = MoodBoardManager()
    summary = manager.get_summary()

    if "error" in summary:
        print("\nNo mood board loaded.")
        print("Start a browsing session with: python3 artistic_director.py browse-with-me")
        return

    print("\nCurrent Mood Board")
    print("=" * 40)
    for key, value in summary.items():
        print(f"  {key}: {value}")

    print("\nSaved Mood Boards:")
    boards = manager.list_boards()
    for board in boards:
        print(f"  - {board.get('name')} ({board.get('id')})")


def cmd_design_system():
    """Generate design system from mood board."""
    manager = MoodBoardManager()

    if not manager.current_board:
        print("No mood board loaded. Start a browsing session first.")
        return

    generator = DesignSystemGenerator(manager.current_board)
    files = generator.save_all()

    if "error" in files:
        print(f"Error: {files['error']}")
        return

    print("\nGenerated Design System Files:")
    print("=" * 40)
    for name, path in files.items():
        print(f"  {name}: {path}")


def cmd_generate_theme(name: str = None):
    """Generate a new CSS theme."""
    generator = ThemeGenerator()

    name = name or f"tinypm_wizard_{datetime.now().strftime('%Y%m%d')}"
    result = generator.generate_full_theme(name)

    print("\n" + "=" * 60)
    print("THEME GENERATED")
    print("=" * 60)
    print(f"Name: {result['name']}")
    print(f"CSS file: {result['css_file']}")
    print(f"Metadata: {result['metadata_file']}")
    print(f"\nCSS size: {len(result['css'])} characters")

    state = load_state()
    state["themes_generated"] = state.get("themes_generated", 0) + 1
    save_state(state)


def cmd_design_character(name: str):
    """Design a new character."""
    generator = CharacterGenerator()

    print(f"\nGenerating character: {name}...")
    spec = generator.generate_character_spec(name)

    filepath = generator.save_character(spec)

    print("\n" + "=" * 60)
    print("CHARACTER GENERATED")
    print("=" * 60)
    print(f"Name: {spec.get('name')}")
    print(f"Title: {spec.get('title')}")
    print(f"Description: {spec.get('description')}")
    print(f"Colors: {spec.get('colors')}")
    print(f"Symbol: {spec.get('symbol')}")
    print(f"Catchphrase: {spec.get('catchphrase')}")
    print(f"\nSaved to: {filepath}")

    # Generate icon
    if spec.get("symbol") in IconGenerator.list_icons():
        icon_path = IconGenerator.save_icon(spec["symbol"], spec.get("colors"))
        print(f"Icon saved: {icon_path}")

    state = load_state()
    state["characters_generated"] = state.get("characters_generated", 0) + 1
    save_state(state)


def cmd_chat():
    """Start interactive design chat."""
    chat = DesignChat()

    print("\n" + "=" * 60)
    print("ARTISTIC DIRECTOR - Design Chat")
    print("=" * 60)
    print("I am the Artistic Director, your creative AI partner.")
    print("Ask me about colors, themes, characters, effects, or UI/UX.")
    print("Type 'quit' to exit.\n")

    while True:
        try:
            user_input = input("You: ").strip()
            if user_input.lower() in ["quit", "exit", "q"]:
                print("\nMay your designs be ever magical!")
                break

            if not user_input:
                continue

            response = chat.chat(user_input)
            print(f"\nArtistic Director: {response}\n")

        except KeyboardInterrupt:
            print("\n\nMay your designs be ever magical!")
            break
        except EOFError:
            break


def cmd_status():
    """Show design system status."""
    state = load_state()

    # Count assets
    themes = len(list(THEMES_DIR.glob("*.css")))
    characters = len(list(CHARACTERS_DIR.glob("*.json")))
    icons = len(list(ICONS_DIR.glob("*.svg")))
    screenshots = len(list(SCREENSHOTS_DIR.glob("*.png")))
    mood_boards = len(list(MOOD_BOARD_DIR.glob("*.json")))
    design_systems = len(list(DESIGN_SYSTEM_DIR.glob("*")))

    # Check for current mood board
    mood_board_manager = MoodBoardManager()
    current_board = mood_board_manager.get_summary()

    print("\n" + "=" * 70)
    print("ARTISTIC DIRECTOR v2.0 - Visual Design AI with Collaborative Browsing")
    print("=" * 70)
    print(f"""
NEW IN v2.0:
  - VISION: Analyze screenshots with Claude's vision API
  - COLLABORATIVE BROWSING: Visible browser for design research
  - MOOD BOARDS: Build visual collections during sessions
  - DESIGN SYSTEMS: Generate CSS, Tailwind, Figma tokens

Design Assets:
  - Themes: {themes}
  - Characters: {characters}
  - Icons: {icons}
  - Screenshots: {screenshots}
  - Mood Boards: {mood_boards}
  - Design Systems: {design_systems}

Session Stats:
  - Themes generated: {state.get('themes_generated', 0)}
  - Characters generated: {state.get('characters_generated', 0)}
  - Screenshots captured: {state.get('screenshots_captured', 0)}

Current Mood Board: {current_board.get('name', 'None') if 'name' in current_board else 'None'}
  - Colors: {current_board.get('colors_count', 0)}
  - Fonts: {current_board.get('fonts_count', 0)}
  - Elements: {current_board.get('elements_count', 0)}
  - Screenshots: {current_board.get('screenshots_count', 0)}

Design System:
  - Colors: {len(TinyPMDesignSystem.COLORS)}
  - Animations: {len(TinyPMDesignSystem.ANIMATIONS)}
  - Character archetypes: {len(TinyPMDesignSystem.CHARACTERS)}

Available Icons: {', '.join(IconGenerator.list_icons())}

Dependencies:
  - PIL: {'INSTALLED' if HAS_PIL else 'MISSING - pip install pillow'}
  - ColorThief: {'INSTALLED' if HAS_COLORTHIEF else 'MISSING - pip install colorthief'}
  - Playwright: {'INSTALLED' if HAS_PLAYWRIGHT else 'MISSING - pip install playwright && playwright install chromium'}
  - Anthropic: {'INSTALLED' if HAS_ANTHROPIC else 'MISSING - pip install anthropic'}
  - OpenAI: {'INSTALLED' if HAS_OPENAI else 'MISSING - pip install openai'}
  - cssutils: {'INSTALLED' if HAS_CSSUTILS else 'MISSING - pip install cssutils'}

Quick Start:
  python3 artistic_director.py browse-with-me    # Start visual browsing
  python3 artistic_director.py analyze <image>   # Analyze design with AI
  python3 artistic_director.py chat              # Interactive design chat
""")


def cmd_apply_style(component: str):
    """Show how to apply style to a component."""
    styles = {
        "card": """
/* Magical Card Style */
.card {
    background: var(--color-bg-card);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    border: 1px solid rgba(168, 85, 247, 0.1);
    box-shadow: var(--shadow-lg);
    transition: all 0.3s ease;
}

.card:hover {
    box-shadow: 0 0 30px rgba(168, 85, 247, 0.4);
    transform: translateY(-4px);
    border-color: rgba(168, 85, 247, 0.3);
}
""",
        "button": """
/* Magical Button Style */
.btn-magical {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(107, 33, 168, 0.4);
    transition: all 0.3s ease;
}

.btn-magical:hover {
    box-shadow: 0 0 30px rgba(168, 85, 247, 0.6);
    transform: translateY(-2px);
}

.btn-magical::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    animation: shimmer 2s infinite;
}
""",
        "input": """
/* Magical Input Style */
.input-magical {
    background: var(--color-bg-dark);
    border: 1px solid rgba(168, 85, 247, 0.2);
    border-radius: 8px;
    padding: 12px 16px;
    color: white;
    font-size: 16px;
    transition: all 0.2s ease;
}

.input-magical:focus {
    outline: none;
    border-color: var(--color-primary-light);
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
}

.input-magical::placeholder {
    color: var(--color-text-muted);
}
""",
        "heading": """
/* Magical Heading Style */
.heading-magical {
    font-family: 'Cinzel Decorative', serif;
    background: linear-gradient(135deg, #F59E0B 0%, #A855F7 50%, #06B6D4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 0 30px rgba(168, 85, 247, 0.3);
}
""",
    }

    component_lower = component.lower()

    if component_lower in styles:
        print(f"\n{styles[component_lower]}")
    else:
        print(f"\nAvailable components: {', '.join(styles.keys())}")
        print("Or run 'generate-theme' for a complete theme file.")


# ===============================================================================
# API HANDLER (for web_server.py integration)
# ===============================================================================

class ArtisticDirectorAPI:
    """API handlers for web integration."""

    def __init__(self):
        self.theme_generator = ThemeGenerator()
        self.character_generator = CharacterGenerator()
        self.design_chat = DesignChat()
        self.vision_analyzer = VisionAnalyzer()
        self.mood_board_manager = MoodBoardManager()

    def handle_request(self, endpoint: str, data: dict) -> dict:
        """Handle an API request."""
        handlers = {
            "theme": self._handle_theme,
            "character": self._handle_character,
            "chat": self._handle_chat,
            "palette": self._handle_palette,
            "assets": self._handle_assets,
            "icons": self._handle_icons,
            "effects": self._handle_effects,
            "accessibility": self._handle_accessibility,
            "vision": self._handle_vision,
            "mood-board": self._handle_mood_board,
            "design-system": self._handle_design_system,
        }

        handler = handlers.get(endpoint)
        if handler:
            return handler(data)

        return {"error": f"Unknown endpoint: {endpoint}"}

    def _handle_theme(self, data: dict) -> dict:
        """Generate a theme."""
        name = data.get("name", f"custom_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        colors = data.get("colors")

        result = self.theme_generator.generate_full_theme(name, colors)
        return {
            "success": True,
            "theme": result,
        }

    def _handle_character(self, data: dict) -> dict:
        """Generate a character."""
        name = data.get("name", "Unknown")
        role = data.get("role")
        style = data.get("style", "wizard")

        spec = self.character_generator.generate_character_spec(name, role, style)
        filepath = self.character_generator.save_character(spec)

        return {
            "success": True,
            "character": spec,
            "filepath": filepath,
        }

    def _handle_chat(self, data: dict) -> dict:
        """Handle a design chat message."""
        message = data.get("message", "")

        if not message:
            return {"error": "No message provided"}

        response = self.design_chat.chat(message)
        return {
            "success": True,
            "response": response,
        }

    def _handle_palette(self, data: dict) -> dict:
        """Extract a color palette."""
        image_path = data.get("image_path")
        image_url = data.get("url")

        if image_path:
            result = PaletteExtractor.from_image(image_path)
        elif image_url:
            result = PaletteExtractor.from_url(image_url)
        else:
            return {"error": "Provide image_path or url"}

        return result

    def _handle_assets(self, data: dict) -> dict:
        """List all design assets."""
        return {
            "themes": [str(f) for f in THEMES_DIR.glob("*.css")],
            "characters": [str(f) for f in CHARACTERS_DIR.glob("*.json")],
            "icons": [str(f) for f in ICONS_DIR.glob("*.svg")],
            "screenshots": [str(f) for f in SCREENSHOTS_DIR.glob("*.png")],
        }

    def _handle_icons(self, data: dict) -> dict:
        """Generate or list icons."""
        action = data.get("action", "list")

        if action == "list":
            return {"icons": IconGenerator.list_icons()}

        if action == "generate":
            icon_name = data.get("name")
            colors = data.get("colors")

            if not icon_name:
                return {"error": "Provide icon name"}

            svg = IconGenerator.generate(icon_name, colors)
            filepath = IconGenerator.save_icon(icon_name, colors)

            return {
                "success": True,
                "svg": svg,
                "filepath": filepath,
            }

        return {"error": "Unknown action"}

    def _handle_effects(self, data: dict) -> dict:
        """Generate CSS effects."""
        effect_type = data.get("type", "gradient")

        if effect_type == "gradient":
            colors = data.get("colors", ["#6B21A8", "#F59E0B"])
            direction = data.get("direction", "135deg")
            grad_type = data.get("gradient_type", "linear")
            return {"css": EffectGenerator.gradient(colors, direction, grad_type)}

        if effect_type == "glow":
            color = data.get("color", "#A855F7")
            size = data.get("size", 20)
            return {"css": EffectGenerator.glow(color, size)}

        if effect_type == "glass":
            blur = data.get("blur", 10)
            opacity = data.get("opacity", 0.2)
            return {"css": EffectGenerator.glass_effect(blur, opacity)}

        if effect_type == "neon":
            color = data.get("color", "#A855F7")
            return {"css": EffectGenerator.neon_border(color)}

        return {"error": "Unknown effect type"}

    def _handle_accessibility(self, data: dict) -> dict:
        """Run accessibility checks."""
        colors = data.get("colors", TinyPMDesignSystem.COLORS)
        return AccessibilityChecker.generate_accessibility_report(colors)

    def _handle_vision(self, data: dict) -> dict:
        """Analyze images with AI vision."""
        action = data.get("action", "analyze")

        if action == "analyze":
            image_path = data.get("image_path")
            analysis_type = data.get("type", "general")

            if not image_path:
                return {"error": "Provide image_path"}

            return self.vision_analyzer.analyze_design(image_path, analysis_type)

        if action == "compare":
            image1 = data.get("image1")
            image2 = data.get("image2")

            if not image1 or not image2:
                return {"error": "Provide image1 and image2"}

            return self.vision_analyzer.compare_designs(image1, image2)

        if action == "recreate":
            image_path = data.get("image_path")

            if not image_path:
                return {"error": "Provide image_path"}

            return self.vision_analyzer.describe_for_recreation(image_path)

        return {"error": "Unknown action. Use: analyze, compare, recreate"}

    def _handle_mood_board(self, data: dict) -> dict:
        """Mood board operations."""
        action = data.get("action", "summary")

        if action == "summary":
            return self.mood_board_manager.get_summary()

        if action == "create":
            name = data.get("name", "New Mood Board")
            description = data.get("description", "")
            return self.mood_board_manager.create_board(name, description)

        if action == "add_color":
            hex_color = data.get("hex")
            role = data.get("role", "")
            if not hex_color:
                return {"error": "Provide hex color"}
            self.mood_board_manager.add_color(hex_color, role)
            return {"success": True}

        if action == "add_font":
            family = data.get("family")
            role = data.get("role", "")
            if not family:
                return {"error": "Provide font family"}
            self.mood_board_manager.add_font(family, role)
            return {"success": True}

        if action == "export":
            path = self.mood_board_manager.export_html()
            return {"success": True, "path": path}

        if action == "list":
            return {"boards": self.mood_board_manager.list_boards()}

        return {"error": "Unknown action"}

    def _handle_design_system(self, data: dict) -> dict:
        """Generate design system from mood board."""
        if not self.mood_board_manager.current_board:
            return {"error": "No mood board loaded"}

        generator = DesignSystemGenerator(self.mood_board_manager.current_board)

        output_type = data.get("type", "all")

        if output_type == "css":
            return {"css": generator.generate_css_variables()}
        if output_type == "tailwind":
            return {"tailwind": generator.generate_tailwind_config()}
        if output_type == "tokens":
            return {"tokens": generator.generate_figma_tokens()}
        if output_type == "all":
            return generator.save_all()

        return {"error": "Unknown type. Use: css, tailwind, tokens, all"}


# ===============================================================================
# MAIN
# ===============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Artistic Director v2.0 - Visual Design AI with Collaborative Browsing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python3 artistic_director.py browse-with-me              # Interactive visual browsing
    python3 artistic_director.py browse https://dribbble.com # Headless design research
    python3 artistic_director.py analyze design.png          # Analyze image with AI vision
    python3 artistic_director.py analyze design.png --type colors  # Extract colors
    python3 artistic_director.py extract https://example.com # Extract CSS from URL
    python3 artistic_director.py mood-board                  # View mood board
    python3 artistic_director.py design-system               # Generate design system
    python3 artistic_director.py generate-theme              # Generate CSS theme
    python3 artistic_director.py design-character "Wizard"   # Generate character
    python3 artistic_director.py chat                        # Interactive design chat
    python3 artistic_director.py status                      # Show status
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Browse with me (interactive)
    subparsers.add_parser("browse-with-me", help="Interactive collaborative browsing session")

    # Browse command (headless)
    browse_parser = subparsers.add_parser("browse", help="Capture and analyze a webpage (headless)")
    browse_parser.add_argument("url", help="URL to analyze")

    # Analyze image with AI vision
    analyze_parser = subparsers.add_parser("analyze", help="Analyze a design image with AI vision")
    analyze_parser.add_argument("image", help="Path to image file")
    analyze_parser.add_argument(
        "--type",
        choices=["general", "colors", "typography", "layout", "components", "accessibility", "style_guide"],
        default="general",
        help="Type of analysis"
    )

    # Extract styles from URL
    extract_parser = subparsers.add_parser("extract", help="Extract CSS styles from a URL")
    extract_parser.add_argument("url", help="URL to extract styles from")

    # Mood board
    subparsers.add_parser("mood-board", help="View mood board summary")

    # Design system
    subparsers.add_parser("design-system", help="Generate design system from mood board")

    # Generate theme command
    theme_parser = subparsers.add_parser("generate-theme", help="Generate a CSS theme")
    theme_parser.add_argument("--name", help="Theme name", default=None)

    # Design character command
    char_parser = subparsers.add_parser("design-character", help="Design a character")
    char_parser.add_argument("name", help="Character name")

    # Apply style command
    style_parser = subparsers.add_parser("apply-style", help="Show style for a component")
    style_parser.add_argument("component", help="Component name (card, button, input, heading)")

    # Chat command
    subparsers.add_parser("chat", help="Interactive design chat")

    # Status command
    subparsers.add_parser("status", help="Show design system status")

    # Compare designs
    compare_parser = subparsers.add_parser("compare", help="Compare two design images")
    compare_parser.add_argument("image1", help="First image path")
    compare_parser.add_argument("image2", help="Second image path")

    args = parser.parse_args()

    if args.command == "browse-with-me":
        asyncio.run(cmd_browse_with_me())
    elif args.command == "browse":
        asyncio.run(cmd_browse(args.url))
    elif args.command == "analyze":
        cmd_analyze_image(args.image, args.type)
    elif args.command == "extract":
        asyncio.run(cmd_extract_styles(args.url))
    elif args.command == "mood-board":
        cmd_mood_board()
    elif args.command == "design-system":
        cmd_design_system()
    elif args.command == "generate-theme":
        cmd_generate_theme(args.name)
    elif args.command == "design-character":
        cmd_design_character(args.name)
    elif args.command == "apply-style":
        cmd_apply_style(args.component)
    elif args.command == "chat":
        cmd_chat()
    elif args.command == "status":
        cmd_status()
    elif args.command == "compare":
        vision = VisionAnalyzer()
        result = vision.compare_designs(args.image1, args.image2)
        if "error" in result:
            print(f"Error: {result['error']}")
        else:
            print(json.dumps(result, indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
