import httpx
from typing import List, Dict

import os

class RegistryScraper:
    def __init__(self):
        self.api_url = "https://api.openapi.ro/api/companies"
        self.api_key = os.getenv("OPENAPI_KEY", "H6FipvsmxZ9ztBb47L4Zk2UJqkHjZAMydoGWTvJpnm2VL1keAg")
        
        # Noua cheie pentru Termene.ro (pentru Caracatița Asociaților)
        self.termene_api_key = os.getenv("TERMENE_API_KEY", "YOUR_TERMENE_API_KEY_HERE")

    async def fetch_company_personnel(self, cui: str) -> List[Dict]:
        """Extrage asociații și administratorii (via FirmeAPI.ro)"""
        try:
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "x23ixdtj-f6fij792-4loaiq2z-grtun87p")
            headers = {
                "Authorization": f"Bearer {firmeapi_key}",
                "Accept": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                # Folosim noul provider FirmeAPI.ro
                response = await client.get(f"https://www.firmeapi.ro/api/v1/administratori/{cui}", headers=headers, timeout=15.0)
                
                if response.status_code == 200:
                    data = response.json()
                    personnel = []
                    
                    # Răspunsul de succes de la FirmeAPI
                    # Depinde de structura lor, presupunem că avem un array sub "data"
                    admin_data = data.get("data", [])
                    if isinstance(admin_data, list):
                        for p in admin_data:
                            nume = p.get("nume", "")
                            if not nume: continue
                            personnel.append({
                                "nume": nume,
                                "rol": p.get("functie", "Administrator"),
                                "cota_participare": float(p.get("cota", 0)),
                                "alte_companii_active": p.get("companii_active", 0) or 0,
                                "companii_faliment": p.get("companii_faliment", 0) or 0
                            })
                    return personnel
                elif response.status_code == 403:
                    # Contul e în pending (credite neactivate) sau pachet insuficient
                    print(f"FirmeAPI: Acces refuzat (403). Detalii: {response.text}")
                    return []
                else:
                    print(f"FirmeAPI a returnat status {response.status_code}")
                    return []
        except Exception as e:
            print(f"Eroare API FirmeAPI personnel: {e}")
            return []

    async def fetch_company_balance(self, cui: str) -> Dict:
        """Extrage bilanțul contabil de la OpenAPI.ro"""
        if self.api_key == "YOUR_API_KEY_HERE":
            print(f"Warning: Missing OpenAPI key. Returning mock balance for CUI {cui}")
            return self._mock_balance_data(cui)
            
        try:
            headers = {"x-api-key": self.api_key}
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.api_url}/{cui}/balances", headers=headers, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        # Sort to get the latest year
                        sorted_data = sorted(data, key=lambda x: x.get("year", 0), reverse=True)
                        latest = sorted_data[0]
                        latest_data = latest.get("data", {})
                        
                        profit = latest_data.get("profit_net", latest_data.get("profit_curent", 0))
                        pierdere = latest_data.get("pierdere_neta", latest_data.get("pierdere_curenta", 0))
                        
                        # Calculate net profit (positive or negative)
                        profit_net = profit if profit > 0 else -pierdere
                        
                        return {
                            "an": latest.get("year", "N/A"),
                            "cifra_afaceri": latest_data.get("cifra_de_afaceri_neta", 0),
                            "profit_net": profit_net,
                            "datorii": latest_data.get("datorii_total", 0),
                            "angajati": latest_data.get("numar_mediu_de_salariati", 0) or 0
                        }
                return {}
        except Exception as e:
            print(f"Eroare API OpenAPI financials: {e}")
            return {}

    def _mock_balance_data(self, cui: str) -> Dict:
        # Fallback in case of missing key
        return {
            "an": 2024,
            "cifra_afaceri": 1250000,
            "profit_net": 150000,
            "datorii": 45000,
            "angajati": 12
        }

    def _mock_registry_data(self, cui: str) -> List[Dict]:
        if cui == "9876543": # Mock for Dino Construct (Bad actor)
            return [
                {
                    "nume": "Ionut Dino",
                    "rol": "Administrator",
                    "cota_participare": 100,
                    "alte_companii_active": 1,
                    "companii_faliment": 3
                },
                {
                    "nume": "Maria Dino",
                    "rol": "Asociat",
                    "cota_participare": 0,
                    "alte_companii_active": 0,
                    "companii_faliment": 0
                }
            ]
        else:
            return [
                {
                    "nume": "Administrator General",
                    "rol": "Administrator",
                    "cota_participare": 100,
                    "alte_companii_active": 0,
                    "companii_faliment": 0
                }
            ]
