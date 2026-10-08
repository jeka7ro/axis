import httpx
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
from typing import List, Dict
import asyncio
import time
import re

class CourtScraper:
    """
    Interoghează în timp real serviciul oficial al Ministerului Justiției (Portal Just.ro)
    pentru a identifica dosare, litigii, executări și proceduri de insolvență / faliment.
    
    Îmbunătățiri:
    - Curățare automată a formelor juridice (S.R.L., SRL, S.A., SC etc.) pentru a preveni
      eșuarea căutărilor cauzată de discrepanțele de redactare ale grefierilor din instanțe.
    - Suport pentru permutarea numelui la persoane fizice (Nume Prenume <-> Prenume Nume)
      și normalizarea diacriticelor românești.
    - Escapare XML corectă (ex: companii ce conțin '&' precum 'BETTING & GAMING').
    - Deduplicare inteligentă a dosarelor după numărul unic de dosar.
    """
    def __init__(self):
        self.endpoint = "http://portalquery.just.ro/Query.asmx"
        self._cache = {} # cache query -> (timestamp, results)
        self.cache_ttl = 3600 # 1 hour

    def get_search_variants(self, query: str) -> List[str]:
        q = query.strip()
        if not q or len(q) < 2:
            return []

        variants = []

        # Detectare dacă este companie pe baza formelor juridice sau a cuvintelor corporative
        is_company = bool(re.search(
            r'\b(S\.?R\.?L\.?|S\.?A\.?|S\.?C\.?S\.?|S\.?N\.?C\.?|S\.?P\.?R\.?L\.?|R\.?A\.?|SC|S\.C\.|SRL|SA|PFA|II|IF|LTD|GMBH|GROUP|NETWORK|INVEST|SOLUTIONS|PRODUCT|SYSTEMS|CORP|HOLDING|TRADING|INTERNATIONAL)\b',
            q,
            re.IGNORECASE
        ))

        # Curățare denumire companie
        clean_comp = re.sub(r'^(S\.?C\.?|SOCIETATEA|COMPANIA)\s+', '', q, flags=re.IGNORECASE)
        clean_comp = re.sub(r'\s+(S\.?R\.?L\.?|S\.?A\.?|S\.?C\.?S\.?|S\.?N\.?C\.?|S\.?P\.?R\.?L\.?|R\.?A\.?)$', '', clean_comp, flags=re.IGNORECASE)
        clean_comp = re.sub(r'[\"\'\`«»]', '', clean_comp).strip()
        clean_comp = re.sub(r'\s+', ' ', clean_comp)

        # 1. Varianta principală curățată (ex: "SMARTFLIX" sau "INTERGAME SELECT")
        if clean_comp and len(clean_comp) >= 3:
            variants.append(clean_comp)

        # 2. Varianta brută inițială dacă e diferită
        if q not in variants and len(q) >= 3:
            variants.append(q)

        # 3. Tratamente specifice persoane fizice (inversare nume / diacritice)
        if not is_company:
            words = clean_comp.split()
            if 2 <= len(words) <= 3:
                reversed_name = " ".join(reversed(words))
                if reversed_name not in variants:
                    variants.append(reversed_name)

            # Normalizare diacritice românești
            diacritics_map = str.maketrans('ăâîșțĂÂÎȘȚ', 'aaiștAAIST')
            no_diacritics = clean_comp.translate(diacritics_map)
            if no_diacritics not in variants:
                variants.append(no_diacritics)

        # 4. Fallback brand distinctiv pentru grupuri compuse (ex: "SUPERBET ONLINE" -> "SUPERBET")
        if is_company and ' ' in clean_comp:
            tokens = clean_comp.split()
            first_token = tokens[0].strip()
            # Adăugăm primul termen doar dacă e distinctiv (minim 4 litere și nu este generic)
            generic_words = {"GRUP", "GROUP", "INVEST", "TRADE", "GLOBAL", "TOTAL", "EURO", "AUTO"}
            if len(first_token) >= 4 and first_token.upper() not in generic_words:
                if first_token not in variants:
                    variants.append(first_token)

        return variants

    async def _query_soap(self, term: str, client: httpx.AsyncClient) -> List[Dict]:
        safe_term = escape(term.strip())
        soap_body = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CautareDosare2 xmlns="portalquery.just.ro">
      <numeParte>{safe_term}</numeParte>
    </CautareDosare2>
  </soap:Body>
</soap:Envelope>"""

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "portalquery.just.ro/CautareDosare2"
        }

        try:
            resp = await client.post(self.endpoint, content=soap_body, headers=headers)
            if resp.status_code != 200:
                print(f"[JUST.RO] Query '{term}' HTTP {resp.status_code}")
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

            return results

        except Exception as e:
            print(f"[JUST.RO ERROR] Eroare căutare '{term}': {e}")
            return []

    async def search_court_cases(self, query: str, limit: int = 25) -> List[Dict]:
        clean_query = query.strip() if query else ""
        if not clean_query or len(clean_query) < 3:
            return []

        # Check in-memory cache
        cache_key = clean_query.lower()
        if cache_key in self._cache:
            ts, cached_data = self._cache[cache_key]
            if time.time() - ts < self.cache_ttl:
                return cached_data[:limit]

        variants = self.get_search_variants(clean_query)
        all_cases = []
        seen_numbers = set()

        async with httpx.AsyncClient(verify=False, timeout=18.0) as client:
            for term in variants:
                cases = await self._query_soap(term, client)
                for c in cases:
                    if c["numar"] not in seen_numbers:
                        seen_numbers.add(c["numar"])
                        all_cases.append(c)

                # Dacă am găsit deja suficiente dosare relevante cu varianta principală curățată, ne oprim
                if len(all_cases) >= limit:
                    break

        # Sort cases descending by registration date
        all_cases.sort(key=lambda x: x["data"], reverse=True)
        results = all_cases[:limit]

        # Salvare în cache
        self._cache[cache_key] = (time.time(), results)
        return results
