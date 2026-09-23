import httpx
import xml.etree.ElementTree as ET
from typing import List, Dict
import asyncio
import time

class CourtScraper:
    """
    Interoghează în timp real serviciul oficial al Ministerului Justiției (Portal Just.ro)
    pentru a identifica dosare, litigii, executări și proceduri de insolvență / faliment.
    """
    def __init__(self):
        self.endpoint = "http://portalquery.just.ro/Query.asmx"
        self._cache = {} # cache query -> (timestamp, results)
        self.cache_ttl = 3600 # 1 hour

    async def search_court_cases(self, query: str, limit: int = 25) -> List[Dict]:
        clean_query = query.strip() if query else ""
        if not clean_query or len(clean_query) < 3:
            return []

        # Check cache
        cache_key = clean_query.lower()
        if cache_key in self._cache:
            ts, cached_data = self._cache[cache_key]
            if time.time() - ts < self.cache_ttl:
                return cached_data[:limit]

        soap_body = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CautareDosare2 xmlns="portalquery.just.ro">
      <numeParte>{clean_query}</numeParte>
    </CautareDosare2>
  </soap:Body>
</soap:Envelope>"""

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "portalquery.just.ro/CautareDosare2"
        }

        try:
            async with httpx.AsyncClient(verify=False, timeout=12.0) as client:
                resp = await client.post(self.endpoint, content=soap_body, headers=headers)
                if resp.status_code != 200:
                    print(f"Portal Just status code: {resp.status_code}")
                    return []

                root = ET.fromstring(resp.text)
                ns = {"pq": "portalquery.just.ro"}
                dosare_xml = root.findall(".//pq:Dosar", ns)

                results = []
                for d in dosare_xml:
                    numar = d.findtext("pq:numar", "", ns)
                    data_raw = d.findtext("pq:data", "", ns)
                    data_clean = data_raw[:10] if data_raw else ""
                    institutie = d.findtext("pq:institutie", "", ns)
                    obiect = d.findtext("pq:obiect", "", ns)
                    categorie = d.findtext("pq:categorieCazNume", "", ns)
                    stadiu = d.findtext("pq:stadiuProcesualNume", "", ns)

                    parti = []
                    for p in d.findall(".//pq:DosarParte", ns):
                        parti.append({
                            "nume": p.findtext("pq:nume", "", ns),
                            "calitate": p.findtext("pq:calitateParte", "", ns)
                        })

                    sedinte = []
                    for s in d.findall(".//pq:DosarSedinta", ns):
                        s_data = s.findtext("pq:data", "", ns)
                        sedinte.append({
                            "data": s_data[:10] if s_data else "",
                            "solutie": s.findtext("pq:solutie", "", ns),
                            "sumar": s.findtext("pq:solutieSumar", "", ns)
                        })

                    # Sort sessions descending by date
                    sedinte.sort(key=lambda x: x["data"], reverse=True)

                    results.append({
                        "numar": numar,
                        "data": data_clean,
                        "institutie": institutie,
                        "obiect": obiect,
                        "categorie": categorie,
                        "stadiu": stadiu,
                        "parti": parti,
                        "sedinte": sedinte[:3], # take latest 3 hearings
                        "ultima_solutie": sedinte[0]["solutie"] if sedinte else "În curs",
                        "url_portal": f"https://portal.just.ro/SitePages/cautare.aspx?k={numar}"
                    })

                # Sort cases descending by registration date
                results.sort(key=lambda x: x["data"], reverse=True)
                self._cache[cache_key] = (time.time(), results)
                return results[:limit]

        except Exception as e:
            print(f"Eroare căutare Portal Just pentru '{clean_query}': {e}")
            return []
