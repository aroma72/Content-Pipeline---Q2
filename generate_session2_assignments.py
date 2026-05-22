#!/usr/bin/env python3
"""Generate Session 2 Theory and Practical Assignment PDFs."""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# Brand colours (matching existing assignment PDF)
BLUE   = colors.HexColor('#4A7BA7')
ORANGE = colors.HexColor('#C67C5F')
DARK   = colors.HexColor('#2C3E50')
GREY   = colors.HexColor('#6B7280')
BG     = colors.white

def base_styles():
    return {
        'title': ParagraphStyle(
            'title', fontName='Helvetica-Bold', fontSize=22,
            textColor=BLUE, alignment=TA_CENTER,
            spaceAfter=0, spaceBefore=0, leading=28,
        ),
        'subtitle': ParagraphStyle(
            'subtitle', fontName='Helvetica-Oblique', fontSize=12,
            textColor=ORANGE, alignment=TA_CENTER,
            spaceBefore=8, spaceAfter=20, leading=16,
        ),
        'section_head': ParagraphStyle(
            'section_head', fontName='Helvetica-Bold', fontSize=12,
            textColor=DARK, spaceBefore=14, spaceAfter=4,
        ),
        'body': ParagraphStyle(
            'body', fontName='Helvetica', fontSize=11,
            textColor=DARK, leading=18, alignment=TA_JUSTIFY, spaceAfter=6,
        ),
        'bullet': ParagraphStyle(
            'bullet', fontName='Helvetica', fontSize=11,
            textColor=DARK, leading=18, leftIndent=16, spaceAfter=3,
        ),
        'footer': ParagraphStyle(
            'footer', fontName='Helvetica-Oblique', fontSize=10,
            textColor=GREY, alignment=TA_CENTER, spaceBefore=30,
        ),
        'question_label': ParagraphStyle(
            'question_label', fontName='Helvetica-Bold', fontSize=11,
            textColor=BLUE, spaceBefore=10, spaceAfter=2,
        ),
        'question_body': ParagraphStyle(
            'question_body', fontName='Helvetica', fontSize=11,
            textColor=DARK, leading=18, alignment=TA_JUSTIFY,
            leftIndent=12, spaceAfter=8,
        ),
    }


def make_theory(path):
    doc = SimpleDocTemplate(path, pagesize=A4,
                            leftMargin=2.5*cm, rightMargin=2.5*cm,
                            topMargin=2.5*cm, bottomMargin=2.5*cm)
    s = base_styles()
    story = []

    story.append(Paragraph("Five Mental Models — Reflection", s['title']))
    story.append(Paragraph("Session 1 &bull; Theory Assignment", s['subtitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=16))

    story.append(Paragraph("Instructions:", s['section_head']))
    for line in [
        "• Watch Videos 1, 2, and 3 from Session 1",
        "• Answer the question below in 1–2 pages",
        "• Submit your assignment via a Drive link by the deadline",
    ]:
        story.append(Paragraph(line, s['bullet']))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Assignment:", s['section_head']))
    story.append(Paragraph(
        "<b>Choose one of the five mental models from Video 2 and apply it to your own work.</b>",
        s['body']
    ))

    story.append(Spacer(1, 8))

    questions = [
        ("1. Which model did you choose?",
         "Name the mental model and explain it in your own words — not from the video, "
         "but as you understand it after watching."),
        ("2. Why does it matter in your context?",
         "Describe a specific situation in your current role or organisation where "
         "this mental model would change how you approach a problem."),
        ("3. What would change?",
         "If you applied this model starting this week, what would you do differently? "
         "Be concrete — name one task, one decision, or one habit."),
        ("4. What would you need to learn first?",
         "Identify one gap in your understanding that you would need to close before "
         "you could apply this model confidently."),
    ]

    for label, body in questions:
        story.append(Paragraph(label, s['question_label']))
        story.append(Paragraph(body, s['question_body']))

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY, spaceAfter=10))
    story.append(Paragraph("Submit your assignment via a Drive link by the deadline.", s['footer']))

    doc.build(story)
    print(f"Theory PDF saved: {path}")


def make_practical(path):
    doc = SimpleDocTemplate(path, pagesize=A4,
                            leftMargin=2.5*cm, rightMargin=2.5*cm,
                            topMargin=2.5*cm, bottomMargin=2.5*cm)
    s = base_styles()
    story = []

    story.append(Paragraph("Set Up Your Development Environment", s['title']))
    story.append(Paragraph("Session 1 &bull; Practical Assignment", s['subtitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=16))

    story.append(Paragraph("Instructions:", s['section_head']))
    for line in [
        "• Watch Video 3 (Your Development Environment: Cursor, Claude Code & GitHub)",
        "• Complete all three steps below",
        "• Submit a single screenshot for each step as proof of completion",
    ]:
        story.append(Paragraph(line, s['bullet']))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Assignment:", s['section_head']))
    story.append(Paragraph(
        "<b>Follow the setup from Video 3 and get your environment running.</b>",
        s['body']
    ))

    story.append(Spacer(1, 8))

    steps = [
        ("Step 1 — Install Cursor",
         "Download and install Cursor from cursor.com. Open it and confirm it loads. "
         "Take a screenshot of the Cursor editor open on your machine."),
        ("Step 2 — Connect Claude Code",
         "Install the Claude Code extension inside Cursor and enter your Anthropic API key. "
         "Take a screenshot showing Claude Code active in the Cursor sidebar or extensions panel."),
        ("Step 3 — Create a GitHub Repository",
         "Create a free GitHub account (if you don't have one), create a new private repository, "
         "and connect it to a local folder in Cursor using the terminal commands shown in the video. "
         "Take a screenshot of your terminal showing the git remote add origin command completed successfully."),
    ]

    for label, body in steps:
        story.append(Paragraph(label, s['question_label']))
        story.append(Paragraph(body, s['question_body']))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Reflection (optional — 2–3 sentences):", s['section_head']))
    story.append(Paragraph(
        "What was the hardest part of the setup? What would you do differently next time?",
        s['body']
    ))

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY, spaceAfter=10))
    story.append(Paragraph("Submit your three screenshots via a Drive link by the deadline.", s['footer']))

    doc.build(story)
    print(f"Practical PDF saved: {path}")


if __name__ == "__main__":
    import os
    os.makedirs("assignments/session2", exist_ok=True)
    make_theory("assignments/session2/Session1_TheoryAssignment.pdf")
    make_practical("assignments/session2/Session1_PracticalAssignment.pdf")
