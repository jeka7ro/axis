from datetime import datetime
import httpx
import json

class AnafScraper:
    def __init__(self):
        self.base_url = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"

    async def fetch_company_data(self, cui: str) -> dict:
        """
        Fetches basic company data from the ANAF public API.
        Since ANAF API is public, we can query it directly using httpx.
        """
        try:
            today_str = datetime.now().strftime("%Y-%m-%d")
            payload = [{"cui": int(cui), "data": today_str}]
            
            async with httpx.AsyncClient() as client:
                response = await client.post(self.base_url, json=payload, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("found") and len(data["found"]) > 0:
                        company_info = data["found"][0].get("date_generale", {})
                        tva_info = data["found"][0].get("inregistrare_scop_Tva", {})
                        
                        return {
                            "nume": company_info.get("denumire", ""),
                            "cui": cui,
                            "adresa": company_info.get("adresa", ""),
                            "reg_com": company_info.get("nrRegCom", ""),
                            "tva_activ": tva_info.get("scpTVA", False),
                            "datorii_estimate": self._estimate_debts(company_info),
                            "status": "Activa" if "INREGISTRAT" in company_info.get("stare_inregistrare", "") else "Radiata"
                        }
            
            # Daca ANAF nu a gasit CUI-ul sau a fost o eroare, intoarcem gol ca sa nu apara date false
            return {}
            
        except Exception as e:
            print(f"Eroare ANAF Scraper: {e}")
            return {}
            
    def _estimate_debts(self, raw_data: dict) -> float:
        # ANAF doesn't expose debts in this endpoint. We return 0.0 for now.
        return 0.0
