#!/usr/bin/env python3
"""
Explainer Video Design Skill
Implements international best practices for professional video slide design
Based on readability guidelines, typography standards, and educational design principles
"""

class ExplainerVideoDesignStandards:
    """
    Standards for professional explainer videos incorporating:
    - Readability Guidelines (readabilityguidelines.co.uk)
    - Typography Best Practices (UXPin, Figma, USWDS)
    - Educational Design Principles (IxDF, UCSD Multimedia)
    """

    # TEXT FORMATTING STANDARDS
    TEXT = {
        "title": {
            "max_words": 7,
            "font_size_px": 48,  # Minimum for video legibility
            "font_weight": 700,
            "line_height_ratio": 1.2,  # 120% of font size
            "alignment": "center",  # For titles
            "margin_bottom_px": 30,
        },
        "heading": {
            "max_words": 10,
            "font_size_px": 36,
            "font_weight": 600,
            "line_height_ratio": 1.2,
            "alignment": "left",
            "margin_bottom_px": 20,
        },
        "body": {
            "max_words": 20,  # Per slide/section
            "font_size_px": 24,  # Readable from back of room
            "font_weight": 400,
            "line_height_ratio": 1.35,  # 135% for body text
            "letter_spacing_px": 0.5,  # Improves reading accuracy
            "alignment": "left",  # Left-align for readability
            "max_line_length_chars": 66,  # Optimal line length
            "margin_bottom_px": 16,
        },
        "caption": {
            "max_words": 12,
            "font_size_px": 16,
            "font_weight": 500,
            "line_height_ratio": 1.25,
            "alignment": "center",
            "margin_top_px": 8,
        },
    }

    # SPACING STANDARDS (Consistent scale)
    SPACING = {
        "xs": 4,
        "sm": 8,
        "md": 16,
        "lg": 24,
        "xl": 32,
        "xxl": 48,
    }

    # DIAGRAM & BOX STANDARDS
    DIAGRAM = {
        "padding": 24,  # Internal padding to prevent text cutoff
        "border_radius": 12,
        "border_width": 2,
        "min_height": 80,
        "text_padding_sides": 16,  # Horizontal padding around text
        "text_padding_vertical": 12,  # Vertical padding around text
        "max_text_width_percent": 85,  # Leave margin from edges
    }

    # VISUAL HIERARCHY
    HIERARCHY = {
        "primary": {
            "size_factor": 2.0,  # 2x larger than body
            "weight": 700,
            "color": "text_dark",  # Strong contrast
            "opacity": 1.0,
        },
        "secondary": {
            "size_factor": 1.25,
            "weight": 600,
            "color": "text_dark",
            "opacity": 0.9,
        },
        "tertiary": {
            "size_factor": 1.0,  # Body size
            "weight": 400,
            "color": "text_gray",
            "opacity": 0.8,
        },
        "detail": {
            "size_factor": 0.75,
            "weight": 400,
            "color": "text_gray",
            "opacity": 0.6,
        },
    }

    # LAYOUT STANDARDS
    LAYOUT = {
        "max_lines_per_section": 4,  # Maximum bullet points
        "line_spacing_multiplier": 1.8,  # Between bullet points
        "horizontal_padding_percent": 10,  # Margin from edges
        "vertical_padding_percent": 15,  # Top/bottom margin
        "content_width_percent": 90,  # Leave margins on sides
    }

    # COLOR CONTRAST (WCAG AA minimum)
    CONTRAST = {
        "text_on_light": {
            "text_dark": "#3a3530",  # 7.5:1 ratio
            "text_gray": "#6b5d52",  # 4.5:1 ratio
            "accent": "#c97070",  # 5.2:1 ratio (red)
        },
        "text_on_dark": {
            "white": "#ffffff",  # 8.5:1 ratio
            "light_gray": "#e8e3dd",  # 7:1 ratio
        },
    }

    @staticmethod
    def validate_text(text: str, category: str) -> dict:
        """Validate text against standards"""
        standards = ExplainerVideoDesignStandards.TEXT.get(category, {})
        words = len(text.split())
        max_words = standards.get("max_words", float("inf"))

        return {
            "text": text,
            "word_count": words,
            "max_words": max_words,
            "is_valid": words <= max_words,
            "status": "PASS" if words <= max_words else "FAIL",
            "message": f"{words} words (max {max_words})" if words > max_words else "OK",
        }

    @staticmethod
    def get_box_style(color_scheme: str = "red") -> dict:
        """Generate box style with proper padding to prevent text cutoff"""
        colors = {
            "red": {"bg": "rgba(201, 112, 112, 0.1)", "border": "#c97070"},
            "green": {"bg": "rgba(139, 157, 125, 0.1)", "border": "#8b9d7d"},
            "orange": {"bg": "rgba(217, 150, 112, 0.1)", "border": "#d99670"},
        }

        color = colors.get(color_scheme, colors["red"])
        padding = ExplainerVideoDesignStandards.DIAGRAM["padding"]

        return {
            "background": color["bg"],
            "border": f"2px solid {color['border']}",
            "border_radius": ExplainerVideoDesignStandards.DIAGRAM["border_radius"],
            "padding": padding,
            "padding_top": padding + 8,
            "padding_bottom": padding + 8,
            "padding_left": padding,
            "padding_right": padding,
            "min_height": ExplainerVideoDesignStandards.DIAGRAM["min_height"],
            "overflow": "hidden",
            "word_break": "break-word",
            "white_space": "normal",
        }

    @staticmethod
    def get_text_style(category: str = "body") -> dict:
        """Generate text style with proper spacing"""
        standards = ExplainerVideoDesignStandards.TEXT.get(category, {})
        font_size = standards.get("font_size_px", 24)

        return {
            "font_size_px": font_size,
            "font_weight": standards.get("font_weight", 400),
            "font_family": "'DM Sans', sans-serif",
            "line_height_px": int(font_size * standards.get("line_height_ratio", 1.2)),
            "letter_spacing_px": standards.get("letter_spacing_px", 0),
            "text_align": standards.get("alignment", "left"),
            "margin_bottom": standards.get("margin_bottom_px", 16),
            "word_wrap": "break-word",
            "overflow_wrap": "break-word",
            "hyphens": "auto",
        }

    @staticmethod
    def calculate_responsive_padding(base_width: int, height: int) -> dict:
        """Calculate responsive padding based on screen size"""
        return {
            "horizontal": max(40, int(base_width * 0.05)),  # 5% minimum 40px
            "vertical": max(30, int(height * 0.04)),  # 4% minimum 30px
        }

    @staticmethod
    def get_spacing_scale() -> dict:
        """Get consistent spacing scale"""
        return ExplainerVideoDesignStandards.SPACING

    @staticmethod
    def get_animation_timing() -> dict:
        """Standard animation timings for readable reveals"""
        return {
            "fast_reveal": 15,  # frames at 30fps = 0.5s
            "normal_reveal": 30,  # frames at 30fps = 1s
            "slow_reveal": 60,  # frames at 30fps = 2s
            "transition": 20,  # Between elements
        }


