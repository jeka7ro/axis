from typing import Dict, List

class CrossChecker:
    def __init__(self):
        pass

    def evaluate_risk(self, anaf_data: Dict, personnel_data: List[Dict], balance_data: Dict = None) -> Dict:
        """
        Cross-checks ANAF data with personnel history and financial balance sheets to flag hidden risks.
        """
        risk_score = 0
        flags = []
        
        # 1. Verifica Datorii (ANAF/Insolvency)
        if anaf_data.get("datorii_estimate", 0) > 50000:
            risk_score += 40
            flags.append("Compania are datorii active semnificative.")
            
        # 2. Verifica Status TVA/Firma
        if not anaf_data.get("tva_activ", True) or anaf_data.get("status") != "Activa":
            risk_score += 50
            flags.append("Compania are probleme la statusul legal / TVA.")
            
        # 3. Cross-Check Administratori (Caracatița)
        for person in personnel_data:
            if person.get("companii_faliment", 0) > 0:
                risk_score += (person.get("companii_faliment") * 20)
                flags.append(f"Administratorul {person.get('nume')} a falimentat {person.get('companii_faliment')} firme anterior.")
                
            if person.get("alte_companii_active", 0) > 3:
                risk_score += 10
                flags.append(f"Atenție: {person.get('nume')} gestionează mai mult de 3 companii simultan (Posibil grup organizat).")

        # 4. Financial Health (Bilanț)
        if balance_data:
            if balance_data.get("profit_net", 0) < 0:
                risk_score += 15
                flags.append(f"Compania a raportat pierderi în ultimul bilanț ({balance_data.get('an', 'recent')}).")
            if balance_data.get("datorii", 0) > balance_data.get("cifra_afaceri", 1) * 1.5:
                risk_score += 25
                flags.append(f"Gradul de îndatorare depășește cu 150% cifra de afaceri!")
                
        # Normalize score
        final_score = 100 - min(risk_score, 100)
        
        return {
            "osint_score": final_score,
            "osint_flags": flags,
            "raw_anaf": anaf_data,
            "raw_personnel": personnel_data,
            "raw_balance": balance_data or {}
        }
