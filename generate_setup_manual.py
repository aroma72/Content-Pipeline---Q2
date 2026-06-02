#!/usr/bin/env python3
"""Generate Development Environment Setup Manual PDF.

Cover page created with reportlab; the 5 screenshot guide PDFs are appended
directly so all original screenshots are preserved.
"""

import io
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                 HRFlowable, Table, TableStyle)
from reportlab.lib.enums import TA_CENTER
from pypdf import PdfWriter, PdfReader

BLUE   = colors.HexColor('#4A7BA7')
ORANGE = colors.HexColor('#C67C5F')
DARK   = colors.HexColor('#2C3E50')
GREY   = colors.HexColor('#6B7280')
LIGHT  = colors.HexColor('#EDF5F9')
WHITE  = colors.white

W, H = A4


def make_cover_pdf() -> bytes:
    """Return the cover page as PDF bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2.5*cm, bottomMargin=2.5*cm)

    s_title = ParagraphStyle('t', fontName='Helvetica-Bold', fontSize=28,
                             textColor=BLUE, alignment=TA_CENTER, leading=36)
    s_sub   = ParagraphStyle('s', fontName='Helvetica', fontSize=14,
                             textColor=GREY, alignment=TA_CENTER,
                             spaceBefore=12, spaceAfter=0)
    s_label = ParagraphStyle('l', fontName='Helvetica-Bold', fontSize=11,
                             textColor=ORANGE, alignment=TA_CENTER,
                             spaceBefore=32)
    s_chip  = ParagraphStyle('c', fontName='Helvetica', fontSize=11,
                             textColor=DARK, leading=16, leftIndent=4)

    sections = [
        ("01", "Download & Install Cursor"),
        ("02", "Install Claude Code"),
        ("03", "Install Git"),
        ("04", "Set Up Claude Code in Cursor"),
        ("05", "Create GitHub Account & Repository"),
    ]

    story = [
        Spacer(1, 2*cm),
        Paragraph("Development Environment", s_title),
        Paragraph("Setup Manual", s_title),
        Spacer(1, 0.4*cm),
        HRFlowable(width="60%", thickness=3, color=ORANGE,
                   hAlign='CENTER', spaceAfter=16),
        Paragraph(
            "A complete step-by-step guide to setting up Cursor, "
            "Claude Code, Git, and GitHub",
            s_sub,
        ),
        Spacer(1, 1.5*cm),
    ]

    chip_data = [[Paragraph(f'<b>{n}</b>  {t}', s_chip)] for n, t in sections]
    chip_table = Table(chip_data, colWidths=[14*cm])
    chip_table.setStyle(TableStyle(
        [('BACKGROUND', (0, i), (0, i), LIGHT if i % 2 == 0 else WHITE)
         for i in range(len(sections))]
        + [
            ('TOPPADDING',    (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING',   (0, 0), (-1, -1), 16),
            ('BOX',      (0, 0), (-1, -1), 1, colors.HexColor('#D0E4F0')),
            ('LINEBELOW',(0, 0), (-1, -2), 0.5, colors.HexColor('#D0E4F0')),
        ]
    ))
    story.append(chip_table)
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph("Agentic AI Mastery · Session 1", s_label))

    doc.build(story)
    return buf.getvalue()


# Source PDFs in order (must exist in the same directory as this script)
SOURCE_PDFS = [
    "Download & Install Cursor.pdf",
    "Install Claude.pdf",
    "Installing Git.pdf",
    "Setup Claude Login & Extension in Cursor.pdf",
    "Creating Github Account & Repo.pdf",
]


def build(output_path: str):
    writer = PdfWriter()

    # 1 — cover page
    cover_bytes = make_cover_pdf()
    cover_reader = PdfReader(io.BytesIO(cover_bytes))
    for page in cover_reader.pages:
        writer.add_page(page)

    # 2 — append each source PDF
    base = os.path.dirname(os.path.abspath(__file__))
    for pdf_name in SOURCE_PDFS:
        pdf_path = os.path.join(base, pdf_name)
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            writer.add_page(page)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "wb") as f:
        writer.write(f)
    print(f"Manual saved: {output_path}")


if __name__ == "__main__":
    build("assignments/session2/DevEnvironment_SetupManual.pdf")