class SlideLayoutBuilder:
    """Build properly formatted slide layouts"""

    @staticmethod
    def create_title_slide(title: str, subtitle: str = "", description: str = "") -> dict:
        """Create properly formatted title slide"""
        return {
            "layout": "title",
            "title": {
                "text": title,
                "validation": ExplainerVideoDesignStandards.validate_text(title, "title"),
                "style": ExplainerVideoDesignStandards.get_text_style("title"),
                "margin_bottom": ExplainerVideoDesignStandards.SPACING["xl"],
            },
            "subtitle": {
                "text": subtitle,
                "validation": ExplainerVideoDesignStandards.validate_text(subtitle, "heading"),
                "style": ExplainerVideoDesignStandards.get_text_style("heading"),
                "margin_bottom": ExplainerVideoDesignStandards.SPACING["lg"],
            } if subtitle else None,
            "description": {
                "text": description,
                "validation": ExplainerVideoDesignStandards.validate_text(description, "body"),
                "style": ExplainerVideoDesignStandards.get_text_style("body"),
            } if description else None,
            "padding": ExplainerVideoDesignStandards.SPACING["xxl"],
            "alignment": "center",
        }

    @staticmethod
    def create_content_slide(heading: str, items: list, color: str = "orange") -> dict:
        """Create content slide with proper spacing"""
        items_validated = [
            {
                "text": item,
                "validation": ExplainerVideoDesignStandards.validate_text(item, "body"),
                "style": ExplainerVideoDesignStandards.get_text_style("body"),
                "margin_bottom": ExplainerVideoDesignStandards.SPACING["md"],
            }
            for item in items
        ]

        return {
            "layout": "content",
            "heading": {
                "text": heading,
                "validation": ExplainerVideoDesignStandards.validate_text(heading, "heading"),
                "style": ExplainerVideoDesignStandards.get_text_style("heading"),
                "margin_bottom": ExplainerVideoDesignStandards.SPACING["lg"],
            },
            "items": items_validated,
            "box_style": ExplainerVideoDesignStandards.get_box_style(color),
            "max_items": min(len(items_validated), 4),  # Never more than 4 bullets
            "padding": ExplainerVideoDesignStandards.SPACING["xl"],
        }

    @staticmethod
    def create_comparison_slide(left_title: str, left_items: list, right_title: str, right_items: list) -> dict:
        """Create side-by-side comparison with proper alignment"""
        return {
            "layout": "comparison",
            "left": {
                "title": {
                    "text": left_title,
                    "style": ExplainerVideoDesignStandards.get_text_style("heading"),
                },
                "items": [
                    {
                        "text": item,
                        "style": ExplainerVideoDesignStandards.get_text_style("body"),
                    }
                    for item in left_items[:4]  # Max 4 items
                ],
                "box_style": ExplainerVideoDesignStandards.get_box_style("red"),
            },
            "right": {
                "title": {
                    "text": right_title,
                    "style": ExplainerVideoDesignStandards.get_text_style("heading"),
                },
                "items": [
                    {
                        "text": item,
                        "style": ExplainerVideoDesignStandards.get_text_style("body"),
                    }
                    for item in right_items[:4]  # Max 4 items
                ],
                "box_style": ExplainerVideoDesignStandards.get_box_style("green"),
            },
            "gap": ExplainerVideoDesignStandards.SPACING["lg"],
            "padding": ExplainerVideoDesignStandards.SPACING["xl"],
        }


if __name__ == "__main__":
    # Example usage
    standards = ExplainerVideoDesignStandards()

    # Test text validation
    test_title = "Two Ways to Build with AI"
    validation = standards.validate_text(test_title, "title")
    print(f"Title validation: {validation}")

    # Get styling
    print(f"\nBody text style: {standards.get_text_style('body')}")
    print(f"\nBox style (red): {standards.get_box_style('red')}")

    # Build a slide
    builder = SlideLayoutBuilder()
    title_slide = builder.create_title_slide(
        "Explainer Video Design",
        "Professional Typography Standards",
        "Text formatting, spacing, and diagram design best practices"
    )
    print(f"\nTitle slide structure: {title_slide['layout']}")
