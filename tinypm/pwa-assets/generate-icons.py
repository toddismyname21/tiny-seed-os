#!/usr/bin/env python3
"""
PWA Icon Generator for TinyPM
Generates all required PWA icons with the seedling design
"""

import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("PIL not installed. Run: pip install Pillow")

# Icon sizes to generate
ICONS = {
    'icon-192.png': (192, 192, False),
    'icon-512.png': (512, 512, False),
    'icon-192-maskable.png': (192, 192, True),
    'icon-512-maskable.png': (512, 512, True),
    'favicon-32x32.png': (32, 32, False),
    'apple-touch-icon-180.png': (180, 180, False),
    'shortcut-dashboard.png': (96, 96, False),
    'shortcut-task.png': (96, 96, False),
    'shortcut-project.png': (96, 96, False),
    'badge-72.png': (72, 72, False),
}

# Colors
ACCENT = '#6366f1'
ACCENT_LIGHT = '#818cf8'
PURPLE = '#a855f7'
BG_DARK = '#0f1117'
GREEN = '#22c55e'
WHITE = '#ffffff'

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_gradient_background(draw, size, is_maskable=False):
    """Create a gradient background from accent to purple"""
    width, height = size

    # For maskable icons, add padding (safe zone is 80% of icon)
    if is_maskable:
        padding = int(width * 0.1)  # 10% padding on each side
    else:
        padding = 0

    # Create gradient
    for y in range(height):
        # Calculate color interpolation
        ratio = y / height
        r = int(hex_to_rgb(ACCENT)[0] * (1 - ratio) + hex_to_rgb(PURPLE)[0] * ratio)
        g = int(hex_to_rgb(ACCENT)[1] * (1 - ratio) + hex_to_rgb(PURPLE)[1] * ratio)
        b = int(hex_to_rgb(ACCENT)[2] * (1 - ratio) + hex_to_rgb(PURPLE)[2] * ratio)

        draw.line([(0, y), (width, y)], fill=(r, g, b))

