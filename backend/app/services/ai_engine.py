import json
from typing import Dict, Any

class AIEngineService:
    """
    Motor de Inteligență Artificială ce procesează datele agregate din "Caracatița" OSINT.
    În producție, acest engine trimite JSON-ul structurat către OpenAI / Google Gemini pentru o decizie nuanțată.
    """
    
    @staticmethod
    def evaluate_client(name: str, osint_data: Dict[str, Any]) -> Dict[str, Any]:
        osint_score = osint_data.get("osint_score", 50)
        osint_flags = osint_data.get("osint_flags", [])
        
        # 1. Analiza Risc pe baza Caracatiței
        score = osint_score
        
        # 2. Generare Răspuns (Simularea LLM-ului care procesează promptul OSINT)
        if score > 80:
            risk_level = "Scăzut"
            summary = f"Clientul {name} prezintă un profil financiar solid. Fără alerte în rețeaua de administratori (Analiza OSINT OK)."
        elif score > 50:
            risk_level = "Mediu"
            summary = f"Clientul {name} are un grad de risc moderat. Atenție la indicatorii extrași: {', '.join(osint_flags[:1]) if osint_flags else 'N/A'}"
        else:
            risk_level = "Ridicat" if score > 35 else "Critic"
            flags_text = "; ".join(osint_flags)
            summary = f"RISC MAJOR identificat prin OSINT pentru {name}. Probleme semnalate: {flags_text}. Se recomandă respingerea colaborării."
            
        return {
            "score": score,
            "risk_level": risk_level,
            "ai_summary": summary,
            "raw_financial_data": json.dumps({
                "anaf": osint_data.get("raw_anaf", {}),
                "personnel": osint_data.get("raw_personnel", []),
                "osint_flags": osint_data.get("osint_flags", []),
                "balance": osint_data.get("raw_balance", {})
            })
        }
