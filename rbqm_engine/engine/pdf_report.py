"""
Branded PDF Report Generator for Vritas RBQM Platform
Generates professional, branded clinical monitoring reports with:
- Cover page with trial health summary
- Color-coded risk tables
- KRI breakdown per site
- Footer with page numbers and timestamp
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Frame, PageTemplate, BaseDocTemplate
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import datetime

# ─── Brand Colors ───
ACCENT      = colors.HexColor("#10b981")  # Emerald
DARK_BG     = colors.HexColor("#0a0a0f")
SLATE_800   = colors.HexColor("#1e293b")
SLATE_700   = colors.HexColor("#334155")
SLATE_200   = colors.HexColor("#e2e8f0")
RED_400     = colors.HexColor("#f87171")
YELLOW_400  = colors.HexColor("#facc15")
GREEN_400   = colors.HexColor("#34d399")
WHITE       = colors.white


def _status_color(status: str):
    if status == 'RED':    return RED_400
    if status == 'YELLOW': return YELLOW_400
    return GREEN_400


def _risk_color(level: str):
    if level == 'CRITICAL':  return RED_400
    if level == 'ELEVATED':  return YELLOW_400
    return GREEN_400


def _footer(canvas, doc):
    """Draw branded footer on every page."""
    canvas.saveState()
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    canvas.drawString(
        0.75 * inch, 0.5 * inch,
        f"VRITAS RBQM Platform  •  Confidential  •  Generated {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}"
    )
    canvas.drawRightString(
        7.75 * inch, 0.5 * inch,
        f"Page {doc.page}"
    )
    # Top accent bar
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(2)
    canvas.line(0.75 * inch, 10.5 * inch, 7.75 * inch, 10.5 * inch)
    canvas.restoreState()


def generate_pdf_report(reports, output_path, trial_title="Clinical Trial"):
    """Generate a branded Vritas PDF report."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        topMargin=0.9 * inch,
        bottomMargin=0.8 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'VritasTitle', parent=styles['Heading1'],
        fontSize=28, textColor=ACCENT, spaceAfter=8,
        fontName='Helvetica-Bold', leading=34,
    )
    subtitle_style = ParagraphStyle(
        'VritasSub', parent=styles['Normal'],
        fontSize=12, textColor=colors.HexColor("#94a3b8"),
        spaceAfter=4, fontName='Helvetica',
    )
    h2_style = ParagraphStyle(
        'VritasH2', parent=styles['Heading2'],
        fontSize=16, textColor=SLATE_800, spaceAfter=10,
        spaceBefore=20, fontName='Helvetica-Bold',
    )
    h3_style = ParagraphStyle(
        'VritasH3', parent=styles['Heading3'],
        fontSize=12, textColor=ACCENT, spaceAfter=8,
        spaceBefore=14, fontName='Helvetica-Bold',
    )
    body_style = ParagraphStyle(
        'VritasBody', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor("#475569"),
        leading=14, spaceAfter=6,
    )
    small_style = ParagraphStyle(
        'VritasSmall', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor("#64748b"),
    )

    story = []

    # ─── Cover Page ───
    story.append(Spacer(1, 2 * inch))
    story.append(Paragraph("VRITAS", ParagraphStyle(
        'Brand', parent=styles['Normal'],
        fontSize=14, textColor=ACCENT, fontName='Helvetica-Bold',
        spaceAfter=4, letterSpacing=8,
    )))
    story.append(Paragraph("Risk-Based Quality<br/>Management Report", title_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Trial: {trial_title}", subtitle_style))
    story.append(Paragraph(
        f"Report Date: {datetime.now().strftime('%B %d, %Y at %H:%M')}",
        subtitle_style
    ))
    story.append(Spacer(1, 30))

    # Quick stats box
    total_sites = len(reports)
    total_red   = sum(r.red_count for r in reports)
    total_yellow = sum(r.yellow_count for r in reports)
    total_green = sum(r.green_count for r in reports)

    stats_data = [
        ['Active Sites', 'Critical KRIs', 'Warning KRIs', 'Healthy KRIs'],
        [str(total_sites), str(total_red), str(total_yellow), str(total_green)],
    ]
    stats_table = Table(stats_data, colWidths=[1.7 * inch] * 4)
    stats_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica'),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTSIZE', (0, 1), (-1, 1), 22),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#94a3b8")),
        ('TEXTCOLOR', (0, 1), (0, 1), ACCENT),
        ('TEXTCOLOR', (1, 1), (1, 1), RED_400),
        ('TEXTCOLOR', (2, 1), (2, 1), YELLOW_400),
        ('TEXTCOLOR', (3, 1), (3, 1), GREEN_400),
        ('TOPPADDING', (0, 1), (-1, 1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 12),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 40))

    story.append(Paragraph(
        "This report provides a comprehensive risk-based quality management overview "
        "for all active sites in the trial. KRI thresholds are evaluated against "
        "ICH E6(R3) guidelines for proactive risk identification.",
        body_style
    ))
    story.append(PageBreak())

    # ─── Executive Summary ───
    story.append(Paragraph("Executive Summary", h2_style))
    summary_text = (
        f"Across <b>{total_sites}</b> active sites, the RBQM engine has identified "
        f"<font color='#f87171'><b>{total_red}</b></font> critical (RED) KRIs and "
        f"<font color='#facc15'><b>{total_yellow}</b></font> warning (YELLOW) KRIs "
        f"that require attention. <font color='#34d399'><b>{total_green}</b></font> "
        f"KRIs are within acceptable thresholds."
    )
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 16))

    # ─── Site Risk Profile Table ───
    story.append(Paragraph("Site Risk Profile", h2_style))
    header = ['Site ID', 'Site Name', 'Risk Level', 'RED', 'YELLOW', 'GREEN']
    data = [header]
    for r in reports:
        data.append([
            r.site_id, r.site_name, r.risk_level,
            str(r.red_count), str(r.yellow_count), str(r.green_count)
        ])

    t = Table(data, colWidths=[0.8*inch, 2.2*inch, 1*inch, 0.7*inch, 0.7*inch, 0.7*inch])
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), SLATE_800),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, colors.HexColor("#f8fafc")]),
    ]
    # Color-code risk level cells
    for i, r in enumerate(reports):
        row = i + 1
        rc = _risk_color(r.risk_level)
        style_cmds.append(('TEXTCOLOR', (2, row), (2, row), rc))
        style_cmds.append(('FONTNAME', (2, row), (2, row), 'Helvetica-Bold'))

    t.setStyle(TableStyle(style_cmds))
    story.append(t)
    story.append(PageBreak())

    # ─── Detailed KRI Breakdown Per Site ───
    for r in reports:
        story.append(Paragraph(
            f"<font color='#10b981'>{r.site_id}</font> — {r.site_name}",
            h2_style
        ))
        risk_text = f"Risk Level: <font color='{_risk_color(r.risk_level).hexval()}'><b>{r.risk_level}</b></font>"
        story.append(Paragraph(risk_text, body_style))
        story.append(Spacer(1, 8))

        kri_header = ['KRI ID', 'Domain', 'Metric Name', 'Value', 'Status']
        kri_data = [kri_header]
        for kri in r.kris:
            kri_data.append([
                kri.kri_id, kri.domain, kri.kri_name,
                f"{kri.value:.2f}" if kri.value is not None else "N/A",
                kri.status
            ])

        kt = Table(kri_data, colWidths=[0.6*inch, 1.2*inch, 2.4*inch, 0.7*inch, 0.7*inch])
        kri_style = [
            ('BACKGROUND', (0, 0), (-1, 0), SLATE_700),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, colors.HexColor("#f8fafc")]),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ]
        # Color-code status cells
        for j, kri in enumerate(r.kris):
            row = j + 1
            sc = _status_color(kri.status)
            kri_style.append(('TEXTCOLOR', (4, row), (4, row), sc))
            kri_style.append(('FONTNAME', (4, row), (4, row), 'Helvetica-Bold'))

        kt.setStyle(TableStyle(kri_style))
        story.append(kt)
        story.append(Spacer(1, 12))

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
