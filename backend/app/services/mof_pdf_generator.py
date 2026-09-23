import fitz
import io
import re
from html import escape
from typing import Optional

def generate_mof_pdf(
    publicatie_nr: Optional[str] = "",
    data_pub: Optional[str] = "",
    denumire: Optional[str] = "",
    titlu: Optional[str] = "",
    continut: Optional[str] = ""
) -> bytes:
    """
    Generează un PDF vectorial oficial pentru o publicație din Monitorul Oficial Partea a IV-a.
    Suportă formatare A4, diacritice românești complete (ă, î, ș, ț, â), antet oficial și paginare.
    """
    clean_continut = continut or ""
    # Normalize newline to paragraphs if HTML tags are missing
    if "<p" not in clean_continut and "<div" not in clean_continut:
        paragraphs = clean_continut.split("\n")
        clean_continut = "".join(f"<p>{escape(p.strip())}</p>" for p in paragraphs if p.strip())

    title_text = titlu or denumire or "Publicație Monitorul Oficial"
    
    html = f"""
    <style>
      body {{
        font-family: sans-serif;
        font-size: 9.5pt;
        line-height: 1.55;
        color: #1e293b;
      }}
      .header {{
        text-align: center;
        border-bottom: 2pt solid #0f172a;
        padding-bottom: 8pt;
        margin-bottom: 12pt;
      }}
      .subhead {{
        font-size: 7.5pt;
        letter-spacing: 1.2pt;
        font-weight: bold;
        color: #64748b;
        text-transform: uppercase;
        margin-bottom: 3pt;
      }}
      .mainhead {{
        font-size: 13pt;
        font-weight: bold;
        color: #0f172a;
        margin-bottom: 3pt;
      }}
      .meta-box {{
        margin-bottom: 14pt;
        padding: 8pt 12pt;
        background-color: #f8fafc;
        border: 0.75pt solid #cbd5e1;
        font-size: 8.5pt;
      }}
      .act-title {{
        font-size: 11pt;
        font-weight: bold;
        color: #1d4ed8;
        margin-bottom: 12pt;
        text-align: center;
      }}
      p {{
        margin-bottom: 8pt;
        text-align: justify;
      }}
      .footer-note {{
        margin-top: 20pt;
        padding-top: 8pt;
        border-top: 0.5pt solid #e2e8f0;
        font-size: 7pt;
        color: #94a3b8;
        text-align: center;
      }}
    </style>
    <div class="header">
      <div class="subhead">România • Ministerul Justiției • Oficiul Național al Registrului Comerțului</div>
      <div class="mainhead">MONITORUL OFICIAL AL ROMÂNIEI</div>
      <div class="subhead">PARTEA A IV-A • PUBLICAȚII ALE AGENȚILOR ECONOMICI</div>
    </div>
    <div class="meta-box">
      <b>Număr Publicație:</b> Nr. {escape(publicatie_nr or '-')} &nbsp;&nbsp;|&nbsp;&nbsp;
      <b>Data Publicării:</b> {escape(data_pub or '-')} &nbsp;&nbsp;|&nbsp;&nbsp;
      <b>Subiect / Entitate:</b> {escape(denumire or '-')}
    </div>
    <div class="act-title">{escape(title_text)}</div>
    <div class="content">
      {clean_continut}
    </div>
    <div class="footer-note">
      Document generat oficial din arhiva Monitorului Oficial al României • Sistem AXIS Platform
    </div>
    """

    out = io.BytesIO()
    try:
        story = fitz.Story(html)
        writer = fitz.DocumentWriter(out)
        rect = fitz.Rect(40, 40, 595 - 40, 842 - 40)
        more = 1
        while more:
            dev = writer.begin_page(fitz.paper_rect('a4'))
            more, _ = story.place(rect)
            story.draw(dev)
            writer.end_page()
        writer.close()
        return out.getvalue()
    except Exception:
        # Fallback to sanitized plain text paragraphs
        plain_text = re.sub(r'<[^>]+>', ' ', continut or '')
        safe_p = "".join(f"<p>{escape(p.strip())}</p>" for p in plain_text.split("\n") if p.strip())
        fallback_html = html.replace(clean_continut, safe_p)
        story = fitz.Story(fallback_html)
        writer = fitz.DocumentWriter(out)
        rect = fitz.Rect(40, 40, 595 - 40, 842 - 40)
        more = 1
        while more:
            dev = writer.begin_page(fitz.paper_rect('a4'))
            more, _ = story.place(rect)
            story.draw(dev)
            writer.end_page()
        writer.close()
        return out.getvalue()
