import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    """Sets background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets cell padding in twips."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_official_fidejusor_template(output_path: str):
    """
    Creates the official Romanian Operational Leasing & Fidejusiune Contract (.docx).
    Complies with Romanian Civil Code Art. 2280-2323 and Axis LT fleet requirements.
    """
    doc = Document()
    
    # Configure 1-inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
    # Header Accent Bar / Title
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_axis = title_p.add_run("AXIS FLEET MANAGEMENT • DIVIZIA LEASING OPERAȚIONAL\n")
    run_axis.font.name = "Calibri"
    run_axis.font.size = Pt(10)
    run_axis.font.bold = True
    run_axis.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
    
    run_title = title_p.add_run("CONTRACT DE ÎNCHIRIERE AUTO / LEASING OPERAȚIONAL\nCU ANGAJAMENT DE FIDEJUSIUNE SOLIDARĂ")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(15)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(14, 116, 144) # Cyan 700 / Axis Blue

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_nr = sub_p.add_run("Nr. Înregistrare: {{nr_contract}} / Data: {{data_contract}}")
    run_nr.font.name = "Calibri"
    run_nr.font.size = Pt(10)
    run_nr.font.italic = True
    run_nr.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # CAPITOLUL I: PĂRȚILE CONTRACTANTE
    p_cap1 = doc.add_paragraph()
    r = p_cap1.add_run("CAPITOLUL I. PĂRȚILE CONTRACTANTE")
    r.font.name = "Calibri"
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42)

    p_parties = doc.add_paragraph()
    p_parties.paragraph_format.line_spacing = 1.15
    p_parties.paragraph_format.space_after = Pt(8)
    p_parties.add_run(
        "1.1. S.C. AXIS RENT S.R.L., societate comercială de drept român, cu sediul social în București, "
        "înregistrată la Registrul Comerțului sub nr. J40/12345/2020, Cod Unic de Înregistrare RO12345678, "
        "reprezentată legal de Director General, denumită în continuare „LOCATOR” sau „AXIS”;\n\n"
        "1.2. {{client_name}}, cu sediul social / domiciliul în {{client_address}}, Cod de Înregistrare Fiscală / CUI / CNP {{client_cui}}, "
        "înregistrată la Registrul Comerțului sub nr. {{client_reg_com}}, reprezentată legal prin {{client_representative}}, "
        "având calitatea de {{client_representative_quality}}, identificat(ă) prin CI seria {{client_id_card_series}} nr. {{client_id_card_number}}, "
        "denumită în continuare „LOCATAR” sau „BENEFICIAR”;\n\n"
        "1.3. {{fidejusor_name}}, cetățean român, domiciliat(ă) în {{fidejusor_address}}, identificat(ă) prin CNP {{fidejusor_cnp}}, "
        "posesor al C.I. seria/nr. {{fidejusor_id_card}}, având calitatea de {{fidejusor_quality}} în cadrul Locatarului, "
        "intervenind în prezentul contract în nume personal, în calitate de „FIDEJUSOR / GARANT SOLIDAR”."
    )

    # CAPITOLUL II: OBIECTUL CONTRACTULUI
    p_cap2 = doc.add_paragraph()
    r2 = p_cap2.add_run("CAPITOLUL II. OBIECTUL CONTRACTULUI ȘI DESCRIEREA AUTOVEHICULULUI")
    r2.font.name = "Calibri"
    r2.font.size = Pt(12)
    r2.font.bold = True
    r2.font.color.rgb = RGBColor(15, 23, 42)

    p_obj = doc.add_paragraph()
    p_obj.paragraph_format.line_spacing = 1.15
    p_obj.paragraph_format.space_after = Pt(8)
    p_obj.add_run(
        "2.1. Locatorul transmite Locatarului dreptul de folosință exclusivă asupra autovehiculului descris în tabelul de mai jos, "
        "iar Locatarul acceptă folosința autovehiculului și se obligă să achite chiria contractuală lunară și toate costurile aferente exploatării:"
    )

    # Tabel Vehicul
    table_v = doc.add_table(rows=5, cols=2)
    table_v.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_v.autofit = False

    vehicle_rows = [
        ("Marcă și Model:", "{{vehicle_make}} {{vehicle_model}}"),
        ("Serie Șasiu (VIN):", "{{vehicle_vin}}"),
        ("Număr de Înmatriculare:", "{{vehicle_plate}}"),
        ("Valoare de Catalog / Preț Achiziție:", "{{vehicle_price}} {{currency}}"),
        ("Echipare Telematics & GPS:", "Sistem GPS Axis Active Tracking instalat conform Art. 5.1")
    ]

    for idx, (label, val) in enumerate(vehicle_rows):
        row = table_v.rows[idx]
        cell_lbl, cell_val = row.cells[0], row.cells[1]
        cell_lbl.width = Inches(2.5)
        cell_val.width = Inches(4.2)
        set_cell_background(cell_lbl, "F1F5F9")
        set_cell_margins(cell_lbl, 80, 80, 120, 120)
        set_cell_margins(cell_val, 80, 80, 120, 120)
        
        p0 = cell_lbl.paragraphs[0]
        r_lbl = p0.add_run(label)
        r_lbl.font.name = "Calibri"
        r_lbl.font.size = Pt(10)
        r_lbl.font.bold = True
        
        p1 = cell_val.paragraphs[0]
        r_val = p1.add_run(val)
        r_val.font.name = "Calibri"
        r_val.font.size = Pt(10)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # CAPITOLUL III: CONDIȚII FINANCIARE ȘI GRAFIC DE PLATĂ
    p_cap3 = doc.add_paragraph()
    r3 = p_cap3.add_run("CAPITOLUL III. TERMENE, CONDIȚII FINANCIARE ȘI FACTURARE")
    r3.font.name = "Calibri"
    r3.font.size = Pt(12)
    r3.font.bold = True
    r3.font.color.rgb = RGBColor(15, 23, 42)

    table_f = doc.add_table(rows=6, cols=2)
    table_f.alignment = WD_TABLE_ALIGNMENT.CENTER
    financial_rows = [
        ("Durata Contractului:", "{{period_months}} luni consecutive"),
        ("Avans Inițial de Garanție:", "{{advance_percent}}% ({{advance_amount}} {{currency}})"),
        ("Rată Lunară de Folosință (Chirie):", "{{monthly_rate}} {{currency}} / lună (fără TVA)"),
        ("Valoare Reziduală la Termen:", "{{residual_value_percent}}% ({{residual_value_amount}} {{currency}})"),
        ("Rată Dobândă de Referință:", "{{interest_rate}}% pe an"),
        ("Termen de Plată Facturi:", "Maxim 5 zile lucrătoare de la emiterea facturii proforme/fiscale")
    ]
    for idx, (label, val) in enumerate(financial_rows):
        row = table_f.rows[idx]
        cell_lbl, cell_val = row.cells[0], row.cells[1]
        cell_lbl.width = Inches(2.5)
        cell_val.width = Inches(4.2)
        set_cell_background(cell_lbl, "F8FAFC")
        set_cell_margins(cell_lbl, 80, 80, 120, 120)
        set_cell_margins(cell_val, 80, 80, 120, 120)
        
        p0 = cell_lbl.paragraphs[0]
        r_lbl = p0.add_run(label)
        r_lbl.font.name = "Calibri"
        r_lbl.font.size = Pt(10)
        r_lbl.font.bold = True
        
        p1 = cell_val.paragraphs[0]
        r_val = p1.add_run(val)
        r_val.font.name = "Calibri"
        r_val.font.size = Pt(10)
        if idx == 2:
            r_val.font.bold = True
            r_val.font.color.rgb = RGBColor(14, 116, 144)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # CAPITOLUL IV: TELEMATICS & GPS
    p_cap4 = doc.add_paragraph()
    r4 = p_cap4.add_run("CAPITOLUL IV. MONITORIZARE GPS, TELEMATICĂ ȘI SIGURANȚA ACTIVULUI")
    r4.font.name = "Calibri"
    r4.font.size = Pt(12)
    r4.font.bold = True
    r4.font.color.rgb = RGBColor(15, 23, 42)

    p_gps = doc.add_paragraph()
    p_gps.paragraph_format.line_spacing = 1.15
    p_gps.paragraph_format.space_after = Pt(8)
    p_gps.add_run(
        "4.1. Locatarul ia la cunoștință și este în mod expres de acord că autovehiculul este echipat cu sistem telematic activ GPS Axis, "
        "destinat protejării proprietății Locatorului, alertării în caz de depășire perimetru (geofencing transfrontalier), "
        "detectării tentativelor de deconectare a bateriei și prevenirii înstrăinării ilicite.\n"
        "4.2. Locatarului îi este strict interzisă intervenția neautorizată asupra modulului GPS sau a instalației electrice a vehiculului. "
        "Orice tentativă de bruiaj sau demontare dă dreptul Locatorului de a rezilia de drept contractul și de a imobiliza vehiculul."
    )

    # CAPITOLUL V: CLAUZĂ INTEGRALĂ DE FIDEJUSIUNE (CERINȚĂ OFICIALĂ AXIS)
    p_cap5 = doc.add_paragraph()
    r5 = p_cap5.add_run("CAPITOLUL V. ANGAJAMENTUL DE FIDEJUSIUNE SOLIDARĂ (CONFORM ART. 2280 - 2323 COD CIVIL)")
    r5.font.name = "Calibri"
    r5.font.size = Pt(12)
    r5.font.bold = True
    r5.font.color.rgb = RGBColor(185, 28, 28) # Red 700 / Legal Warning Accent

    p_fidejusor = doc.add_paragraph()
    p_fidejusor.paragraph_format.line_spacing = 1.15
    p_fidejusor.paragraph_format.space_after = Pt(8)
    p_fidejusor.add_run(
        "5.1. Fidejusorul ({{fidejusor_name}}, CNP {{fidejusor_cnp}}) declară că a luat la cunoștință pe deplin de totalitatea clauzelor prezentului contract "
        "și se obligă în mod irevocabil, necondiționat și solidar cu Locatarul (Debitorul Principal) să garanteze executarea integrală a tuturor obligațiilor "
        "pecuniare și contractuale asumate de acesta din urmă, pe toată durata de derulare a contractului și până la stingerea definitivă a oricărui debit.\n\n"
        "5.2. Renunțarea la Beneficiul de Discuțiune: În conformitate cu art. 2294 și art. 2300 din Codul Civil Român, Fidejusorul declară expres că "
        "RENUNȚĂ LA BENEFICIUL DE DISCUȚIUNE ȘI LA BENEFICIUL DE DIVIZIUNE. În consecință, în caz de neplată sau executare necorespunzătoare din partea Locatarului, "
        "Locatorul este îndreptățit să urmărească direct, imediat și fără o prealabilă executare silită a Locatarului, oricare și toate activele, veniturile "
        "și bunurile mobile sau imobile aflate în patrimoniul Fidejusorului.\n\n"
        "5.3. Întinderea Fidejusiunii: Garanția personală acoperă debitul principal (ratele lunare de chirie/leasing), penalitățile contractuale de întârziere (0.15%/zi), "
        "contravaloarea daunelor neacoperite de CASCO/RCA, franșizele aplicabile, costurile de localizare, recuperare, tractare și expertiză tehnică a vehiculului, "
        "precum și cheltuielile judiciare și de executare silită.\n\n"
        "5.4. Caracterul de Titlu Executoriu: Părțile recunosc în mod neechivoc forța executorie a prezentului înscris în condițiile legii, "
        "reprezentând manifestarea liberă și neviciată de voință a semnatarilor."
    )

    # CAPITOLUL VI: DISPOZIȚII FINALE
    p_cap6 = doc.add_paragraph()
    r6 = p_cap6.add_run("CAPITOLUL VI. LITIGII, LEGEA APLICABILĂ ȘI SEMNĂTURI")
    r6.font.name = "Calibri"
    r6.font.size = Pt(12)
    r6.font.bold = True
    r6.font.color.rgb = RGBColor(15, 23, 42)

    p_final = doc.add_paragraph()
    p_final.paragraph_format.line_spacing = 1.15
    p_final.paragraph_format.space_after = Pt(14)
    p_final.add_run(
        "Prezentul contract este guvernat de legea română. Orice litigiu decurgând din interpretarea sau executarea prezentului contract se va soluționa "
        "pe cale amiabilă, iar în caz de divergență, litigiul va fi supus instanțelor judecătorești competente de la sediul Locatorului din Municipiul București.\n\n"
        "Încheiat astăzi, {{data_contract}}, în 3 (trei) exemplare originale cu valoare juridică egală, câte unul pentru fiecare parte semnatară."
    )

    # BLOC SEMNĂTURI - 3 COLOANE
    table_s = doc.add_table(rows=2, cols=3)
    table_s.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_widths = [Inches(2.2), Inches(2.2), Inches(2.3)]
    
    headers = [
        ("LOCATOR", "S.C. AXIS RENT S.R.L.\nReprezentant Legal"),
        ("LOCATAR", "{{client_name}}\nReprezentat legal prin {{client_representative}}"),
        ("FIDEJUSOR (GARANT)", "{{fidejusor_name}}\nÎn nume personal")
    ]
    
    for idx, (title, subtitle) in enumerate(headers):
        c_head = table_s.rows[0].cells[idx]
        c_head.width = col_widths[idx]
        set_cell_background(c_head, "F1F5F9")
        set_cell_margins(c_head, 80, 80, 100, 100)
        p = c_head.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        rt = p.add_run(f"{title}\n")
        rt.font.bold = True
        rt.font.size = Pt(10)
        rs = p.add_run(subtitle)
        rs.font.size = Pt(8.5)
        rs.font.color.rgb = RGBColor(71, 85, 105)

        c_sig = table_s.rows[1].cells[idx]
        c_sig.width = col_widths[idx]
        set_cell_margins(c_sig, 250, 100, 100, 100)
        p_sig = c_sig.paragraphs[0]
        p_sig.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_line = p_sig.add_run("\n\n___________________________\nSemnătură / Ștampilă")
        r_line.font.size = Pt(8.5)
        r_line.font.color.rgb = RGBColor(100, 116, 139)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    print(f"Generated official template at: {output_path}")

def create_standard_contract_template(output_path: str):
    """Generates standard contract template without Fidejusor."""
    doc = Document()
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_axis = title_p.add_run("AXIS FLEET MANAGEMENT • DIVIZIA LEASING OPERAȚIONAL\n")
    r_axis.font.name = "Calibri"
    r_axis.font.size = Pt(10)
    r_axis.font.bold = True
    r_axis.font.color.rgb = RGBColor(15, 23, 42)
    
    r_title = title_p.add_run("CONTRACT DE ÎNCHIRIERE AUTO / LEASING OPERAȚIONAL")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(15)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(14, 116, 144)

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_nr = sub_p.add_run("Nr. Înregistrare: {{nr_contract}} / Data: {{data_contract}}")
    r_nr.font.size = Pt(10)
    r_nr.font.italic = True
    r_nr.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # CAP I
    p_cap1 = doc.add_paragraph()
    r = p_cap1.add_run("CAPITOLUL I. PĂRȚILE CONTRACTANTE")
    r.font.size = Pt(12)
    r.font.bold = True
    
    p_parties = doc.add_paragraph()
    p_parties.paragraph_format.line_spacing = 1.15
    p_parties.add_run(
        "1.1. S.C. AXIS RENT S.R.L., cu sediul în București, CIF RO12345678, denumită în continuare „LOCATOR”;\n\n"
        "1.2. {{client_name}}, CIF/CUI/CNP {{client_cui}}, cu sediul/domiciliul în {{client_address}}, "
        "reprezentată prin {{client_representative}}, denumită în continuare „LOCATAR”."
    )

    # CAP II
    p_cap2 = doc.add_paragraph()
    r = p_cap2.add_run("CAPITOLUL II. OBIECTUL CONTRACTULUI")
    r.font.size = Pt(12)
    r.font.bold = True

    table_v = doc.add_table(rows=4, cols=2)
    table_v.alignment = WD_TABLE_ALIGNMENT.CENTER
    vehicle_rows = [
        ("Marcă și Model:", "{{vehicle_make}} {{vehicle_model}}"),
        ("Serie Șasiu (VIN):", "{{vehicle_vin}}"),
        ("Număr de Înmatriculare:", "{{vehicle_plate}}"),
        ("Preț Valoare de Bază:", "{{vehicle_price}} {{currency}}")
    ]
    for idx, (label, val) in enumerate(vehicle_rows):
        row = table_v.rows[idx]
        row.cells[0].paragraphs[0].add_run(label).font.bold = True
        row.cells[1].paragraphs[0].add_run(val)
        set_cell_background(row.cells[0], "F1F5F9")
        set_cell_margins(row.cells[0], 60, 60, 100, 100)
        set_cell_margins(row.cells[1], 60, 60, 100, 100)

    # CAP III
    p_cap3 = doc.add_paragraph()
    r = p_cap3.add_run("\nCAPITOLUL III. CONDIȚII FINANCIARE")
    r.font.size = Pt(12)
    r.font.bold = True

    table_f = doc.add_table(rows=4, cols=2)
    table_f.alignment = WD_TABLE_ALIGNMENT.CENTER
    financial_rows = [
        ("Perioadă Contractuală:", "{{period_months}} luni"),
        ("Avans Inițial:", "{{advance_percent}}% ({{advance_amount}} {{currency}})"),
        ("Rată Lunară de Folosință:", "{{monthly_rate}} {{currency}} (fără TVA)"),
        ("Valoare Reziduală:", "{{residual_value_percent}}% ({{residual_value_amount}} {{currency}})")
    ]
    for idx, (label, val) in enumerate(financial_rows):
        row = table_f.rows[idx]
        row.cells[0].paragraphs[0].add_run(label).font.bold = True
        row.cells[1].paragraphs[0].add_run(val)
        set_cell_background(row.cells[0], "F8FAFC")
        set_cell_margins(row.cells[0], 60, 60, 100, 100)
        set_cell_margins(row.cells[1], 60, 60, 100, 100)

    # Semnaturi 2 coloane
    doc.add_paragraph("\n")
    table_s = doc.add_table(rows=2, cols=2)
    table_s.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_s.rows[0].cells[0].paragraphs[0].add_run("LOCATOR\nAXIS RENT S.R.L.").font.bold = True
    table_s.rows[0].cells[1].paragraphs[0].add_run("LOCATAR\n{{client_name}}").font.bold = True
    table_s.rows[1].cells[0].paragraphs[0].add_run("\n\n_____________________\nSemnătură").font.size = Pt(9)
    table_s.rows[1].cells[1].paragraphs[0].add_run("\n\n_____________________\nSemnătură").font.size = Pt(9)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    print(f"Generated standard template at: {output_path}")

if __name__ == "__main__":
    templates_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend/templates"))
    create_official_fidejusor_template(os.path.join(templates_dir, "contract_template_fidejusor.docx"))
    create_standard_contract_template(os.path.join(templates_dir, "contract_template.docx"))
    create_standard_contract_template(os.path.join(templates_dir, "contract_template_leasing.docx"))