def draw_seedling(draw, size, is_maskable=False):
    """Draw the seedling icon"""
    width, height = size

    # Calculate scale and position
    if is_maskable:
        # Safe zone is 80% for maskable icons
        scale = min(width, height) * 0.4
        center_x = width // 2
        center_y = height // 2
    else:
        scale = min(width, height) * 0.5
        center_x = width // 2
        center_y = height // 2

    # Draw stem
    stem_width = max(2, int(scale * 0.08))
    stem_height = int(scale * 0.5)
    stem_x = center_x
    stem_y1 = center_y
    stem_y2 = center_y + stem_height

    draw.line([(stem_x, stem_y1), (stem_x, stem_y2)], fill=WHITE, width=stem_width)

    # Draw left leaf
    leaf_size = int(scale * 0.35)
    left_leaf_x = center_x - leaf_size
    left_leaf_y = center_y - leaf_size // 3

    # Ellipse for leaf
    draw.ellipse([
        (left_leaf_x - leaf_size//2, left_leaf_y - leaf_size//4),
        (center_x, left_leaf_y + leaf_size//4)
    ], fill=WHITE)

    # Draw right leaf
    right_leaf_x = center_x + leaf_size
    right_leaf_y = center_y - leaf_size // 3

    draw.ellipse([
        (center_x, right_leaf_y - leaf_size//4),
        (right_leaf_x + leaf_size//2, right_leaf_y + leaf_size//4)
    ], fill=WHITE)

    # Draw center small leaf/bud
    bud_size = int(scale * 0.2)
    draw.ellipse([
        (center_x - bud_size//2, center_y - stem_height//2 - bud_size),
        (center_x + bud_size//2, center_y - stem_height//2)
    ], fill=WHITE)

def draw_seedling_emoji(draw, size, is_maskable=False):
    """Draw a simple but elegant seedling design"""
    width, height = size

    # Calculate dimensions
    if is_maskable:
        # Safe zone for maskable: content in center 80%
        margin = int(width * 0.15)
        content_size = width - (margin * 2)
    else:
        margin = int(width * 0.12)
        content_size = width - (margin * 2)

    center_x = width // 2
    center_y = height // 2

    stroke_width = max(2, int(content_size * 0.06))

    # Calculate positions relative to content area
    stem_bottom = center_y + int(content_size * 0.25)
    stem_top = center_y - int(content_size * 0.1)

    # Draw stem (vertical line)
    draw.line([
        (center_x, stem_top),
        (center_x, stem_bottom)
    ], fill=WHITE, width=stroke_width)

    # Draw ground/soil arc at bottom
    soil_y = stem_bottom - stroke_width
    soil_width = int(content_size * 0.35)
    draw.arc([
        (center_x - soil_width, soil_y - int(content_size * 0.08)),
        (center_x + soil_width, soil_y + int(content_size * 0.12))
    ], start=0, end=180, fill=WHITE, width=stroke_width)

    # Draw left leaf - curved arc
    leaf_top = center_y - int(content_size * 0.25)
    leaf_curve = int(content_size * 0.2)

    # Left leaf
    draw.arc([
        (center_x - leaf_curve * 2, leaf_top - leaf_curve),
        (center_x + stroke_width, leaf_top + leaf_curve)
    ], start=270, end=360, fill=WHITE, width=stroke_width)

    # Right leaf
    draw.arc([
        (center_x - stroke_width, leaf_top - leaf_curve),
        (center_x + leaf_curve * 2, leaf_top + leaf_curve)
    ], start=180, end=270, fill=WHITE, width=stroke_width)

def create_icon(filename, size, is_maskable):
    """Create a single icon"""
    width, height = size

    # Create image with gradient background
    img = Image.new('RGB', (width, height), hex_to_rgb(ACCENT))
    draw = ImageDraw.Draw(img)

    # Draw gradient background
    create_gradient_background(draw, (width, height), is_maskable)

    # Draw seedling
    draw_seedling_emoji(draw, (width, height), is_maskable)

    # Add rounded corners for non-maskable icons
    if not is_maskable and width >= 64:
        # Create a mask for rounded corners
        mask = Image.new('L', (width, height), 0)
        mask_draw = ImageDraw.Draw(mask)
        radius = int(width * 0.18)  # 18% corner radius
        mask_draw.rounded_rectangle([(0, 0), (width-1, height-1)], radius=radius, fill=255)

        # Apply mask
        output = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        output.paste(img, (0, 0))
        output.putalpha(mask)
        return output

    return img

def create_shortcut_icon(filename, icon_type):
    """Create shortcut icons with specific designs"""
    size = 96
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded background
    radius = int(size * 0.2)
    draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=radius, fill=hex_to_rgb(ACCENT))

    center = size // 2
    stroke = 3

    if icon_type == 'dashboard':
        # Grid icon
        box_size = 20
        gap = 6
        start = center - box_size - gap // 2

        # Four boxes
        for row in range(2):
            for col in range(2):
                x = start + col * (box_size + gap)
                y = start + row * (box_size + gap)
                draw.rounded_rectangle(
                    [(x, y), (x + box_size, y + box_size)],
                    radius=4, fill=WHITE
                )

    elif icon_type == 'task':
        # Checkbox with check
        box_size = 36
        box_x = center - box_size // 2
        box_y = center - box_size // 2

        draw.rounded_rectangle(
            [(box_x, box_y), (box_x + box_size, box_y + box_size)],
            radius=6, outline=WHITE, width=stroke
        )

        # Checkmark
        check_points = [
            (box_x + 10, center),
            (center - 2, box_y + box_size - 12),
            (box_x + box_size - 8, box_y + 12)
        ]
        draw.line(check_points, fill=WHITE, width=stroke)

    elif icon_type == 'project':
        # Folder icon
        folder_width = 44
        folder_height = 32
        tab_width = 16
        tab_height = 8

        x = center - folder_width // 2
        y = center - folder_height // 2 + 4

        # Main folder body
        draw.rounded_rectangle(
            [(x, y), (x + folder_width, y + folder_height)],
            radius=4, fill=WHITE
        )

        # Folder tab
        draw.rounded_rectangle(
            [(x, y - tab_height + 2), (x + tab_width, y + 4)],
            radius=3, fill=WHITE
        )

    return img

def create_badge_icon():
    """Create notification badge icon"""
    size = 72
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Simple seedling on transparent background
    draw_seedling_emoji(draw, (size, size), False)

    return img

def main():
    if not HAS_PIL:
        print("ERROR: Pillow is required. Install with: pip install Pillow")
        print("\nAlternatively, use the SVG fallbacks in this directory.")
        return

    script_dir = Path(__file__).parent

    print("Generating TinyPM PWA icons...")

    for filename, (width, height, is_maskable) in ICONS.items():
        filepath = script_dir / filename

        if 'shortcut' in filename:
            # Special handling for shortcut icons
            if 'dashboard' in filename:
                img = create_shortcut_icon(filename, 'dashboard')
            elif 'task' in filename:
                img = create_shortcut_icon(filename, 'task')
            elif 'project' in filename:
                img = create_shortcut_icon(filename, 'project')
        elif 'badge' in filename:
            img = create_badge_icon()
        else:
            img = create_icon(filename, (width, height), is_maskable)

        img.save(filepath, 'PNG')
        print(f"  Created: {filename} ({width}x{height})")

    print("\nAll icons generated successfully!")
    print(f"Location: {script_dir}")

if __name__ == '__main__':
    main()
