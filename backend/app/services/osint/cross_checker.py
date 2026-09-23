from typing import Dict, List

class CrossChecker:
    def __init__(self):
        pass

    def analyze_ownership_structure(self, personnel_data: List[Dict], admin_networks: List[Dict] = None) -> Dict:
        """
        Analiză inteligentă de structură corporate: Asociați, Beneficiari Reali, Cesiuni și Risc Rețea.
        """
        active_shareholders = [p for p in personnel_data if p.get("este_asociat") and p.get("stare") == "Activ"]
        historic_shareholders = [p for p in personnel_data if p.get("este_asociat") and p.get("stare") != "Activ"]
        active_admins = [p for p in personnel_data if p.get("este_administrator") and p.get("stare") == "Activ"]
        
        insights = []
        beneficiar_real = "Nedeterminat"
        tip_control = "Nespecificat"
        
        # 1. Beneficiar Real
        if len(active_shareholders) == 1:
            s = active_shareholders[0]
            cota = s.get("cota_participare", 100)
            beneficiar_real = f"{s['nume']} ({cota:.0f}%)"
            tip_control = "ASOCIAT UNIC" if cota >= 99 else "CONTROL MAJORITAR"
            insights.append(f"Beneficiar Real & Control: {s['nume']} deține {cota:.0f}% din părțile sociale ale companiei ({tip_control}).")
        elif len(active_shareholders) > 1:
            maj = next((s for s in active_shareholders if s.get("cota_participare", 0) > 50), None)
            if maj:
                beneficiar_real = f"{maj['nume']} ({maj['cota_participare']:.0f}%)"
                tip_control = "CONTROL MAJORITAR"
                insights.append(f"Acționar Majoritar: {maj['nume']} deține pachetul de control ({maj['cota_participare']:.0f}%).")
            else:
                beneficiar_real = "Acționariat Partajat (Fără majoritar absolut)"
                tip_control = "CONTROL PARTAJAT"
                parts = ", ".join(f"{s['nume']} ({s.get('cota_participare', 0):.0f}%)" for s in active_shareholders)
                insights.append(f"Acționariat Partajat: {parts}.")
        elif active_admins:
            tip_control = "DOAR ADMINISTRATORI ÎNREGISTRAȚI"
            beneficiar_real = f"Administrator: {active_admins[0]['nume']}"
            insights.append(f"Conducere Executivă: Administrator înregistrat {active_admins[0]['nume']}.")

        # 2. Separare Management vs. Proprietate
        unshared_admins = [a["nume"] for a in active_admins if not a.get("este_asociat") or a.get("cota_participare", 0) == 0]
        separare_management = len(unshared_admins) > 0
        if unshared_admins:
            insights.append(f"Management Mandatat: Administratorul curent ({', '.join(unshared_admins)}) nu deține părți sociale (mandat executiv extern).")
        elif active_shareholders and any(s.get("este_administrator") for s in active_shareholders):
            insights.append("Antreprenor Direct: Asociatul principal exercită concomitent și funcția de administrator.")

        # 3. Istoric Cesiuni / Transferuri Părți Sociale
        istoric_cesiuni = []
        if historic_shareholders:
            for hs in historic_shareholders:
                period = f" (perioada {hs.get('data_numire', '')} – {hs.get('data_sfarsit', '')})" if hs.get("data_numire") else ""
                istoric_cesiuni.append(f"{hs['nume']} a deținut {hs.get('cota_participare', 0):.0f}%{period}")
            insights.append(f"Istoric Cesiuni: Foști asociați retrași din societate: {', '.join(istoric_cesiuni)}.")

        # 4. Rețea Asociați & Conducere (Caracatița)
        caracatita_summary = []
        if admin_networks:
            for net in admin_networks:
                p_name = net.get("nume", "")
                tf = net.get("total_firme", 0)
                act = net.get("firme_active", 0)
                if tf > 1:
                    caracatita_summary.append(f"{p_name}: {tf} firme asociate ({act} active)")
            if caracatita_summary:
                insights.append(f"Expunere Rețea: {'; '.join(caracatita_summary)}.")

        return {
            "beneficiar_real": beneficiar_real,
            "tip_control": tip_control,
            "separare_management": separare_management,
            "istoric_cesiuni": istoric_cesiuni,
            "insights": insights,
            "active_shareholders_count": len(active_shareholders),
            "active_admins_count": len(active_admins),
            "historic_shareholders_count": len(historic_shareholders)
        }

    def evaluate_risk(
        self,
        anaf_data: Dict,
        personnel_data: List[Dict],
        balance_data: Dict,
        address_data: Dict,
        bpi_data: Dict,
        mof_data: List[Dict],
        admin_networks: List[Dict] = None,
        holdings_data: List[Dict] = None,
        administrators_data: List[Dict] = None,
        caen_data: Dict = None
    ) -> Dict:
        """
        Cross-checks ANAF data with personnel history (shareholders & administrators), financial balance sheets, BPI (Insolvență), MOF and network ("Caracatița").
        """
        risk_score = 0
        flags = []
        
        # 0. Verificare Insolvență BPI (Risc Maxim)
        if bpi_data and bpi_data.get("has_insolvency"):
            count = bpi_data.get("count", 1)
            risk_score += 85
            flags.append(f"ALERTA CRITICĂ: Compania figurează în Buletinul Procedurilor de Insolvență (BPI) cu {count} dosare/publicații active!")

        # 1. Verifica Inactivitate Fiscala si Status ANAF
        if anaf_data.get("inactiv_fiscal") is True:
            risk_score += 60
            flags.append("Compania este declarată INACTIVĂ FISCAL de către ANAF (Risc Critic!)")

        if anaf_data.get("status") != "Activa":
            risk_score += 50
            flags.append(f"Compania figurează cu status: {anaf_data.get('status', 'Radiată')} la ANAF.")

        if not anaf_data.get("tva_activ", True):
            risk_score += 15
            flags.append("Compania NU este plătitoare de TVA (fără cod valid TVA).")

        vechime = anaf_data.get("vechime_ani")
        if vechime is not None and isinstance(vechime, int):
            if vechime < 1:
                risk_score += 20
                flags.append("Companie recent înființată (vechime sub 1 an) - lipsă istoric financiar extins.")

        # 2. Analiză Inteligentă Asociați & Conducere (Smart Ownership Analysis)
        smart_ownership = self.analyze_ownership_structure(personnel_data, admin_networks)
        
        for person in personnel_data:
            if person.get("companii_faliment", 0) > 0:
                risk_score += (person.get("companii_faliment") * 20)
                flags.append(f"{person.get('rol', 'Persoana cheie')} {person.get('nume')} a falimentat {person.get('companii_faliment')} firme anterior.")
                
            if person.get("alte_companii_active", 0) > 3:
                risk_score += 10
                flags.append(f"Atenție: {person.get('nume')} gestionează mai mult de 3 companii simultan.")

        # 2b. Cross-Check Rețea Firme Asociați & Administratori (Caracatița extinsă)
        if admin_networks:
            for person in admin_networks:
                p_name = person.get("nume", "")
                firme_totale = person.get("total_firme", 0)
                firme_active = person.get("firme_active", 0)
                firme_incetate = person.get("firme_incetate", 0)
                
                if firme_totale > 3:
                    risk_score += 10
                    flags.append(f"Rețea extinsă: {p_name} deține/administrează un portofoliu de {firme_totale} companii ({firme_active} active).")
                if firme_incetate > 1:
                    risk_score += 15
                    flags.append(f"Atenție istoric: {p_name} figurează cu {firme_incetate} firme încetate / radiate anterior.")

        # 3. Financial Health (Bilanț Contabil)
        if balance_data:
            ca = balance_data.get("cifra_afaceri", 0) or 0
            datorii = balance_data.get("datorii", 0) or 0
            profit_net = balance_data.get("profit_net", 0) or 0
            cap_proprii = balance_data.get("capitaluri_proprii", 0) or 0

            # Capitaluri proprii negative conform Legea 31/1990
            if cap_proprii < 0:
                risk_score += 30
                flags.append("Capitaluri proprii negative în bilanț (Risc legal de dizolvare art. 153^24 Legea 31/1990).")

            if profit_net < 0:
                risk_score += 15
                flags.append(f"Compania a raportat pierderi în ultimul bilanț ({balance_data.get('an', 'recent')}).")

            if ca > 0 and datorii > ca * 1.5:
                risk_score += 25
                flags.append("Gradul de îndatorare depășește cu 150% cifra de afaceri!")
            elif ca == 0 and datorii > 50000:
                risk_score += 30
                flags.append(f"Cifră de afaceri 0 și datorii active de {datorii:,.0f} RON!")

            evol = balance_data.get("evolutie_venituri_pct")
            if evol is not None and evol < -40:
                risk_score += 20
                flags.append(f"Declin sever al cifrei de afaceri ({evol}% vs exercițiul precedent).")
                
        # 4. Verificare Sediu & Cluster Firme (Căsuță Poștală / Firmă fantomă)
        if address_data:
            cluster_count = address_data.get("cluster_count", 0)
            if cluster_count >= 10:
                risk_score += 20
                flags.append(f"Sediu cu risc ridicat (Căsuță Poștală): Peste {cluster_count} firme înregistrate la aceeași adresă/clădire!")
            elif cluster_count >= 5:
                risk_score += 10
                flags.append(f"Atenție: Densitate ridicată de firme ({cluster_count} firme) la aceeași adresă/clădire.")
                
        # Normalize score
        final_score = max(5, 100 - min(risk_score, 95))
        
        return {
            "osint_score": final_score,
            "osint_flags": flags,
            "smart_ownership": smart_ownership,
            "raw_anaf": anaf_data,
            "raw_personnel": personnel_data,
            "raw_holdings": holdings_data or [],
            "raw_administrators": administrators_data or [],
            "raw_caen_activities": caen_data or {},
            "raw_balance": balance_data or {},
            "raw_address": address_data or {},
            "raw_bpi": bpi_data or {},
            "raw_mof": mof_data or [],
            "admin_networks": admin_networks or []
        }
