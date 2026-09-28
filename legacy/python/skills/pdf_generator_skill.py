"""
PDF Generator Skill - Create professional PDFs for assignments, guides, and documents.
Uses reportlab for high-quality formatting with custom styling.
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from pathlib import Path
from datetime import datetime


class PDFGeneratorSkill:
    """Generate professional PDFs with consistent styling and branding."""

    def __init__(self):
        self.page_width, self.page_height = letter
        self.margin = 0.75 * inch
        self.style_sheet = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Create custom paragraph styles for consistent formatting."""
        # Title style
        self.style_sheet.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.style_sheet['Heading1'],
            fontSize=28,
            textColor=colors.HexColor('#1a3a52'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
        ))

        # Subtitle style
        self.style_sheet.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=self.style_sheet['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#d99670'),
            spaceAfter=6,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
        ))

        # Section heading
        self.style_sheet.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.style_sheet['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#3a3530'),
            spaceAfter=8,
            spaceBefore=8,
            fontName='Helvetica-Bold',
            borderColor=colors.HexColor('#d99670'),
            borderWidth=2,
            borderPadding=8,
        ))

        # Body text
        self.style_sheet.add(ParagraphStyle(
            name='CustomBody',
            parent=self.style_sheet['BodyText'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
            leading=14,
        ))

        # Instructions style
        self.style_sheet.add(ParagraphStyle(
            name='Instructions',
            parent=self.style_sheet['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#6b5d52'),
            spaceAfter=6,
            leftIndent=20,
            fontName='Helvetica-Oblique',
        ))

    def create_assignment_pdf(self, title, assignment_type, session_num, content_dict, output_path):
        """
        Create a professional assignment PDF.

        Args:
            title: Assignment title
            assignment_type: 'Theory' or 'Practical'
            session_num: Session number
            content_dict: Dict with keys: overview, learning_objectives, instructions, questions, rubric, resources
            output_path: Where to save the PDF
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

        # Header with branding
        story.append(Paragraph(
            "Agentic AI Mastery",
            self.style_sheet['CustomTitle']
        ))
        story.append(Spacer(1, 6))

        # Assignment type and session
        header_text = f"<b>Session {session_num}</b> • <b>{assignment_type} Assignment</b>"
        story.append(Paragraph(header_text, self.style_sheet['CustomSubtitle']))
        story.append(Spacer(1, 12))

        # Main title
        story.append(Paragraph(title, ParagraphStyle(
            name='AssignmentTitle',
            parent=self.style_sheet['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#3a3530'),
            spaceAfter=6,
            fontName='Helvetica-Bold',
        )))

        # Metadata box
        meta_data = [
            [f"<b>Type:</b> {assignment_type} Assignment", f"<b>Session:</b> {session_num}"],
            [f"<b>Date Assigned:</b> {datetime.now().strftime('%B %d, %Y')}", f"<b>Time Estimate:</b> Varies"],
        ]
        meta_table = Table(meta_data, colWidths=[3.5*inch, 3.5*inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#faf8f5')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#3a3530')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d0c0b0')),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 16))

        # Overview
        if 'overview' in content_dict:
            story.append(Paragraph("Overview", self.style_sheet['SectionHeading']))
            story.append(Paragraph(content_dict['overview'], self.style_sheet['CustomBody']))
            story.append(Spacer(1, 10))

        # Learning Objectives
        if 'learning_objectives' in content_dict:
            story.append(Paragraph("Learning Objectives", self.style_sheet['SectionHeading']))
            for obj in content_dict['learning_objectives']:
                story.append(Paragraph(f"• {obj}", self.style_sheet['CustomBody']))
            story.append(Spacer(1, 10))

        # Instructions
        if 'instructions' in content_dict:
            story.append(Paragraph("Instructions", self.style_sheet['SectionHeading']))
            for i, instruction in enumerate(content_dict['instructions'], 1):
                story.append(Paragraph(f"<b>{i}.</b> {instruction}", self.style_sheet['CustomBody']))
            story.append(Spacer(1, 10))

        # Questions / Tasks
        if 'questions' in content_dict:
            story.append(Paragraph("Questions & Tasks", self.style_sheet['SectionHeading']))
            for i, question in enumerate(content_dict['questions'], 1):
                story.append(Paragraph(f"<b>Q{i}:</b> {question}", self.style_sheet['CustomBody']))
                story.append(Spacer(1, 6))
            story.append(Spacer(1, 10))

        # Rubric
        if 'rubric' in content_dict:
            story.append(Paragraph("Evaluation Rubric", self.style_sheet['SectionHeading']))
            rubric_data = [['Criterion', 'Excellent (4)', 'Good (3)', 'Developing (2)', 'Needs Work (1)']]
            for criterion, scores in content_dict['rubric'].items():
                rubric_data.append([criterion] + scores)

            rubric_table = Table(rubric_data, colWidths=[1.4*inch, 1.3*inch, 1.3*inch, 1.3*inch, 1.3*inch])
            rubric_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3a3530')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('TOPPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#faf8f5')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d0c0b0')),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#faf8f5')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(rubric_table)
            story.append(Spacer(1, 10))

        # Resources
        if 'resources' in content_dict:
            story.append(Paragraph("Resources & References", self.style_sheet['SectionHeading']))
            for resource in content_dict['resources']:
                story.append(Paragraph(f"• {resource}", self.style_sheet['CustomBody']))
            story.append(Spacer(1, 10))

        # Footer
        story.append(Spacer(1, 20))
        footer_text = "Submit your assignment through the Learning Management System by the deadline. Questions? Reach out to the instructors."
        story.append(Paragraph(footer_text, ParagraphStyle(
            name='Footer',
            parent=self.style_sheet['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#9b8b7f'),
            alignment=TA_CENTER,
            borderColor=colors.HexColor('#d0c0b0'),
            borderWidth=1,
            borderPadding=8,
        )))

        # Build PDF
        doc.build(story)
        return str(output_path)
