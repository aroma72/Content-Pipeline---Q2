"""
Simple PDF Generator - Create clean, minimal assignment PDFs.
Title + Instructions + Question + End. That's it.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
from pathlib import Path


class SimplePDFSkill:
    """Generate minimal, clean assignment PDFs."""

    def __init__(self):
        self.page_width, self.page_height = letter
        self.margin = 0.75 * inch

    def create_assignment(self, title, assignment_type, session_num, instructions, question, output_path):
        """
        Create a minimal assignment PDF.

        Args:
            title: Assignment title
            assignment_type: 'Theory' or 'Practical'
            session_num: Session number
            instructions: List of instruction strings
            question: The assignment question (can include formatting)
            output_path: Where to save PDF
        """
        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin,
        )

        story = []

        # Title
        title_style = ParagraphStyle(
            'Title',
            fontSize=16,
            textColor=colors.HexColor('#1a3a52'),
            spaceAfter=12,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER,
            leading=20,
        )
        story.append(Paragraph(title, title_style))

        # Session/Type
        header_style = ParagraphStyle(
            'Header',
            fontSize=11,
            textColor=colors.HexColor('#d99670'),
            spaceAfter=12,
            fontName='Helvetica-Oblique',
            alignment=TA_CENTER,
        )
        story.append(Paragraph(f"Session {session_num} • {assignment_type} Assignment", header_style))

        # Instructions
        story.append(Spacer(1, 12))
        instr_style = ParagraphStyle(
            'Instructions',
            fontSize=11,
            textColor=colors.HexColor('#3a3530'),
            spaceAfter=6,
            fontName='Helvetica-Bold',
        )
        story.append(Paragraph("Instructions:", instr_style))

        body_style = ParagraphStyle(
            'Body',
            fontSize=11,
            textColor=colors.HexColor('#3a3530'),
            spaceAfter=6,
            leading=14,
            leftIndent=20,
        )
        for instr in instructions:
            story.append(Paragraph(f"• {instr}", body_style))

        # Question
        story.append(Spacer(1, 14))
        q_header = ParagraphStyle(
            'QHeader',
            fontSize=11,
            textColor=colors.HexColor('#3a3530'),
            spaceAfter=8,
            fontName='Helvetica-Bold',
        )
        story.append(Paragraph("Assignment:", q_header))

        q_style = ParagraphStyle(
            'Question',
            fontSize=11,
            textColor=colors.HexColor('#3a3530'),
            spaceAfter=12,
            leading=15,
            alignment=TA_JUSTIFY,
        )
        story.append(Paragraph(question, q_style))

        # Footer
        story.append(Spacer(1, 14))
        footer_style = ParagraphStyle(
            'Footer',
            fontSize=9,
            textColor=colors.HexColor('#9b8b7f'),
            alignment=TA_CENTER,
            fontName='Helvetica-Oblique',
        )
        story.append(Paragraph("Submit your response by the deadline.", footer_style))

        doc.build(story)
        return str(output_path)
