from datetime import datetime
import httpx
import json
from .caen_helper import get_caen_details, get_caen_description

class AnafScraper:
    def __init__(self):
        self.base_url = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"

    async def fetch_company_data(self, cui: str) -> dict:
        """
        Fetches official company data from the ANAF public API v9.
        Extracts legal status, VAT status, fiscal inactivity, CAEN code, registration date, phone, etc.
        """
        try:
            today_str = datetime.now().strftime("%Y-%m-%d")
            # Ensure CUI is numeric
            clean_cui = "".join(filter(str.isdigit, str(cui)))
            if not clean_cui:
                return {}

            payload = [{"cui": int(clean_cui), "data": today_str}]
            
            async with httpx.AsyncClient() as client:
                response = await client.post(self.base_url, json=payload, timeout=12.0)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("found") and len(data["found"]) > 0:
                        company_info = data["found"][0].get("date_generale", {})
                        tva_info = data["found"][0].get("inregistrare_scop_Tva", {})
                        inactiv_info = data["found"][0].get("stare_inactiv", {})
                        rtvai_info = data["found"][0].get("inregistrare_RTVAI", {})
                        split_info = data["found"][0].get("inregistrare_SplitTVA", {})

                        # Calculate company age in years
                        data_inreg = company_info.get("data_inregistrare", "")
                        vechime_ani = None
                        if data_inreg:
                            try:
                                an_inreg = int(data_inreg.split("-")[0])
                                vechime_ani = datetime.now().year - an_inreg
                            except Exception:
                                pass
                        
                        stare = company_info.get("stare_inregistrare", "")
                        is_active = "INREGISTRAT" in stare and "RADIAT" not in stare.upper()

                        return {
                            "nume": company_info.get("denumire", ""),
                            "cui": clean_cui,
                            "adresa": company_info.get("adresa", ""),
                            "reg_com": company_info.get("nrRegCom", ""),
                            "telefon": company_info.get("telefon") or "Nespecificat",
                            "cod_caen": company_info.get("cod_CAEN") or "N/A",
                            "caen_descriere": get_caen_description(company_info.get("cod_CAEN")),
                            "caen_sectiune": get_caen_details(company_info.get("cod_CAEN")).get("sectiune", ""),
                            "forma_juridica": company_info.get("forma_juridica") or "N/A",
                            "organ_fiscal": company_info.get("organFiscalCompetent") or "N/A",
                            "data_inregistrare": data_inreg or "N/A",
                            "vechime_ani": vechime_ani,
                            "tva_activ": bool(tva_info.get("scpTVA", False)),
                            "tva_la_incasare": bool(rtvai_info.get("statusTvaIncasare", False)),
                            "split_tva": bool(split_info.get("statusSplitTVA", False)),
                            "inactiv_fiscal": bool(inactiv_info.get("statusInactivi", False)),
                            "status_ro_efactura": bool(company_info.get("statusRO_e_Factura", False)),
                            "datorii_estimate": 0.0,
                            "status": "Activa" if is_active else "Radiata"
                        }
            
            return {}
            
        except Exception as e:
            print(f"Eroare ANAF Scraper: {e}")
            return {}
