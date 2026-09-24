import httpx
import os
import re
import urllib.parse
from typing import Dict, Any, List, Optional

class AddressChecker:
    def __init__(self):
        self.firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
        self.headers = {
            "Authorization": f"Bearer {self.firmeapi_key}",
            "Accept": "application/json"
        }

    def _normalize_text(self, s: str) -> str:
        if not s:
            return ""
        s = s.upper()
        return (
            s.replace("Ă", "A")
            .replace("Â", "A")
            .replace("Î", "I")
            .replace("Ș", "S")
            .replace("Ş", "S")
            .replace("Ț", "T")
            .replace("Ţ", "T")
        )

    def _extract_location_info(self, address: str) -> Dict[str, Any]:
        """
        Extrage structurat detaliile adresei:
        - clean_address: adresa fără ghilimele («, ») sau zgomot
        - city: Orașul / Municipiul (ex: 'Bucuresti')
        - sector: Sectorul (ex: 'Sector 4')
        - county: Județul
        - street: Numele complet al străzii
        - street_kw: Cuvintele cheie ale străzii pentru căutare
        - number: Numărul clădirii (ex: '10' sau '3-5')
        - search_query: Query optimizat pentru FirmeAPI
        """
        clean = re.sub(r'[«»\"\'„”]', '', address).strip()
        clean = re.sub(r'\s+', ' ', clean)
        norm = self._normalize_text(clean)

        city = None
        sector = None
        county = None

        if "BUCURE" in norm or "SECTOR" in norm:
            city = "Bucuresti"
            sec_match = re.search(r'SECTOR(?:UL)?\s*(\d+)|SEC\.\s*(\d+)', norm)
            if sec_match:
                s_num = sec_match.group(1) or sec_match.group(2)
                sector = f"Sector {s_num}"
        else:
            mun_match = re.search(r'(?:MUN\.|MUNICIPIUL|ORAS|COM\.|COMUNA)\s+([A-Z\s\-]+?)(?:,|$)', norm)
            if mun_match:
                city = mun_match.group(1).strip().title()
            jud_match = re.search(r'(?:JUD\.|JUDETUL)\s+([A-Z\s\-]+?)(?:,|$)', norm)
            if jud_match:
                county = jud_match.group(1).strip().title()

        # Nume stradă
        street_raw = ""
        m_str = re.search(r'((?:STR|BLD|BD|PŢA|PTA|PIATA|CALEA|SOSEAUA|ŞOS|SOS|ALEEA|INTR\.|STRADA|BULEVARDUL)[\.\w\s\-]+?)(?:,|$|NR)', clean, re.IGNORECASE)
        if m_str:
            street_raw = m_str.group(1).strip()
        else:
            for part in clean.split(','):
                if any(k in part.upper() for k in ['STR', 'BLD', 'PTA', 'PIATA', 'CALEA', 'ALEEA']):
                    street_raw = part.strip()
                    break

        # Număr
        num_raw = ""
        m_num = re.search(r'NR\.?\s*([0-9]+(?:[\-\/][0-9]+|[A-Za-z])*)', clean, re.IGNORECASE)
        if m_num:
            num_raw = m_num.group(1).strip()

        # Cuvânt cheie pentru căutare FirmeAPI
        clean_street_kw = re.sub(r'^(?:STR\b|STRADA|BLD\b|BD\b|BULEVARDUL|PŢA\b|PTA\b|PIATA|PIAȚA|CALEA|ŞOS\b|SOS\b|ALEEA|INTR\b)\.?\s*', '', street_raw, flags=re.I).strip()
        
        # Eliminăm și 'General' dacă e urmat de alt nume, pentru căutare mai flexibilă
        m_gen = re.match(r'^(?:GENERAL|GEN\.)\s+(.+)', clean_street_kw, re.I)
        if m_gen:
            clean_street_kw = m_gen.group(1).strip()

        search_query = f"{clean_street_kw} {num_raw}".strip()
        if not search_query:
            search_query = clean

        return {
            "clean_address": clean,
            "city": city,
            "sector": sector,
            "county": county,
            "street": street_raw,
            "street_kw": clean_street_kw,
            "number": num_raw,
            "search_query": search_query
        }

    def _match_company_to_address(self, candidate_addr: str, loc_info: Dict[str, Any]) -> bool:
        """
        Regulă STRICTĂ anti-amestecare orașe / străzi:
        Verifică dacă firma din FirmeAPI este chiar în același ORAȘ, același SECTOR/JUDEȚ
        și la același NUMĂR de clădire.
        Respinge orice firmă din Craiova, Dolj, Cluj etc. dacă clientul este din București!
        """
        if not candidate_addr:
            return False

        cand_norm = self._normalize_text(candidate_addr)
        client_city = loc_info.get("city")
        client_sec = loc_info.get("sector")
        client_county = loc_info.get("county")
        client_num = self._normalize_text(loc_info.get("number", ""))

        # 1. Filtrare Localitate / Oraș / Sector
        if client_city == "Bucuresti":
            # Candidatul TREBUIE să fie în București
            if "BUCURE" not in cand_norm and "SECTOR" not in cand_norm:
                return False
            # Dacă clientul are sector specificat, candidatul nu poate fi în alt sector
            if client_sec:
                sec_match = re.search(r'(\d+)', client_sec)
                if sec_match:
                    s_num = sec_match.group(1)
                    cand_sec_match = re.search(r'SECTOR(?:UL)?\s*(\d+)', cand_norm)
                    if cand_sec_match and cand_sec_match.group(1) != s_num:
                        return False
        elif client_city:
            city_norm = self._normalize_text(client_city)
            if city_norm not in cand_norm:
                return False
        elif client_county:
            county_norm = self._normalize_text(client_county)
            if county_norm not in cand_norm:
                return False

        # 2. Filtrare Număr Clădire
        if client_num:
            cand_num_match = re.search(r'NR\.?\s*([0-9]+(?:[\-\/][0-9]+|[A-Za-z])*)', cand_norm)
            if cand_num_match:
                cand_num = cand_num_match.group(1).strip()
                # Acceptăm dacă e egal sau dacă acoperă același interval (ex: 3-5 vs 3 sau 3-5)
                if cand_num != client_num and not (client_num.startswith(cand_num) or cand_num.startswith(client_num)):
                    return False
            else:
                return False

        return True

    async def verify_address(self, address: str, current_cui: str = None) -> Dict[str, Any]:
        """
        Analizează adresa sediului social:
        1. Extrage structurat orașul, sectorul, strada și numărul.
        2. Geocodifică adresa la nivel de număr poștal prin OSM Nominatim.
        3. Caută firme la aceeași adresă și aplică filtru STRICT de oraș/sector/număr.
        4. Generează unghiurile Street View și Satelit clădire.
        """
        if not address:
            return {
                "address": "",
                "cluster_count": 0,
                "risk_level": "Nedeterminat",
                "risk_message": "Adresa lipsește.",
                "companies": [],
                "coordinates": None,
                "google_maps_url": None,
                "street_view_url": None,
                "photos": []
            }

        # 0. Verificare CACHE în baza de date (evităm interogările duplicate pentru aceeași firmă)
        clean_cui = "".join(filter(str.isdigit, str(current_cui or "")))
        if clean_cui:
            try:
                from ...database import SessionLocal
                from ...models.client import Client, Evaluation
                import json
                with SessionLocal() as db:
                    eval_row = (
                        db.query(Evaluation)
                        .join(Client, Evaluation.client_id == Client.id)
                        .filter(Client.cui_cnp.like(f"%{clean_cui}%"))
                        .order_by(Evaluation.created_at.desc())
                        .first()
                    )
                    if eval_row and eval_row.raw_financial_data:
                        raw = json.loads(eval_row.raw_financial_data) if isinstance(eval_row.raw_financial_data, str) else eval_row.raw_financial_data
                        cached_addr = raw.get("address_check")
                        if cached_addr and cached_addr.get("companies"):
                            print(f"[DB CACHE HIT] Verificare adresă pentru CUI {clean_cui} încărcată din baza de date.")
                            return cached_addr
            except Exception:
                pass

        # 1. Extragere informații structurate
        loc_info = self._extract_location_info(address)

        # 2. Geocodificare GPS pentru Google Maps & Street View
        coords = await self._geocode_address(loc_info)

        lat = coords.get("lat") if coords else None
        lon = coords.get("lon") if coords else None

        if lat and lon:
            google_maps_url = f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
            street_view_url = f"https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lon}"
        else:
            encoded_addr = urllib.parse.quote(loc_info["clean_address"])
            google_maps_url = f"https://www.google.com/maps/search/?api=1&query={encoded_addr}"
            street_view_url = f"https://www.google.com/maps/@?api=1&map_action=pano&query={encoded_addr}"

        # 3. Căutare companii la aceeași adresă cu filtru strict de oraș/sector
        companies = await self._fetch_companies_at_address(loc_info, current_cui)
        cluster_count = len(companies)

        # 4. Evaluare Nivel de Risc Cluster (după filtrare strictă)
        if cluster_count >= 10:
            risk_level = "Ridicat"
            risk_message = f"Cluster masiv detectat: {cluster_count}+ firme înregistrate la aceeași clădire/adresă (Posibil sediu virtual / căsuță poștală)."
        elif cluster_count >= 4:
            risk_level = "Mediu"
            risk_message = f"Densitate medie: {cluster_count} firme identificate la această clădire/adresă."
        elif cluster_count >= 1:
            risk_level = "Scăzut"
            risk_message = f"Densitate normală: {cluster_count} firmă(e) identificată(e) la acest număr."
        else:
            risk_level = "Normal"
            risk_message = "Sediu individual: nicio altă firmă identificată la această adresă exactă."

        # 5. Generare Poze Oficiale Google Street View Static API & Verificare Metadata
        photos = []
        streetview_meta = None
        if lat and lon:
            g_key = os.getenv("GOOGLE_MAPS_API_KEY", "AIzaSyC0K3Je-Wg4PQ68BltbA5xtz_zbbp3qPG4")
            streetview_meta = await self._fetch_streetview_metadata(lat, lon, g_key)
            pano_param = f"&pano={streetview_meta['pano_id']}" if streetview_meta and streetview_meta.get("pano_id") else ""
            
            # Calculare orientare inteligentă către imobil din locația camerei Google
            base_heading = 0.0
            if streetview_meta and streetview_meta.get("camera_location"):
                cam_loc = streetview_meta["camera_location"]
                import math
                try:
                    c_lat, c_lon = math.radians(cam_loc.get("lat", lat)), math.radians(cam_loc.get("lng", lon))
                    t_lat, t_lon = math.radians(lat), math.radians(lon)
                    dlon = t_lon - c_lon
                    x = math.sin(dlon) * math.cos(t_lat)
                    y = math.cos(c_lat) * math.sin(t_lat) - (math.sin(c_lat) * math.cos(t_lat) * math.cos(dlon))
                    base_heading = round((math.degrees(math.atan2(x, y)) + 360) % 360, 1)
                except Exception:
                    base_heading = 0.0

            h_front = base_heading
            h_east = round((base_heading + 90) % 360, 1)
            h_south = round((base_heading + 180) % 360, 1)
            h_west = round((base_heading + 270) % 360, 1)

            photos = [
                {
                    "id": "gsv_front",
                    "title": f"Google Street View: Fațadă Imobil ({h_front}°)",
                    "angle": "Nivel Stradal — Fațadă Clădire",
                    "heading": h_front,
                    "url": f"https://maps.googleapis.com/maps/api/streetview?size=800x500&location={lat},{lon}{pano_param}&fov=90&heading={h_front}&pitch=0&key={g_key}",
                    "type": "street_view"
                },
                {
                    "id": "gsv_east",
                    "title": f"Google Street View: Unghi Lateral Dreapta ({h_east}°)",
                    "angle": "Nivel Stradal — Ax Stradă",
                    "heading": h_east,
                    "url": f"https://maps.googleapis.com/maps/api/streetview?size=800x500&location={lat},{lon}{pano_param}&fov=90&heading={h_east}&pitch=0&key={g_key}",
                    "type": "street_view"
                },
                {
                    "id": "gsv_south",
                    "title": f"Google Street View: Perspectivă Stradă Opusă ({h_south}°)",
                    "angle": "Nivel Stradal — Ansamblu Stradă",
                    "heading": h_south,
                    "url": f"https://maps.googleapis.com/maps/api/streetview?size=800x500&location={lat},{lon}{pano_param}&fov=90&heading={h_south}&pitch=0&key={g_key}",
                    "type": "street_view"
                },
                {
                    "id": "gsv_west",
                    "title": f"Google Street View: Unghi Lateral Stânga ({h_west}°)",
                    "angle": "Nivel Stradal — Ax Stradă Opus",
                    "heading": h_west,
                    "url": f"https://maps.googleapis.com/maps/api/streetview?size=800x500&location={lat},{lon}{pano_param}&fov=90&heading={h_west}&pitch=0&key={g_key}",
                    "type": "street_view"
                }
            ]

        return {
            "address": address,
            "search_query": loc_info["search_query"],
            "cluster_count": cluster_count,
            "risk_level": risk_level,
            "risk_message": risk_message,
            "coordinates": coords,
            "google_maps_url": google_maps_url,
            "street_view_url": street_view_url,
            "streetview_metadata": streetview_meta,
            "photos": photos,
            "companies": companies[:10]
        }

    async def _fetch_streetview_metadata(self, lat: float, lon: float, api_key: str) -> Optional[Dict[str, Any]]:
        """
        Interoghează Google Street View Metadata API pentru a valida existența imaginilor,
        a obține data capturii (ex: 2024-05), camera location și pano_id-ul unic.
        """
        try:
            url = f"https://maps.googleapis.com/maps/api/streetview/metadata?location={lat},{lon}&radius=100&source=outdoor&key={api_key}"
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, timeout=5.0)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "OK":
                        return {
                            "status": "OK",
                            "date": data.get("date"),
                            "pano_id": data.get("pano_id"),
                            "copyright": data.get("copyright", "© Google"),
                            "camera_location": data.get("location")
                        }
                    else:
                        return {
                            "status": data.get("status", "ZERO_RESULTS"),
                            "date": None,
                            "pano_id": None,
                            "copyright": None,
                            "camera_location": None
                        }
        except Exception as e:
            print(f"StreetView metadata error: {e}")
        return None

    async def _fetch_companies_at_address(self, loc_info: Dict[str, Any], exclude_cui: str = None) -> List[Dict]:
        """
        Interoghează FirmeAPI și aplică filtru STRICT de localitate, sector și număr.
        Elimină complet firmele din alte județe/orașe.
        """
        exclude_str = str(exclude_cui).strip() if exclude_cui else ""
        queries_to_try = [
            loc_info.get("search_query"),
            f"{loc_info.get('street_kw')} {loc_info.get('number')}",
            f"{loc_info.get('street')} {loc_info.get('number')}",
            loc_info.get("clean_address")
        ]

        matched = []
        try:
            async with httpx.AsyncClient() as client:
                for q in queries_to_try:
                    if not q or not q.strip():
                        continue
                    url = f"https://www.firmeapi.ro/api/v1/firme?q={urllib.parse.quote(q)}"
                    response = await client.get(url, headers=self.headers, timeout=10.0)
                    if response.status_code == 200:
                        items = response.json().get("data", {}).get("items", [])
                        for it in items:
                            cui_str = str(it.get("cui", "")).strip()
                            cand_addr = it.get("adresa", "")
                            
                            # Filtru STRICT de oraș / sector / număr
                            if self._match_company_to_address(cand_addr, loc_info):
                                if not any(m["cui"] == cui_str for m in matched):
                                    data_inreg = it.get("data_inregistrare", "") or ""
                                    an = data_inreg[:4] if (data_inreg and len(data_inreg) >= 4 and data_inreg[:4].isdigit()) else None
                                    matched.append({
                                        "cui": cui_str,
                                        "denumire": it.get("denumire", ""),
                                        "adresa": cand_addr,
                                        "data_inregistrare": data_inreg,
                                        "an_infiintare": an,
                                        "is_current": (cui_str == exclude_str)
                                    })
                        if matched:
                            break
        except Exception as e:
            print(f"AddressChecker error querying FirmeAPI: {e}")

        return matched

    async def _geocode_address(self, loc_info: Dict[str, Any]) -> Dict[str, float]:
        """
        Geocodifică adresa la nivel de stradă și număr prin OSM Nominatim.
        Folosește query-uri ierarhice pentru a preveni eșecurile cauzate de diacritice sau zgomot.
        """
        try:
            headers = {"User-Agent": "AxisCreditPlatform/1.0"}
            street = loc_info.get("street", "")
            number = loc_info.get("number", "")
            city = loc_info.get("city") or "Bucuresti"
            sector = loc_info.get("sector")

            # Normalizare diacritice pentru Nominatim
            s_clean = street.replace("Ţ", "T").replace("Ş", "S").replace("ţ", "t").replace("ş", "s")
            is_square = bool(re.search(r'P[\.\-]?TA|PIATA', s_clean, re.I))
            is_blvd = bool(re.search(r'BLD|BD|BULEVARD', s_clean, re.I))
            
            clean_name = re.sub(
                r'^(?:STR\.?|STRADA|BLD\.?|BD\.?|BULEVARDUL|P[\.\-]?TA\.?|PIATA|CALEA|ŞOS\.?|SOS\.)\s*', 
                '', 
                s_clean, 
                flags=re.I
            ).strip()

            prefix = "Piata" if is_square else ("Bulevardul" if is_blvd else "Strada")

            queries = []
            if clean_name and number:
                queries.append(f"{prefix} {clean_name} {number}, {city}, Romania")
                queries.append(f"{clean_name} {number}, {city}, Romania")
            if clean_name:
                queries.append(f"{prefix} {clean_name}, {city}, Romania")
                queries.append(f"{clean_name}, {city}, Romania")
            
            clean_addr = loc_info.get("clean_address", "")
            clean_addr = re.sub(r'Sec\.\s*\d+\.?', '', clean_addr, flags=re.I)
            clean_addr = re.sub(r'Mun\.', '', clean_addr, flags=re.I).strip(" ,")
            queries.append(f"{clean_addr}, Romania")

            async with httpx.AsyncClient() as client:
                for q in queries:
                    url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(q)}"
                    r = await client.get(url, headers=headers, timeout=6.0)
                    if r.status_code == 200:
                        data = r.json()
                        if data and len(data) > 0:
                            return {
                                "lat": float(data[0]["lat"]),
                                "lon": float(data[0]["lon"]),
                                "display_name": data[0].get("display_name", "")
                            }
        except Exception as e:
            print(f"Address geocoding error: {e}")

        return None
