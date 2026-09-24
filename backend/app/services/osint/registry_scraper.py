import asyncio
import httpx
from typing import List, Dict, Optional
import os
from .caen_helper import get_caen_details, get_caen_description

class RegistryScraper:
    def __init__(self):
        self.api_url = "https://api.openapi.ro/api/companies"
        self.api_key = os.getenv("OPENAPI_KEY", "H6FipvsmxZ9ztBb47L4Zk2UJqkHjZAMydoGWTvJpnm2VL1keAg")
        
        # Noua cheie pentru Termene.ro (pentru Caracatița Asociaților)
        self.termene_api_key = os.getenv("TERMENE_API_KEY", "YOUR_TERMENE_API_KEY_HERE")

    def _get_cached_evaluation_data(self, cui: str) -> Optional[Dict]:
        """Verifică dacă există deja evaluare salvată în DB pentru acest CUI pentru a evita interogările externe duplicate"""
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        if not clean_cui:
            return None
        try:
            import json
            from ...database import SessionLocal
            from ...models.client import Client, Evaluation
            with SessionLocal() as db:
                eval_row = (
                    db.query(Evaluation)
                    .join(Client, Evaluation.client_id == Client.id)
                    .filter(Client.cui_cnp.like(f"%{clean_cui}%"))
                    .order_by(Evaluation.created_at.desc())
                    .first()
                )
                if eval_row and eval_row.raw_financial_data:
                    d = json.loads(eval_row.raw_financial_data) if isinstance(eval_row.raw_financial_data, str) else eval_row.raw_financial_data
                    return d
        except Exception:
            pass
        return None

    async def fetch_company_general(self, cui: str) -> Dict:
        """Extrage date generale firmă (stare, adresă, CAEN, e-factura, TVA, etc.) via FirmeAPI, cu cache DB"""
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        if not clean_cui:
            return {}

        cached = self._get_cached_evaluation_data(clean_cui)
        if cached and cached.get("anaf"):
            print(f"[DB CACHE HIT] Date generale pentru CUI {clean_cui} încărcate din baza de date.")
            return cached.get("anaf")

        try:
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
            headers = {"Authorization": f"Bearer {firmeapi_key}", "Accept": "application/json"}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"https://www.firmeapi.ro/api/v1/firma/{clean_cui}", headers=headers, timeout=12.0)
                if resp.status_code == 200:
                    data = resp.json().get("data", {}) or {}
                    if data:
                        c_code = data.get("cod_caen")
                        det = get_caen_details(c_code)
                        data["caen_detalii"] = det
                        data["caen_descriere"] = det.get("denumire", "")
                        data["caen_sectiune"] = det.get("sectiune", "")
                    return data
                return {}
        except Exception as e:
            print(f"Eroare extragere date generale FirmeAPI: {e}")
            return {}

    async def fetch_company_personnel(self, cui: str) -> List[Dict]:
        """
        Extrage complet asociații (acționariat cu cote de participare) și administratorii via FirmeAPI.ro.
        Interoghează simultan /actionari/{cui} și /administratori/{cui} pentru a identifica:
        - Asociații activi și cotele procentuale deținute (Beneficiari Reali)
        - Administratorii mandatați
        - Istoricul de cesiuni / foști asociați retrași
        """
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        if not clean_cui:
            return []

        cached = self._get_cached_evaluation_data(clean_cui)
        if cached:
            p = cached.get("personnel") or cached.get("holdings")
            if p and len(p) > 0:
                print(f"[DB CACHE HIT] Personnel pentru CUI {clean_cui} încărcat din baza de date.")
                return p

        try:
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
            headers = {
                "Authorization": f"Bearer {firmeapi_key}",
                "Accept": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                # Interogare simultană acționari și administratori
                t_act = client.get(f"https://www.firmeapi.ro/api/v1/actionari/{clean_cui}", headers=headers, timeout=15.0)
                t_adm = client.get(f"https://www.firmeapi.ro/api/v1/administratori/{clean_cui}", headers=headers, timeout=15.0)
                
                resp_act, resp_adm = await asyncio.gather(t_act, t_adm, return_exceptions=True)

                holdings = []
                if not isinstance(resp_act, Exception) and resp_act.status_code == 200:
                    holdings = resp_act.json().get("holdings", []) or []

                raw_admins = {}
                if not isinstance(resp_adm, Exception) and resp_adm.status_code == 200:
                    raw_admins = resp_adm.json().get("data", {}) or {}
                admin_list = raw_admins if isinstance(raw_admins, list) else raw_admins.get("administratori", []) or []

                people_map = {}

                # 1. Procesare asociați / acționari (holdings)
                for h in holdings:
                    name = (h.get("name") or "").strip().upper()
                    if not name:
                        continue
                    is_curr = bool(h.get("current", False))
                    percent = float(h.get("percent", 0) or 0)
                    h_type = h.get("type") or ("ASOCIAT SI ADMINISTRATOR" if h.get("is_administrator") else "ASOCIAT")
                    
                    if name not in people_map:
                        people_map[name] = {
                            "nume": name,
                            "rol": h_type,
                            "este_asociat": True,
                            "este_administrator": bool(h.get("is_administrator", False)),
                            "cota_participare": percent,
                            "stare": "Activ" if is_curr else "Istoric",
                            "loc_nastere": h.get("placeofbirth") or "",
                            "data_numire": h.get("from") or "",
                            "data_sfarsit": h.get("to") or "",
                            "tip_entitate": h.get("entity") or "PF",
                            "alte_companii_active": 0,
                            "companii_faliment": 0
                        }
                    else:
                        existing = people_map[name]
                        if is_curr:
                            existing["stare"] = "Activ"
                            existing["cota_participare"] = percent
                            existing["rol"] = h_type
                            existing["este_asociat"] = True
                            if h.get("is_administrator"):
                                existing["este_administrator"] = True
                            if h.get("from"):
                                existing["data_numire"] = h.get("from")
                            existing["data_sfarsit"] = h.get("to") or ""
                        elif existing["stare"] != "Activ" and percent > existing["cota_participare"]:
                            existing["cota_participare"] = percent

                # 2. Procesare și îmbogățire cu administratori
                for a in admin_list:
                    name = (a.get("nume") or "").strip().upper()
                    if not name:
                        continue
                    is_active = a.get("stare", "Activ") == "Activ"
                    
                    if name in people_map:
                        existing = people_map[name]
                        existing["este_administrator"] = True
                        if not existing.get("loc_nastere") and a.get("loc_nastere"):
                            existing["loc_nastere"] = a.get("loc_nastere")
                        if not existing.get("data_numire") and a.get("data"):
                            existing["data_numire"] = a.get("data")
                        if existing.get("este_asociat") and "ADMINISTRATOR" not in existing.get("rol", "").upper():
                            existing["rol"] = f"{existing['rol']} & ADMINISTRATOR"
                        if a.get("companii_active"):
                            existing["alte_companii_active"] = a.get("companii_active", 0)
                        if a.get("companii_faliment"):
                            existing["companii_faliment"] = a.get("companii_faliment", 0)
                    else:
                        people_map[name] = {
                            "nume": name,
                            "rol": a.get("calitate", a.get("functie", "ADMINISTRATOR")).upper(),
                            "este_asociat": False,
                            "este_administrator": True,
                            "cota_participare": float(a.get("cota", 0) or 0),
                            "stare": a.get("stare", "Activ"),
                            "loc_nastere": a.get("loc_nastere", ""),
                            "data_numire": a.get("data", ""),
                            "data_sfarsit": "",
                            "tip_entitate": "PJ" if "juridic" in (a.get("tip", "")).lower() else "PF",
                            "alte_companii_active": a.get("companii_active", 0) or 0,
                            "companii_faliment": a.get("companii_faliment", 0) or 0
                        }

                personnel_list = list(people_map.values())
                # Ordonare: persoanele active primele (după cota procentuală descrescător), apoi istoricul
                personnel_list.sort(key=lambda x: (x["stare"] == "Activ", x["cota_participare"]), reverse=True)
                return personnel_list
        except Exception as e:
            print(f"Eroare API FirmeAPI personnel & actionari: {e}")
            return []

    async def fetch_company_bpi(self, cui: str) -> Dict:
        """Verifică Buletinul Procedurilor de Insolvență (BPI) via FirmeAPI"""
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        if not clean_cui:
            return {"has_insolvency": False, "count": 0, "records": []}

        cached = self._get_cached_evaluation_data(clean_cui)
        if cached and cached.get("bpi"):
            return cached.get("bpi")

        try:
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
            headers = {"Authorization": f"Bearer {firmeapi_key}", "Accept": "application/json"}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"https://www.firmeapi.ro/api/v1/bpi/{clean_cui}", headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("data", []) or []
                    if isinstance(items, list) and len(items) > 0:
                        return {"has_insolvency": True, "count": len(items), "records": items}
                    return {"has_insolvency": False, "count": 0, "records": []}
                return {"has_insolvency": False, "count": 0, "records": []}
        except Exception as e:
            print(f"Eroare verificare BPI: {e}")
            return {"has_insolvency": False, "count": 0, "records": []}

    async def fetch_company_mof(self, cui: str) -> List[Dict]:
        """Extrage istoricul publicațiilor din Monitorul Oficial (MOF) via FirmeAPI, cu fallback pe mențiuni ONRC oficiale"""
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        if not clean_cui:
            return []
            
        try:
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
            headers = {"Authorization": f"Bearer {firmeapi_key}", "Accept": "application/json"}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"https://www.firmeapi.ro/api/v1/mof/{clean_cui}", headers=headers, timeout=12.0)
                if resp.status_code == 200:
                    data = resp.json()
                    res = data.get("data", {}).get("rezultate", []) or []
                    if res:
                        return res
        except Exception as e:
            print(f"Eroare extragere MOF: {e}")
        return []

    async def fetch_administrator_network(self, name: str, match_cui: Optional[str] = None, match_loc: Optional[str] = None) -> List[Dict]:
        """
        Reverse Lookup: Caută o persoană după nume în baza FirmeAPI / ONRC + MOF
        și returnează companiile unde este asociat sau administrator ("Caracatița").
        Dacă se specifică match_cui sau match_loc, elimină automat omonimii (persoanele cu alte vârste sau alte date de buletin / naștere).
        """
        if not name or len(name.strip()) < 3:
            return []
            
        try:
            import urllib.parse
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
            headers = {"Authorization": f"Bearer {firmeapi_key}", "Accept": "application/json"}
            url = f"https://www.firmeapi.ro/api/v1/actionari/cauta?nume={urllib.parse.quote(name.strip())}"
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, timeout=12.0)
                if resp.status_code == 200:
                    data = resp.json()
                    persoane = data.get("persoane", []) or []
                    if not persoane:
                        return []

                    # 1. Filtrare strictă după CUI-ul companiei (elimină persoanele cu alte vârste/buletine)
                    if match_cui:
                        clean_cui = "".join(filter(str.isdigit, str(match_cui)))
                        if clean_cui:
                            matching = []
                            for p in persoane:
                                p_cuis = ["".join(filter(str.isdigit, str(f.get("cui", "")))) for f in p.get("firme", [])]
                                if clean_cui in p_cuis:
                                    matching.append(p)
                            if matching:
                                return matching

                    # 2. Filtrare după locul de naștere / buletin (dacă există în datele oficiale de administrator)
                    if match_loc:
                        norm_match = match_loc.strip().lower()
                        for src, dest in [('ş', 's'), ('ș', 's'), ('ţ', 't'), ('ț', 't'), ('ă', 'a'), ('â', 'a'), ('î', 'i')]:
                            norm_match = norm_match.replace(src, dest)
                        
                        matching = []
                        for p in persoane:
                            p_loc = (p.get("loc_nastere") or "").strip().lower()
                            for src, dest in [('ş', 's'), ('ș', 's'), ('ţ', 't'), ('ț', 't'), ('ă', 'a'), ('â', 'a'), ('î', 'i')]:
                                p_loc = p_loc.replace(src, dest)
                            if p_loc and (p_loc in norm_match or norm_match in p_loc):
                                matching.append(p)
                        if matching:
                            return matching

                    return persoane
                # Dacă FirmeAPI nu returnează 200 sau nu are rezultate, continuă pe fallback local
        except Exception as e:
            print(f"Eroare căutare rețea administrator '{name}' via FirmeAPI: {e}")

        # Fallback local inteligent din baza de date Axis (istoric evaluări și clienți)
        try:
            import json
            from ...database import SessionLocal
            from ...models.user import User  # Necesar pentru declararea FK-urilor
            from ...models.client import Client, Evaluation

            db = SessionLocal()
            clean_target = name.strip().upper().replace("-", " ")
            found_networks = []
            
            # 1. Căutare în evaluări anterioare care au salvat admin_networks
            evals = db.query(Evaluation).filter(Evaluation.raw_financial_data.isnot(None)).all()
            for ev in evals:
                try:
                    d = json.loads(ev.raw_financial_data) if isinstance(ev.raw_financial_data, str) else ev.raw_financial_data
                    for an in d.get("admin_networks", []):
                        an_name = (an.get("nume") or "").strip().upper().replace("-", " ")
                        if an_name and (an_name == clean_target or clean_target in an_name or an_name in clean_target):
                            if an.get("firme") and len(an.get("firme")) > 0:
                                if not any(existing.get("nume") == an.get("nume") and len(existing.get("firme", [])) >= len(an.get("firme", [])) for existing in found_networks):
                                    found_networks.append(an)
                except Exception:
                    pass

            # 2. Căutare între companiile / clienții existenți în DB
            clients = db.query(Client).all()
            linked_firms = []
            for c in clients:
                rep = (c.representative_name or "").strip().upper().replace("-", " ")
                if rep and (rep == clean_target or clean_target in rep or rep in clean_target):
                    linked_firms.append({
                        "cui": c.cui_cnp,
                        "denumire": c.name,
                        "rol": "ADMINISTRATOR / REPREZENTANT",
                        "este_administrator": True,
                        "curent": True,
                        "sursa": "AXIS DB"
                    })
            if linked_firms:
                # Verifică dacă firmele găsite nu sunt deja în found_networks
                all_cuis = set()
                for fn in found_networks:
                    for f in fn.get("firme", []):
                        all_cuis.add(str(f.get("cui", "")).strip())
                new_firms = [f for f in linked_firms if str(f.get("cui", "")).strip() not in all_cuis]
                if new_firms:
                    if found_networks:
                        found_networks[0]["firme"].extend(new_firms)
                        found_networks[0]["total_firme"] = len(found_networks[0]["firme"])
                        found_networks[0]["firme_active"] = sum(1 for f in found_networks[0]["firme"] if f.get("curent", True))
                    else:
                        found_networks.append({
                            "nume": name.strip(),
                            "varsta": None,
                            "loc_nastere": match_loc or "",
                            "total_firme": len(new_firms),
                            "firme_active": len(new_firms),
                            "firme_incetate": 0,
                            "firme": new_firms
                        })

            db.close()
            if found_networks:
                return found_networks
        except Exception as db_err:
            print(f"Eroare fallback local DB administrator_network: {db_err}")

        return []

    async def fetch_company_holdings(self, cui: str) -> List[Dict]:
        """Extrage lista completă de acționari/asociați cu tot istoricul de cesiuni din /actionari/{cui}"""
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        if not clean_cui:
            return []
        try:
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
            headers = {"Authorization": f"Bearer {firmeapi_key}", "Accept": "application/json"}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"https://www.firmeapi.ro/api/v1/actionari/{clean_cui}", headers=headers, timeout=12.0)
                if resp.status_code == 200:
                    data = resp.json()
                    holdings = data.get("holdings", []) or []
                    if holdings:
                        for h in holdings:
                            if not h.get("type"):
                                h["type"] = "ASOCIAT SI ADMINISTRATOR (PF)" if h.get("is_administrator") else "ASOCIAT (PF)"
                            if not h.get("entity"):
                                h["entity"] = "PF"
                        return holdings
        except Exception as e:
            print(f"Eroare extragere holdings: {e}")

        # Nu sintetizăm acționari artificiali din administratori!
        # Un mandat de administrator la ONRC nu reprezintă o deținere de părți sociale și nici o cesiune de acțiuni.
        return []

    async def fetch_company_administrators(self, cui: str) -> List[Dict]:
        """Extrage lista oficială a administratorilor și conducerii din /administratori/{cui}"""
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        if not clean_cui:
            return []
        try:
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
            headers = {"Authorization": f"Bearer {firmeapi_key}", "Accept": "application/json"}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"https://www.firmeapi.ro/api/v1/administratori/{clean_cui}", headers=headers, timeout=12.0)
                if resp.status_code == 200:
                    d = resp.json().get("data", {}) or {}
                    admins = d if isinstance(d, list) else d.get("administratori", []) or []
                    return admins
                return []
        except Exception as e:
            print(f"Eroare extragere administratori: {e}")
            return []

    async def fetch_company_caen(self, cui: str) -> Dict:
        """Extrage activitatea principală și activitățile secundare autorizate din /caen/{cui}"""
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        if not clean_cui:
            return {}
        try:
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
            headers = {"Authorization": f"Bearer {firmeapi_key}", "Accept": "application/json"}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"https://www.firmeapi.ro/api/v1/caen/{clean_cui}", headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    d = resp.json().get("data", {}) or {}
                    princ = d.get("caen_principal", {}) or {}
                    if not princ.get("denumire") and princ.get("cod"):
                        princ["denumire"] = get_caen_description(princ.get("cod"))
                    sec = d.get("caen_secundare", []) or []
                    for item in sec:
                        if not item.get("denumire") and item.get("cod"):
                            item["denumire"] = get_caen_description(item.get("cod"))
                    return {
                        "caen_principal": princ,
                        "caen_secundare": sec,
                        "total_secundare": d.get("total_secundare", len(sec)),
                        "caen_versiune": d.get("caen_versiune", 2)
                    }
                return {}
        except Exception as e:
            print(f"Eroare extragere activități CAEN: {e}")
            return {}

    async def fetch_company_balance(self, cui: str) -> Dict:
        """
        Extrage bilanțul contabil multianual oficial de la FirmeAPI (istoric complet pe toți anii raportați)
        cu toți indicatorii: CA, Venituri, Cheltuieli, Profit Net, Pierdere Netă, Salariați, Active Imob.,
        Creanțe, Casă & Bănci, Datorii Totale, Capitaluri Proprii.
        """
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        if not clean_cui:
            return {}

        cached = self._get_cached_evaluation_data(clean_cui)
        if cached and cached.get("balance"):
            print(f"[DB CACHE HIT] Bilanț pentru CUI {clean_cui} încărcat din baza de date.")
            return cached.get("balance")

        try:
            firmeapi_key = os.getenv("FIRMEAPI_KEY", "ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f")
            headers = {"Authorization": f"Bearer {firmeapi_key}", "Accept": "application/json"}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"https://www.firmeapi.ro/api/v1/bilant/{clean_cui}", headers=headers, timeout=12.0)
                if resp.status_code == 200:
                    resp_json = resp.json()
                    data = resp_json.get("data", {}) or {}
                    ani_dict = data.get("ani", {}) or {}

                    if ani_dict:
                        istoric = []
                        for y_str, y_data in ani_dict.items():
                            detalii = y_data.get("detalii", [])
                            ind_map = {item.get("val_den_indicator", "").strip().lower(): item.get("val_indicator", 0) for item in detalii if item.get("val_den_indicator")}

                            def get_v(*keywords):
                                for k, val in ind_map.items():
                                    if all(kw in k for kw in keywords):
                                        return val
                                return 0

                            ca = get_v("cifra", "afaceri")
                            venituri = get_v("venituri", "totale")
                            cheltuieli = get_v("cheltuieli", "totale")
                            profit_net = get_v("profit", "net")
                            pierdere_neta = get_v("pierdere", "neta")
                            salariati = get_v("numar", "salariati") or get_v("salariati")
                            active_imob = get_v("active", "imobilizate")
                            creante = get_v("creante")
                            casa_banci = get_v("casa")
                            datorii = get_v("datorii")
                            capitaluri = get_v("capitaluri", "total")
                            caen_c = y_data.get("caen")
                            caen_d = y_data.get("denumire_caen") or get_caen_description(caen_c)

                            istoric.append({
                                "an": int(y_str),
                                "cifra_afaceri": ca,
                                "venituri_totale": venituri,
                                "cheltuieli": cheltuieli,
                                "profit_net": profit_net,
                                "pierdere_neta": pierdere_neta,
                                "salariati": salariati,
                                "active_imobilizate": active_imob,
                                "creante": creante,
                                "casa_banci": casa_banci,
                                "datorii": datorii,
                                "capitaluri_proprii": capitaluri,
                                "caen": caen_c,
                                "caen_descriere": caen_d
                            })

                        # Sort descending by year
                        istoric.sort(key=lambda x: x["an"], reverse=True)
                        latest = istoric[0]

                        evolutie_venituri = None
                        if len(istoric) >= 2 and istoric[1]["cifra_afaceri"] > 0:
                            diff = istoric[0]["cifra_afaceri"] - istoric[1]["cifra_afaceri"]
                            evolutie_venituri = round((diff / istoric[1]["cifra_afaceri"]) * 100, 1)

                        return {
                            "an": latest["an"],
                            "cifra_afaceri": latest["cifra_afaceri"],
                            "venituri_totale": latest["venituri_totale"],
                            "cheltuieli": latest["cheltuieli"],
                            "profit_net": latest["profit_net"],
                            "pierdere_neta": latest["pierdere_neta"],
                            "datorii": latest["datorii"],
                            "angajati": latest["salariati"],
                            "active_imobilizate": latest["active_imobilizate"],
                            "creante": latest["creante"],
                            "casa_banci": latest["casa_banci"],
                            "capitaluri_proprii": latest["capitaluri_proprii"],
                            "caen": latest.get("caen"),
                            "caen_descriere": latest["caen_descriere"],
                            "evolutie_venituri_pct": evolutie_venituri,
                            "ani_raportati": len(istoric),
                            "istoric": istoric
                        }
        except Exception as e:
            print(f"Eroare extragere bilant FirmeAPI: {e}")

        # Fallback la OpenAPI
        return await self._fetch_openapi_balance(cui)

    async def _fetch_openapi_balance(self, cui: str) -> Dict:
        """Fallback OpenAPI.ro pentru bilanț"""
        if self.api_key == "YOUR_API_KEY_HERE" or not self.api_key:
            return {}
            
        try:
            clean_cui = "".join(filter(str.isdigit, str(cui)))
            headers = {"x-api-key": self.api_key}
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.api_url}/{clean_cui}/balances", headers=headers, timeout=12.0)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        sorted_data = sorted(data, key=lambda x: x.get("year", 0), reverse=True)
                        latest = sorted_data[0]
                        latest_data = latest.get("data", {})
                        
                        profit = latest_data.get("profit_net", latest_data.get("profit_curent", 0)) or 0
                        pierdere = latest_data.get("pierdere_neta", latest_data.get("pierdere_curenta", 0)) or 0
                        profit_net = profit if profit > 0 else (-pierdere if pierdere > 0 else 0)
                        ca = latest_data.get("cifra_de_afaceri_neta", 0) or 0
                        datorii = latest_data.get("datorii_total", 0) or 0
                        angajati = latest_data.get("numar_mediu_de_salariati", 0) or 0
                        capitaluri = latest_data.get("capitaluri_total", 0) or 0
                        casa = latest_data.get("casa_si_conturi", 0) or 0
                        active_circulante = latest_data.get("active_circulante_total", 0) or 0
                        active_imobilizate = latest_data.get("active_imobilizate_total", 0) or 0
                        caen_desc = latest_data.get("caen_descriere", "")

                        istoric = []
                        for y_item in sorted_data:
                            yd = y_item.get("data", {})
                            y_p = yd.get("profit_net", 0) or 0
                            y_l = yd.get("pierdere_neta", 0) or 0
                            y_pn = y_p if y_p > 0 else (-y_l if y_l > 0 else 0)
                            istoric.append({
                                "an": y_item.get("year"),
                                "cifra_afaceri": yd.get("cifra_de_afaceri_neta", 0) or 0,
                                "venituri_totale": yd.get("venituri_totale", 0) or (yd.get("cifra_de_afaceri_neta", 0) or 0),
                                "cheltuieli": yd.get("cheltuieli_totale", 0) or 0,
                                "profit_net": y_pn,
                                "pierdere_neta": y_l,
                                "datorii": yd.get("datorii_total", 0) or 0,
                                "salariati": yd.get("numar_mediu_de_salariati", 0) or 0,
                                "active_imobilizate": yd.get("active_imobilizate_total", 0) or 0,
                                "creante": yd.get("creante", 0) or 0,
                                "casa_banci": yd.get("casa_si_conturi", 0) or 0,
                                "capitaluri_proprii": yd.get("capitaluri_total", 0) or 0,
                                "caen_descriere": yd.get("caen_descriere", "")
                            })

                        evolutie_venituri = None
                        if len(istoric) >= 2 and istoric[1]["cifra_afaceri"] > 0:
                            diff = istoric[0]["cifra_afaceri"] - istoric[1]["cifra_afaceri"]
                            evolutie_venituri = round((diff / istoric[1]["cifra_afaceri"]) * 100, 1)

                        return {
                            "an": latest.get("year", "N/A"),
                            "cifra_afaceri": ca,
                            "venituri_totale": latest_data.get("venituri_totale", ca),
                            "cheltuieli": latest_data.get("cheltuieli_totale", 0),
                            "profit_net": profit_net,
                            "pierdere_neta": pierdere,
                            "datorii": datorii,
                            "angajati": angajati,
                            "capitaluri_proprii": capitaluri,
                            "disponibil_bancar": casa,
                            "casa_banci": casa,
                            "active_imobilizate": active_imobilizate,
                            "active_totale": active_circulante + active_imobilizate,
                            "creante": latest_data.get("creante", 0),
                            "caen_descriere": caen_desc,
                            "evolutie_venituri_pct": evolutie_venituri,
                            "ani_raportati": len(istoric),
                            "istoric": istoric
                        }
                return {}
        except Exception as e:
            print(f"Eroare API OpenAPI financials: {e}")
            return {}
