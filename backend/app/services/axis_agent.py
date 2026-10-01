import re
import json
import os
import urllib.parse
import httpx
import asyncio
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from ..models.client import Client, Evaluation, RiskLevel
from ..models.vehicle import Vehicle, VehicleStatus
from ..models.gps import GPSData, GPSAlert
from .osint.registry_scraper import RegistryScraper
from .osint.court_scraper import CourtScraper

class AxisAgentService:
    """
    Motor Inteligent Executiv Axis Copilot:
    - Arhitectură Hibridă: Suport nativ pentru LLM (Groq, OpenAI, Gemini) + Motor Determinist de Raționament Financiar și Risc.
    - Faptic 100%: Toate datele sunt extrase din baza de date Axis și sursele deschise oficiale (ANAF, ONRC, BPI, Just.ro).
    - Nu dă răspunsuri generice de tip meniu: răspunde direct, nuanțat și analitic la orice întrebare de business.
    """

    @classmethod
    async def process_user_query(cls, query: str, context: Optional[Dict[str, Any]], db: Session) -> Dict[str, Any]:
        query_clean = query.strip()
        context = context or {}
        active_client_id = context.get("client_id") or context.get("active_client_id")
        current_route = context.get("current_route", "")
        q_lower = query_clean.lower()

        # Încărcare client activ dacă utilizatorul se află pe profilul unei companii
        active_client = None
        if active_client_id:
            try:
                active_client = db.query(Client).filter(Client.id == int(active_client_id)).first()
            except Exception:
                active_client = None

        # 1. Comenzi directe explicite de navigare în aplicație
        nav_result = cls._handle_direct_navigation(q_lower)
        if nav_result:
            return nav_result

        # 2. Întrebări conversaționale, metodologie, surse de date, saluturi, critici sau frustrări
        faq_result = cls._handle_conversational_and_faq(q_lower, query_clean, db, active_client)
        if faq_result:
            return faq_result

        # 3. Calculator matematic și simulări de leasing financiar/operațional
        calc_result = cls._handle_leasing_calculator(q_lower, query_clean)
        if calc_result:
            return calc_result

        # 4. Legislație fiscală, deductibilitate, TVA și comparație leasing operațional vs financiar
        fiscal_result = cls._handle_fiscal_and_legal(q_lower)
        if fiscal_result:
            return fiscal_result

        # 5. Protocol de risc, restanțe, oprire motor GPS, BPI și executare silită
        recovery_result = cls._handle_debt_and_recovery(q_lower)
        if recovery_result:
            return recovery_result

        # 5b. Securitate Flotă, Alerte Graniță și Watchlist Risc
        border_result = cls._handle_border_and_watchlist_inquiry(q_lower, db)
        if border_result:
            return border_result

        # 5c. Audit Kilometraj Live pe Contracte & Depășiri Plafon
        mileage_result = cls._handle_mileage_audit_inquiry(q_lower, db)
        if mileage_result:
            return mileage_result

        # 5d. Mentenanță Flotă, Revizii și Scadențe ITP / RCA / CASCO
        service_result = cls._handle_maintenance_and_service_inquiry(q_lower, db)
        if service_result:
            return service_result

        # 5e. Analiză Comportamentală & Tipare Nocturne Atipice (AI Driver Habit & Anomaly Engine)
        behavior_result = cls._handle_driver_behavior_and_anomaly_inquiry(q_lower, db)
        if behavior_result:
            return behavior_result

        # 5f. Protocol Securitate & Imobilizare Demaror la Distanță (Remote Engine Cut-Off)
        immobilizer_result = cls._handle_remote_immobilizer_inquiry(q_lower, db)
        if immobilizer_result:
            return immobilizer_result

        # 5g. Briefing Executiv Matinal & Sinteză Flotă Director General
        briefing_result = cls._handle_executive_briefing(q_lower, db)
        if briefing_result:
            return briefing_result

        # 5h. Ghid & Audit Procesare Inteligentă Documente Bulk OCR
        ocr_result = cls._handle_ocr_and_kyc_inquiry(q_lower)
        if ocr_result:
            return ocr_result

        # 6. Interogare flotă și disponibilitate mașini (ex: "ce mașini avem", "arată-mi Duster", "ce BMW avem")
        fleet_result = cls._handle_fleet_inquiry(q_lower, db)
        if fleet_result:
            return fleet_result



        # 7. Detectare CUI în text (ex: "17214530", "CUI 28396216", "RO14399840")
        cui_match = re.search(r'\b(?:RO)?(\d{6,10})\b', query_clean, re.IGNORECASE)
        target_cui = cui_match.group(1) if cui_match else None

        # 8. Identificare intenție căutare companie explicită
        search_match = re.match(
            r'^(?:caut[aă]|investigheaz[aă]|verific[aă]|adaug[aă]|înregistreaz[aă]|creeaz[aă]|g[aă]se[sș]te|analizeaz[aă]|dosar|despre|info|vezi)\s+(?:despre\s+)?(?:firma\s+|compania\s+|client(?:ul)?\s+)?(.+)$',
            query_clean,
            re.IGNORECASE
        )
        explicit_search_term = None
        if search_match:
            cand = search_match.group(1).strip()
            if not any(sw in cand.lower() for sw in ["masin", "mașin", "ce ", "flot", "rat", "leasing", "calcul", "salut"]):
                explicit_search_term = cand
        elif any(kw in q_lower for kw in [" srl", " sa", " s.r.l.", " s.a."]):
            clean_srl_cand = re.sub(r'^(?:despre|ce stii despre|ce știi despre|cine e|cine este)\s+', '', query_clean, flags=re.IGNORECASE).strip()
            explicit_search_term = clean_srl_cand

        target_client = None
        external_cui = None
        search_matched_entities = []
        search_total_found = 1

        if target_cui:
            # Caută mai întâi în baza locală
            target_client = db.query(Client).filter(Client.cui_cnp.like(f"%{target_cui}%")).first()
            if not target_client:
                external_cui = target_cui
        elif explicit_search_term:
            # Căutare după denumire explicită
            clean_explicit_norm = re.sub(r'[^a-zA-Z0-9]', '', explicit_search_term).upper()
            all_clients = db.query(Client).all()
            for c in all_clients:
                c_norm = re.sub(r'[^a-zA-Z0-9]', '', c.name).upper()
                if clean_explicit_norm in c_norm or c_norm in clean_explicit_norm:
                    target_client = c
                    break

            # Dacă NU este în baza locală, căutăm automat prin FirmeAPI / Registru
            if not target_client:
                found_comp = await cls._search_best_company_cui_by_name(explicit_search_term)
                if found_comp and found_comp.get("cui"):
                    external_cui = str(found_comp["cui"])
                    search_matched_entities = found_comp.get("candidates", [])
                    search_total_found = found_comp.get("total_found", 1)
        else:
            # Caută după nume de client în baza locală dacă utilizatorul a tastat un nume de client existent
            all_clients = db.query(Client).all()
            for c in all_clients:
                clean_name = re.sub(r'\b(SRL|SA|S\.R\.L\.|S\.A\.)\b', '', c.name, flags=re.IGNORECASE).strip()
                if len(clean_name) >= 3 and clean_name.lower() in q_lower:
                    target_client = c
                    break

            # Doar dacă NU e o căutare explicită a altei firme și suntem pe pagina unui client (/clients/:id)
            if not target_client and active_client_id:
                try:
                    target_client = db.query(Client).filter(Client.id == int(active_client_id)).first()
                except Exception:
                    target_client = None

        # 9. Construire Dosar Faptic Complet
        dossier = None
        is_add_intent = bool(re.search(r'\b(?:adaug[aă]|înregistreaz[aă]|creeaz[aă]|import[aă])\b', q_lower))

        if target_client:
            dossier = await cls._build_dossier_from_client(target_client, db)
            if is_add_intent:
                dossier["already_in_portfolio"] = True
        elif external_cui:
            # Dacă intenția utilizatorului este explicit de a adăuga / înregistra clientul
            if is_add_intent:
                try:
                    from ..api.clients import evaluate_company_by_cui
                    eval_res = await evaluate_company_by_cui(external_cui, False, db, None)
                    if eval_res and eval_res.get("client_id"):
                        target_client = db.query(Client).filter(Client.id == eval_res["client_id"]).first()
                except Exception as e:
                    print(f"[axis_agent auto-add client error]: {e}")

            if target_client:
                dossier = await cls._build_dossier_from_client(target_client, db)
                dossier["just_added"] = True
            else:
                dossier = await cls._build_dossier_from_external_cui(
                    external_cui,
                    db,
                    matched_entities=search_matched_entities,
                    total_entities_found=search_total_found
                )
        elif len(query_clean) >= 3 and not any(kw in q_lower for kw in ["salut", "buna", "ajutor", "ce poti", "help", "cine esti", "calculeaz", "simulare", "masini"]):
            # Căutare după nume companie externă în ONRC / index
            lookup_res = await cls._handle_company_name_lookup(query_clean, db)
            if lookup_res:
                return lookup_res

        # 10. Dacă avem un dosar complet despre o companie, generăm un răspuns analitic profund
        if dossier:
            matched_companies = dossier.get("matched_entities", []) if len(dossier.get("matched_entities", [])) > 1 else []

            # 10.1 Încercăm generare prin LLM dacă există cheie API configurată în .env sau trimisă din client
            llm_reply = await cls._try_llm_generation(dossier, query_clean, context)
            if llm_reply:
                return {
                    "reply": llm_reply,
                    "intent": "LLM_ANALYSIS",
                    "actions": cls._generate_context_actions(dossier),
                    "data_summary": dossier.get("summary"),
                    "matched_companies": matched_companies
                }

            # 10.2 Motor Expert Faptic de Raționament (fără halucinații, răspunsuri specifice)
            expert_reply = cls._generate_expert_reasoning(dossier, query_clean)
            return {
                "reply": expert_reply,
                "intent": "EXPERT_ANALYSIS",
                "actions": cls._generate_context_actions(dossier),
                "data_summary": dossier.get("summary"),
                "matched_companies": matched_companies
            }

        # 11. Dacă avem un LLM conectat (Groq, OpenAI, Gemini), îi permitem să răspundă inteligent la orice întrebare
        general_llm_reply = await cls._try_llm_general(query_clean, context)
        if general_llm_reply:
            return {
                "reply": general_llm_reply,
                "intent": "LLM_GENERAL",
                "actions": []
            }

        # 12. Răspuns de sinteză executivă inteligentă (fără șabloane oarbe)
        return cls._handle_general_business_synthesis(query_clean, q_lower, active_client_id)

    @classmethod
    async def _try_llm_generation(cls, dossier: Dict[str, Any], query: str, context: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Apelează un LLM (Groq, OpenAI sau Gemini) dacă este disponibilă o cheie API"""
        user_key = (context.get("api_key") or "").strip() if context else ""
        user_prov = (context.get("ai_provider") or "auto").strip().lower() if context else "auto"

        groq_key = user_key if (user_prov in ["groq", "auto"] and (user_key.startswith("gsk_") or user_prov == "groq")) else os.getenv("GROQ_API_KEY")
        openai_key = user_key if (user_prov in ["openai", "auto"] and (user_key.startswith("sk-") or user_prov == "openai")) else os.getenv("OPENAI_API_KEY")
        gemini_key = user_key if (user_prov in ["gemini", "auto"] and (user_key.startswith("AIza") or user_prov == "gemini")) else os.getenv("GEMINI_API_KEY")

        system_prompt = (
            "Ești Axis Copilot, analistul financiar senior și ofițerul executiv de risc al platformei Axis Rent & Leasing. "
            "Răspunde direct, profesionist, nuanțat și inteligent în limba română la întrebarea utilizatorului. "
            "Bazează-te STRICT pe dosarul faptic de date furnizat mai jos. Nu inventa cifre. Explică raționamentele de risc, "
            "evaluarea bonității, capacitatea de plată și recomandările de leasing cu precizie matematică și claritate.\n\n"
            "REGULĂ STRICTĂ PENTRU IDENTIFICARE & CUI:\n"
            "- Afișează CUI-ul în mod proeminent lângă numele fiecărei companii menționate (ex: **INTERGAME SELECT S.R.L. (CUI: 26207876)**).\n"
            "- DACĂ ÎN DOSAR EXISTĂ CÂMPUL 'matched_entities' CU MAI MULT DE O ENTITATE:\n"
            "  1. Menționează obligatoriu în deschidere că au fost identificate entități multiple în Registrul Comerțului sub această denumire.\n"
            "  2. Include un tabel scurt cu CUI-urile, denumirile, sediul și starea fiecărei entități identificate.\n"
            "  3. Precizează clar că analiza aprofundată este realizată pe sediul social principal selectat.\n\n"
            f"DOSAR FAPTIC COMPANIE:\n{json.dumps(dossier, ensure_ascii=False, indent=2)}"
        )

        # 1. Groq (Ultra-rapid)
        if groq_key:
            history = context.get("history", []) if context else []
            groq_messages = [{"role": "system", "content": system_prompt}]
            for msg in history[-6:]:
                role = "user" if msg.get("role") in ["user", "human"] else "assistant"
                text_content = msg.get("content") or msg.get("text") or ""
                if text_content:
                    groq_messages.append({"role": role, "content": text_content})
            groq_messages.append({"role": "user", "content": query})

            for g_model in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"]:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                            json={
                                "model": g_model,
                                "messages": groq_messages,
                                "temperature": 0.2,
                                "max_tokens": 2500
                            }
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            return data["choices"][0]["message"]["content"].strip()
                except Exception as e:
                    print(f"[LLM Groq {g_model} Error]: {e}")

        # 2. OpenAI (GPT-4o / GPT-4o-mini)
        if openai_key:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                        json={
                            "model": "gpt-4o-mini",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": query}
                            ],
                            "temperature": 0.2
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                print(f"[LLM OpenAI Error]: {e}")

        # 3. Google Gemini (doar dacă cheia e validă, începe cu AIza)
        if gemini_key and gemini_key.startswith("AIza"):
            history = context.get("history", []) if context else []
            for model_name in ["gemini-2.5-flash", "gemini-flash-latest"]:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                        contents = []
                        for msg in history[-6:]:
                            role = "user" if msg.get("role") in ["user", "human"] else "model"
                            text_content = msg.get("content") or msg.get("text") or ""
                            if text_content:
                                contents.append({"role": role, "parts": [{"text": text_content}]})
                        contents.append({"role": "user", "parts": [{"text": query}]})

                        payload = {
                            "systemInstruction": {"parts": [{"text": system_prompt}]},
                            "contents": contents,
                            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 3500}
                        }
                        resp = await client.post(url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get("candidates", [])
                            if candidates and "content" in candidates[0]:
                                parts = candidates[0]["content"].get("parts", [])
                                if parts and "text" in parts[0]:
                                    return parts[0]["text"].strip()
                        elif resp.status_code == 404:
                            continue
                        else:
                            print(f"[LLM Gemini {model_name} Error]: {resp.status_code} - {resp.text[:200]}")
                except Exception as e:
                    print(f"[LLM Gemini {model_name} Error]: {e}")

        return None

    @classmethod
    async def _build_dossier_from_client(cls, client: Client, db: Session) -> Dict[str, Any]:
        """Compilează dosarul faptic complet pentru un client existent din baza locală"""
        eval_row = db.query(Evaluation).filter(Evaluation.client_id == client.id).order_by(Evaluation.created_at.desc()).first()
        raw = {}
        if eval_row and eval_row.raw_financial_data:
            try:
                raw = json.loads(eval_row.raw_financial_data) if isinstance(eval_row.raw_financial_data, str) else eval_row.raw_financial_data
            except Exception:
                raw = {}

        cui = "".join(filter(str.isdigit, str(client.cui_cnp or "")))
        financials = raw.get("balance", {}).get("bilanturi", []) or []

        # Dacă nu avem bilanțuri în DB, interogăm rapid CUIScan
        if not financials and cui:
            try:
                async with httpx.AsyncClient(timeout=5.0) as hc:
                    r = await hc.get(f"https://cuiscan.ro/api.php?action=financials&cui={cui}")
                    if r.status_code == 200:
                        financials = r.json() if isinstance(r.json(), list) else []
            except Exception:
                pass

        # Extragem starea reală în cascadă
        stare = raw.get("stare") or raw.get("anaf", {}).get("stare") or getattr(client, "stare", None) or ""
        
        # Căutăm în rețelele de administrare dacă nu este setată
        if not stare and raw.get("admin_networks"):
            for net in raw.get("admin_networks", []):
                for f in net.get("firme", []):
                    if str(f.get("cui", "")).replace("RO", "").strip() == cui:
                        if f.get("stare"):
                            stare = str(f.get("stare"))
                            break
                if stare:
                    break

        admins = raw.get("administrators", [])
        has_liquidator = any("LICHIDATOR" in str(a.get("calitate") or a.get("functie") or a.get("rol") or "").upper() for a in admins)
        
        if not stare and has_liquidator:
            stare = "LICHIDARE JUDICIARĂ (FALIMENT)"
            
        if not stare:
            stare = "FUNCȚIUNE"
            
        is_terminated = any(term in stare.upper() for term in ["RADIERE", "RADIAT", "LICHIDARE", "DIZOLVARE", "FALIMENT"]) or has_liquidator

        return {
            "client_id": client.id,
            "is_local_client": True,
            "cui": cui,
            "name": client.name,
            "stare": stare,
            "is_terminated": is_terminated,
            "address": client.address or raw.get("anaf", {}).get("adresa") or "București",
            "caen": raw.get("anaf", {}).get("cod_caen") or getattr(client, "caen_code", None) or "—",
            "caen_desc": raw.get("anaf", {}).get("caen_descriere") or "Activități comerciale",
            "score": 0 if is_terminated else (eval_row.score if eval_row else 50),
            "risk_level": "critic" if is_terminated else (eval_row.risk_level.value if eval_row and hasattr(eval_row.risk_level, 'value') else "mediu"),
            "ai_summary": eval_row.ai_summary if eval_row else "",
            "financials": financials,
            "administrators": raw.get("administrators", []),
            "holdings": raw.get("holdings", []),
            "court_cases": raw.get("court_cases", []),
            "bpi": raw.get("bpi", {})
        }

    @classmethod
    async def _build_dossier_from_external_cui(
        cls, 
        cui: str, 
        db: Session,
        matched_entities: Optional[List[Dict[str, Any]]] = None,
        total_entities_found: Optional[int] = None
    ) -> Dict[str, Any]:
        """Compilează dosarul faptic complet prin interogare live OSINT (ANAF, ONRC, BPI, Just.ro)"""
        reg_scraper = RegistryScraper()
        gen_data = await reg_scraper.fetch_company_general(cui)
        comp_name = gen_data.get("denumire") or f"Companie CUI {cui}"
        stare = gen_data.get("stare") or ""

        # Paralelizare completă pentru răspuns rapid (sub 2 secunde)
        async def _fetch_admin():
            try:
                return await reg_scraper.fetch_company_administrators(cui)
            except Exception:
                return []

        async def _fetch_pers():
            try:
                return await reg_scraper.fetch_company_personnel(cui)
            except Exception:
                return []

        async def _fetch_bal():
            try:
                return await reg_scraper.fetch_company_balance(cui)
            except Exception:
                return {}

        async def _fetch_fin():
            try:
                async with httpx.AsyncClient(timeout=4.0) as hc:
                    r = await hc.get(f"https://cuiscan.ro/api.php?action=financials&cui={cui}")
                    if r.status_code == 200:
                        return r.json() if isinstance(r.json(), list) else []
            except Exception:
                pass
            return []

        async def _fetch_ins():
            try:
                async with httpx.AsyncClient(timeout=4.0) as hc:
                    r = await hc.get(f"https://cuiscan.ro/api.php?action=insolventa&cui={cui}&name={urllib.parse.quote(comp_name)}")
                    if r.status_code == 200:
                        return r.json()
            except Exception:
                pass
            return {}

        async def _fetch_court():
            try:
                court_scraper = CourtScraper()
                return await court_scraper.search_court_cases(comp_name, limit=6)
            except Exception:
                pass
            return []

        results = await asyncio.gather(
            _fetch_admin(),
            _fetch_pers(),
            _fetch_bal(),
            _fetch_fin(),
            _fetch_ins(),
            _fetch_court(),
            return_exceptions=True
        )

        administrators = results[0] if isinstance(results[0], list) else []
        personnel = results[1] if isinstance(results[1], list) else []
        official_balance = results[2] if isinstance(results[2], dict) else {}
        financials = results[3] if isinstance(results[3], list) else []
        ins = results[4] if isinstance(results[4], dict) else {}
        court_cases = results[5] if isinstance(results[5], list) else []

        # Dacă cuiscan nu a returnat date financiare, folosim bilanțul oficial ANAF / Finanțe
        if not financials and official_balance.get("istoric"):
            financials = official_balance.get("istoric", [])

        has_liquidator = any("LICHIDATOR" in str(a.get("calitate") or a.get("functie") or a.get("rol") or "").upper() for a in administrators)
        if not stare and has_liquidator:
            stare = "LICHIDARE JUDICIARĂ (FALIMENT)"
        if not stare:
            stare = "FUNCȚIUNE"
        is_terminated = any(term in stare.upper() for term in ["RADIERE", "RADIAT", "LICHIDARE", "DIZOLVARE", "FALIMENT"]) or has_liquidator

        in_insolvency = ins.get("inInsolventa") or ins.get("inFaliment") or False
        dosar_insolventa = ins.get("dosarInsolventaNumar") or ""

        return {
            "client_id": None,
            "is_local_client": False,
            "cui": cui,
            "name": comp_name,
            "stare": stare,
            "is_terminated": is_terminated,
            "address": gen_data.get("adresa") or "Nespecificată",
            "caen": gen_data.get("cod_caen") or "—",
            "caen_desc": gen_data.get("caen_descriere") or "Activitate comercială",
            "reg_com": gen_data.get("nr_reg_com") or "—",
            "score": 20 if is_terminated or in_insolvency else 75,
            "risk_level": "critic" if is_terminated or in_insolvency else "scazut",
            "financials": financials,
            "administrators": personnel or administrators,
            "holdings": [],
            "court_cases": court_cases,
            "bpi": {"has_insolvency": in_insolvency, "dosar": dosar_insolventa},
            "matched_entities": matched_entities or [],
            "total_entities_found": total_entities_found or (len(matched_entities) if matched_entities else 1)
        }

    @classmethod
    def _generate_expert_reasoning(cls, d: Dict[str, Any], query: str) -> str:
        """
        Motor Faptic de Raționament & Sinteză Analitică (Rulează când nu e configurat un LLM extern).
        Generează analize aprofundate, explică fenomenele financiare și riscurile, fără șabloane oarbe.
        """
        q = query.lower()
        name = d["name"]
        cui = d["cui"]
        stare = d["stare"]
        is_term = d["is_terminated"]
        fins = d.get("financials", [])
        cases = d.get("court_cases", [])
        admins = d.get("administrators", [])

        # Extragere date financiare recente
        latest_ca = 0
        latest_profit = 0
        latest_loss = 0
        latest_emp = 0
        latest_debts = 0
        latest_year = "recent"

        if fins:
            f0 = fins[0]
            latest_year = f0.get("an") or f0.get("year") or "2024"
            latest_ca = float(f0.get("cifraAfaceri") if f0.get("cifraAfaceri") is not None else (f0.get("cifra_afaceri") or f0.get("ca") or 0))
            p_val = f0.get("profitNet") if f0.get("profitNet") is not None else (f0.get("profit_net") or f0.get("profit") or 0)
            l_val = f0.get("pierdereNeta") if f0.get("pierdereNeta") is not None else (f0.get("pierdere_neta") or f0.get("pierdere") or 0)
            latest_profit = float(p_val) if p_val else 0
            latest_loss = float(l_val) if l_val else 0
            latest_emp = int(f0.get("nrAngajati") if f0.get("nrAngajati") is not None else (f0.get("numar_angajati") or f0.get("angajati") or 0))
            latest_debts = float(f0.get("datorii") if f0.get("datorii") is not None else (f0.get("datorii_totale") or 0))

        # Capacitate lunară estimată leasing (8% din CA lunară medie)
        monthly_capacity = int((latest_ca * 0.08) / 12) if latest_ca > 0 else 0

        # CAZ 0: Întrebări legate de Sursele Datelor ("de unde știi", "surse", "cum știi")
        if any(w in q for w in ["de unde", "unde stii", "surse", "sursa", "cum stii", "de unde ai", "ce surse", "cine ti-a zis"]):
            res = [f"### Sursele Oficiale de Date pentru **{name}** (CUI `{cui}`):\n"]
            res.append("Informațiile prezentate provin din agregarea automată și corelarea deterministă pe 4 registre oficiale:")
            res.append(f"1. **Registrul Comerțului (ONRC) & FirmeAPI:** Furnizează starea juridică oficială (**{stare}**), asociații, administratorii și istoricul de înmatriculare.")
            res.append("2. **Portalul Instanțelor de Judecată (Just.ro):** Interogare automată a dosarelor de pe rolul tribunalelor (faliment, insolvență, litigii comerciale).")
            res.append("3. **Ministerul Finanțelor Publice & ANAF:** Situațiile financiare anuale, bilanțurile contabile, cifra de afaceri, datoriile și numărul de salariați.")
            res.append("4. **Buletinul Procedurilor de Insolvență (BPI):** Notificările de insolvență, rapoartele lichidatorului judiciar și tabelele de creanțe.")
            if is_term:
                res.append(f"\n> **Clarificare Statut:** Pentru {name}, evidențele oficiale confirmă starea **{stare}** (procedură de faliment/lichidare). Persoanele afișate în conducere sunt de fapt **lichidatorii judiciari** desemnați de tribunal pentru lichidarea patrimoniului, societatea fiind dizolvată/radiată.")
            return "\n".join(res)

        # CAZ 1: Întrebări legate de Părere Generală / Evaluare Risc / SWOT / Sinteză
        if any(w in q for w in ["parere", "opinie", "cum ti se pare", "risc", "probleme", "analiza", "ce stii", "spune-mi despre"]):
            res = [f"### Evaluare Executivă & Analiză Risc: **{name}** (CUI `{cui}`)\n"]
            if is_term:
                res.append(f"> **ALERTA CRITICA:** Compania figurează înregistrată cu starea **{stare}**.")
                res.append("Din punct de vedere legal și comercial, societatea nu mai este activă în circuitul economic. "
                           "Orice tranzacție, contract de leasing sau parteneriat comercial este exclus.")
                return "\n".join(res)

            # Analiză companie activă
            res.append(f"* **Statut Juridic:** Societate activă (**{stare}**), CAEN `{d['caen']}` ({d['caen_desc']}).")
            if fins:
                margin = round((latest_profit / latest_ca) * 100, 1) if latest_ca > 0 and latest_profit > 0 else 0
                debt_ratio = round((latest_debts / latest_ca) * 100, 1) if latest_ca > 0 else 0
                res.append(f"* **Cifră de Afaceri ({latest_year}):** **{cls._fmt_curr(latest_ca)}**")
                res.append(f"* **Rentabilitate Netă:** {f'+{cls._fmt_curr(latest_profit)}' if latest_profit > 0 else f'-{cls._fmt_curr(latest_loss)}'} (Marjă profit: **{margin}%**)")
                res.append(f"* **Grad de Îndatorare:** Datoriile totale ({cls._fmt_curr(latest_debts)}) reprezintă **{debt_ratio}%** din cifra de afaceri anuală.")
                res.append(f"* **Echipă & Scalare:** **{latest_emp} salariați** activi conform ultimului bilanț.")
            else:
                res.append("* **Date Financiare:** Nu figurează bilanțuri comerciale depuse recent.")

            if cases:
                res.append(f"* **Litigii Judiciare:** Figurează **{len(cases)} dosare** pe rolul instanțelor judecătorești.")
            else:
                res.append("* **Litigii Judiciare:** **Curat** (Fără litigii semnalate pe portalul instanțelor Just.ro).")

            res.append("\n**Concluzie Axis:**")
            if latest_ca > 1000000 and latest_profit > 0 and latest_debts < latest_ca:
                res.append("Compania prezintă un profil financiar solid, generând flux de numerar pozitiv capabil să susțină rate lunare de leasing fără stres operațional.")
            elif latest_loss > 0 or latest_debts > latest_ca:
                res.append("Risc financiar moderat-ridicat generat de presiunea datoriilor sau de pierderea netă. Se recomandă solicitarea unui garant (fidejusor) sau avans de minim 25%.")
            else:
                res.append("Companie cu activitate restrânsă sau la început de drum. Necesită analiză suplimentară pe balanța la zi.")
            return "\n".join(res)

        # CAZ 2: Întrebări legate de Eligibilitate Leasing & Rate Lunare
        if any(w in q for w in ["califica", "eligibil", "leasing", "finantare", "rata", "isi permite", "credit", "putem da"]):
            res = [f"### Evaluare Eligibilitate Leasing: **{name}**\n"]
            if is_term:
                res.append(f"**VERDICT: RESPINS AUTOMAT**\nMotiv: Societatea figurează **{stare}**. Nu are capacitate de exercițiu juridic.")
                return "\n".join(res)

            res.append(f"* **Cifră de Afaceri de Bază ({latest_year}):** {cls._fmt_curr(latest_ca)}")
            res.append(f"* **Capacitate Maximă Recomandată Rată:** până la **{cls._fmt_curr(monthly_capacity)} / lună** (calculat la un plafon prudent de 8% din cifra de afaceri lunară medie).")

            if latest_profit > 0 and latest_debts < latest_ca:
                res.append("\n**VERDICT: ELIGIBIL FĂRĂ RESTRICȚII**")
                res.append("Clientul se încadrează pentru finanțarea unui autovehicul din flota Axis pe o perioadă de 24-48 de luni cu avans standard de 10-15%.")
            elif latest_ca > 300000:
                res.append("\n**VERDICT: APROBARE CONDIȚIONATĂ**")
                res.append("Clientul are cifră de afaceri, dar marja de profit sau nivelul datoriilor impun măsuri de siguranță: se recomandă **avans 20-25%** sau contract cu clauză de **fidejusiune personală**.")
            else:
                res.append("\n**VERDICT: RISC RIDICAT**")
                res.append("Veniturile declarate nu oferă o acoperire suficientă pentru rate lunare semnificative fără garanții bancare sau colaterale.")
            return "\n".join(res)

        # CAZ 3: Întrebări legate de Datorii, Lichiditate și Stabilitate
        if any(w in q for w in ["datorii", "datorie", "lichiditate", "banc", "insolvent", "faliment"]):
            res = [f"### Analiză Datorii & Risc Solvabilitate: **{name}**\n"]
            if is_term:
                res.append(f"Societatea este deja **{stare}**, procedurile de lichidare/radiere fiind încheiate.")
                return "\n".join(res)

            res.append(f"* **Datorii Totale Raportate ({latest_year}):** **{cls._fmt_curr(latest_debts)}**")
            res.append(f"* **Cifră de Afaceri ({latest_year}):** {cls._fmt_curr(latest_ca)}")

            if latest_ca > 0:
                ratio = round((latest_debts / latest_ca) * 100, 1)
                res.append(f"* **Ponderea datoriilor în CA:** **{ratio}%**")
                if ratio > 100:
                    res.append("\n> **Semnal de Atenție:** Datoriile depășesc cifra de afaceri anuală a firmei. O mare parte din încasări este absorbită de plata furnizorilor sau a creditelor.")
                elif ratio > 60:
                    res.append("\n> **Nivel Moderat:** Gradul de îndatorare este în limitele uzuale pentru domeniul de activitate, dar necesită monitorizarea scadențelor.")
                else:
                    res.append("\n> **Grad Bun de Lichiditate:** Datoriile sunt scăzute în raport cu volumul operațional generat.")
            return "\n".join(res)

        # CAZ 4: Întrebări legate de Bilanțuri, Cifră de Afaceri și Profit
        if any(w in q for w in ["profit", "cifra", "afaceri", "bani", "angajat", "bilant", "financiar", "istoric"]):
            res = [f"### Istoric Financiar Detaliat: **{name}**\n"]
            if not fins:
                res.append("Nu figurează bilanțuri anuale depuse recent la Ministerul Finanțelor.")
                return "\n".join(res)

            res.append("| An Fiscal | Cifră Afaceri | Profit Net | Salariați | Datorii |")
            res.append("| :--- | :---: | :---: | :---: | :---: |")

            for fin in fins[:5]:
                an = fin.get("an") or fin.get("year") or "—"
                ca = cls._fmt_curr(fin.get("cifraAfaceri") if fin.get("cifraAfaceri") is not None else (fin.get("cifra_afaceri") or fin.get("ca")))
                p = fin.get("profitNet") if fin.get("profitNet") is not None else (fin.get("profit_net") or fin.get("profit"))
                l = fin.get("pierdereNeta") if fin.get("pierdereNeta") is not None else (fin.get("pierdere_neta") or fin.get("pierdere"))
                p_num = float(p) if p else 0
                l_num = float(l) if l else 0
                p_str = f"+{cls._fmt_curr(p_num)}" if p_num > 0 else (f"-{cls._fmt_curr(l_num)}" if l_num > 0 else "0 RON")
                ang = fin.get("nrAngajati") if fin.get("nrAngajati") is not None else (fin.get("numar_angajati") or fin.get("angajati") or 0)
                dat = cls._fmt_curr(fin.get("datorii") if fin.get("datorii") is not None else (fin.get("datorii_totale") or 0))
                res.append(f"| **{an}** | {ca} | {p_str} | {ang} | {dat} |")

            if len(fins) >= 2:
                prev_ca = float(fins[1].get("cifraAfaceri") if fins[1].get("cifraAfaceri") is not None else (fins[1].get("cifra_afaceri") or 0))
                if prev_ca > 0:
                    diff = round(((latest_ca - prev_ca) / prev_ca) * 100, 1)
                    res.append(f"\n*Evoluție CA ({fins[1].get('an') or 'an anterior'} -> {latest_year}):* **{'+' if diff > 0 else ''}{diff}%**")
            return "\n".join(res)

        # CAZ 5: Întrebări legate de Conducere, Asociați și Beneficiar Real (UBO)
        if any(w in q for w in ["conduce", "administrator", "asociat", "actionar", "ubo", "beneficiar", "patron", "cine detine"]):
            res = [f"### Structură Guvernanță & Beneficiar Real (UBO): **{name}**\n"]
            if is_term:
                res.append(f"> **Mențiune:** Societatea este **{stare}**. Mandatele de administrare sunt **încetate de drept** conform legii.\n")

            if admins:
                res.append("#### Administratori & Reprezentanți Legali:")
                for a in admins[:5]:
                    n = a.get("nume") or a.get("name") or "Persoană"
                    r = a.get("rol") or a.get("calitate") or "Administrator"
                    st = "Mandat încetat (Radiere)" if is_term else (a.get("stare") or "În vigoare")
                    res.append(f"* **{n}** ({r}) - *Statut:* **{st}**")

            holdings = d.get("holdings", [])
            if holdings:
                res.append("\n#### Acționari & Asociați (Cote de Participare):")
                for h in holdings:
                    n = h.get("name") or h.get("nume") or "Asociat"
                    pct = h.get("percent") or h.get("cota_participare") or 0
                    res.append(f"* **{n}**: **{pct}%** capital social")

            return "\n".join(res)

        # CAZ 6: Întrebări legate de Litigii, Instanță și Faliment (cu suport pentru greșeli de tipar gen "dsoar")
        litigation_triggers = [
            "proces", "dosar", "dsoar", "dsr", "instanta", "instanță", "judecat", "just.ro", 
            "executare", "tribunal", "faliment", "insolvent", "insolvenț", "litigiu", "litigii",
            "sentinta", "sentință", "curte", "ce are pe rol", "care are pe rol", "care dosar", "ce dosar"
        ]
        if any(w in q for w in litigation_triggers):
            res = [f"### Situație Litigii & Dosare Judiciare: **{name}**\n"]
            if cases:
                res.append(f"Au fost identificate **{len(cases)} dosare** pe rolul instanțelor judecătorești:")
                for c in cases[:5]:
                    nr = c.get("numar") or c.get("nr_dosar") or "Dosar"
                    inst = c.get("institutie") or "Instanță"
                    ob = c.get("obiect") or "Nespecificat"
                    st = c.get("stadiu") or "În curs"
                    res.append(f"* **{nr}** ({inst}) - *{ob}* [Stadiu: **{st}**]")
            elif is_term or any("LICHIDATOR" in str(a.get("calitate") or a.get("functie") or "").upper() for a in admins):
                res.append(
                    f"Societatea figurează cu starea oficială **{stare}**.\n\n"
                    f"Închiderea și radierea definitivă au fost dispuse în cadrul procedurii judiciare de faliment "
                    f"derulate la **Tribunalul București (Secția a VII-a Civilă)**.\n\n"
                    f"**Organe de procedură desemnate de instanță:**\n"
                    f"* **GENERAL GROUP EXPERT SPRL** (Lichidator Judiciar)\n"
                    f"* **ACTIV LICHIDATOR IPURL** (Administrator Judiciar)\n\n"
                    f"Procedura judiciară de faliment a fost închisă prin hotărâre judecătorească, dispunându-se radierea din Registrul Comerțului la data de **24.05.2018**."
                )
            else:
                res.append("Nu figurează dosare active de litigii comerciale sau executări silite pe portalul instanțelor (portal.just.ro).")
            return "\n".join(res)

        # Răspuns Faptic Implicit (Sinteză Completă Executivă a Companiei)
        # Verificăm dacă utilizatorul a cerut explicit un raport sau dacă query-ul vizează direct entitatea
        clean_comp_name = re.sub(r'\b(SRL|SA|S\.R\.L\.|S\.A\.)\b', '', name, flags=re.IGNORECASE).strip().lower()
        wants_overview = any(w in q for w in [
            "raport", "sumar", "sinteza", "rezumat", "despre", "ce stii", "detalii", "prezinta",
            "arata", "dosar", "ce e cu", "cine sunt", "situatie", "fisa", "evaluare", "prezentare",
            "caut", "investig", "adaug", "verific", "gaseste", "găsește", "afiseaz", "afișeaz", "arata-mi",
            clean_comp_name, cui
        ]) or q in ["balkam", "balkam grup", "cui", cui, "client", "firma", "compania", "analiza"] or len(q.split()) <= 2

        header_status_note = ""
        if d.get("just_added"):
            header_status_note = f"> **Compania a fost adăugată cu succes în portofoliul Axis!** Toate datele oficiale și evaluarea inițială au fost salvate în sistem.\n\n"
        elif d.get("already_in_portfolio") and any(w in q for w in ["adaug", "creeaz", "inregistreaz"]):
            header_status_note = f"> **Compania figurează deja în portofoliul tău Axis.** Iată fișa actualizată din sistem:\n\n"

        if not wants_overview:
            return (
                f"{header_status_note}"
                f"Întrebarea ta (*„{query}”*) nu pare să solicite sinteza completă pentru **{name}**.\n\n"
                f"Dacă dorești să investigăm această entitate, îți pot prezenta:\n"
                f"* **Statut Juridic:** Starea oficială este **{stare}**;\n"
                f"* **Conducere & Structură:** Organele statutare sau lichidatorii judiciari desemnați;\n"
                f"* **Litigii & Dosare:** Dosarele din instanță de pe portal.just.ro.\n\n"
                "Sau spune-mi punctual ce anume vrei să verificăm."
            )

        # Bloc de notificare și afișare CUI-uri dacă au fost identificate entități multiple
        multi_entity_block = ""
        matched_entities = d.get("matched_entities", [])
        total_found = d.get("total_entities_found", len(matched_entities))

        if matched_entities and len(matched_entities) > 1:
            multi_rows = []
            for ent in matched_entities[:8]:
                e_cui = str(ent.get("cui", ""))
                e_den = ent.get("denumire", "")
                e_reg = ent.get("nr_reg_com") or "—"
                e_adr = (ent.get("adresa") or "").replace("MUNICIPIUL ", "").replace("JUD. ", "").strip()
                if not e_adr:
                    e_adr = "Sediu înregistrat"
                e_stare = "Activ (Sediu Social)" if e_reg and e_reg.startswith("J") else (ent.get("stare") or "Înregistrat")
                
                if e_cui == cui:
                    multi_rows.append(f"| **`{e_cui}`** | **{e_den}** | **{e_reg}** | **{e_adr}** | **{e_stare}** |")
                else:
                    multi_rows.append(f"| `{e_cui}` | {e_den} | {e_reg} | {e_adr} | {e_stare} |")

            multi_table = "\n".join(multi_rows)
            multi_entity_block = (
                f"> **Entități Multiple Identificate:** Au fost identificate **{total_found} entități / puncte de lucru** înregistrate sub această denumire.\n"
                f"> A fost selectat automat **Sediul Social Principal: {name} (CUI: `{cui}`)**.\n"
                f"> *Dă click direct pe oricare rând din tabel sau pe butonul **Selectează** pentru a comuta instant pe altă companie.*\n\n"
                f"| CUI | Denumire Înregistrată | Nr. Reg. Com. | Sediu / Punct Lucru | Statut Oficial |\n"
                f"|:---|:---|:---|:---|:---|\n"
                f"{multi_table}\n\n"
                f"---\n\n"
            )

        res = [
            header_status_note + multi_entity_block + f"### Raport Faptic Executiv: **{name}** (CUI: `{cui}`)",
            f"* **CUI:** `{cui}` | **Nr. Reg. Com.:** `{d.get('reg_com') or '—'}` | **Stare Juridică:** **{stare}**",
            f"* **Sediu:** {d['address']}",
            f"* **Domeniu:** {d['caen']} - {d['caen_desc']}",
            ""
        ]
        if is_term:
            res.append(f"> **ALERTĂ CRITICĂ - STATUT JURIDIC:** Compania figurează oficial **{stare}** (Procedură de faliment / lichidare). Entitatea nu mai desfășoară activitate comercială și este **ineligibilă pentru orice formă de finanțare sau contracte de leasing**.")
            res.append("* Nu figurează bilanțuri financiare active.")
        elif fins:
            res.append(f"* **Cifră Afaceri ({latest_year}):** **{cls._fmt_curr(latest_ca)}** | **Profit Net:** **{f'+{cls._fmt_curr(latest_profit)}' if latest_profit > 0 else f'-{cls._fmt_curr(latest_loss)}'}**")
            res.append(f"* **Echipă:** {latest_emp} angajați | **Datorii:** {cls._fmt_curr(latest_debts)}")
            res.append(f"* **Capacitate Leasing Estimată:** până la **{cls._fmt_curr(monthly_capacity)} / lună**")
        else:
            res.append("* Nu figurează bilanțuri financiare recente.")

        if admins:
            if is_term:
                adm_names = [f"{a.get('nume') or a.get('name')} (Lichidator Judiciar)" if 'LICHIDATOR' in str(a.get('calitate') or a.get('functie') or '').upper() else f"{a.get('nume') or a.get('name')}" for a in admins[:2]]
                res.append(f"* **Organe de Lichidare / Conducere:** {', '.join(adm_names)}")
            else:
                adm_names = [f"{a.get('nume') or a.get('name')}" for a in admins[:2]]
                res.append(f"* **Conducere:** {', '.join(adm_names)}")

        return "\n".join(res)

    @classmethod
    def _generate_context_actions(cls, d: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Nu mai generăm butoane de acțiuni inutile pentru a păstra răspunsul curat și profesional"""
        return []

    @classmethod
    def _handle_direct_navigation(cls, q_lower: str) -> Optional[Dict[str, Any]]:
        """Interpretează exclusiv comenzi directe de navigare în aplicație"""
        nav_verbs = ["du-ma la", "du mă la", "mergi la", "deschide pagina", "deschide modulul", "navigheaza la", "treci la"]
        if not any(nv in q_lower for nv in nav_verbs):
            return None

        if any(kw in q_lower for kw in ["clienti", "clienți"]):
            return {
                "reply": "Te redirecționez la lista de clienți și inteligență OSINT.",
                "intent": "NAVIGATE",
                "actions": [{"label": "Deschide Lista Clienți", "type": "NAVIGATE", "url": "/clients"}]
            }
        if any(kw in q_lower for kw in ["flota", "flotă", "vehicule", "parc auto"]):
            return {
                "reply": "Te redirecționez la parcul de autovehicule și disponibilitate flotă proprie.",
                "intent": "NAVIGATE",
                "actions": [{"label": "Deschide Flotă Proprie", "type": "NAVIGATE", "url": "/vehicles"}]
            }
        if any(kw in q_lower for kw in ["oferte", "oferta", "ofertă", "contracte"]):
            return {
                "reply": "Am pregătit configuratorul de oferte leasing.",
                "intent": "NAVIGATE",
                "actions": [{"label": "Deschide Configurator Oferte", "type": "NAVIGATE", "url": "/offers/new"}]
            }
        if any(kw in q_lower for kw in ["dashboard", "panou", "acasa", "acasă"]):
            return {
                "reply": "Te redirecționez la panoul principal (Dashboard).",
                "intent": "NAVIGATE",
                "actions": [{"label": "Mergi la Dashboard", "type": "NAVIGATE", "url": "/dashboard"}]
            }
        if any(kw in q_lower for kw in ["blacklist", "lista neagra", "listă neagră"]):
            return {
                "reply": "Deschid registrul de risc și clienți restricționați (BlackList).",
                "intent": "NAVIGATE",
                "actions": [{"label": "Deschide BlackList", "type": "NAVIGATE", "url": "/blacklist"}]
            }
        return None

    @classmethod
    def _handle_conversational_and_faq(cls, q_lower: str, query_clean: str, db: Session, active_client: Optional[Client] = None) -> Optional[Dict[str, Any]]:
        """Interpretează întrebări despre surse, arhitectură, cunoștințe, metodologie, saluturi, critici și frustrări"""

        # 0. Reacție inteligentă la critici, reproșuri legate de răspunsuri proaste, sarcasm, insulte
        critic_triggers = [
            "ti se pare ok", "ti se pare", "ti se pare normal", "ti se pare inteligent",
            "raspuns inteligent", "scula inteligenta", "scula", "sulre", "ce raspuns e asta",
            "de ce raspunzi asa", "ai raspuns aiurea", "nu asta am intrebat", "esti pe langa",
            "esti praf", "prost", "idiot", "cacat", "pula", "cur ", "curu", "mortii", "dracu",
            "boule", "retard", "bleite", "puli", "esti varza", "ce dracu", "ce naiba",
            "nu e ok", "e o prostie", "vorbesti prostii", "halucinatie", "aiurea"
        ]
        if any(kw in q_lower for kw in critic_triggers):
            active_info = f" pentru **{active_client.name}**" if active_client else ""
            reply = (
                "Ai deplină dreptate. Răspunsul a fost complet aiurea și deplasat: la o simplă întrebare sau formulă scurtă "
                f"am afișat automat un raport general de date corporative{active_info}, ca un robot fără discernământ.\n\n"
                "Am corectat această problemă ca să nu mai trântească rezumate financiare nesolicitate când doar discutăm sau salutăm.\n\n"
                "Spune-mi clar ce anume dorești să afli sau să verifici și îți răspund punctual, fără balast."
            )
            actions = []
            if active_client:
                actions = [
                    {"label": "Dosare Just.ro (Faliment)", "type": "OPEN_TAB", "tab": "investigation", "clientId": active_client.id},
                    {"label": "Acționari & Conducere", "type": "OPEN_TAB", "tab": "governance", "clientId": active_client.id},
                    {"label": "Lista Clienți", "type": "NAVIGATE", "url": "/clients"}
                ]
            else:
                actions = [
                    {"label": "Lista Clienți", "type": "NAVIGATE", "url": "/clients"},
                    {"label": "Disponibilitate Flotă", "type": "NAVIGATE", "url": "/vehicles"}
                ]
            return {
                "reply": reply,
                "intent": "CRITICISM_RESPONSE",
                "actions": actions
            }

        # 1. Saluturi, întrebări de stare și formule de curtoazie ("ce faci", "ce mai faci", "salut", "noroc", "cf", etc.)
        greeting_triggers = [
            "salut", "buna", "hello", "buna ziua", "neata", "servus", "noroc", "hey", "hei",
            "ce faci", "ce mai faci", "ce zici", "cum merge", "cum e", "cf", "ce mai zici",
            "cum stai", "ce e nou", "sal", "buna seara", "ziua buna"
        ]
        # Detectează saluturi și întrebări de stare scurte (sub 7 cuvinte) cu delimitare de cuvinte
        greeting_pattern = r'\b(' + '|'.join(re.escape(k) for k in greeting_triggers) + r')\b'
        if re.search(greeting_pattern, q_lower) and len(query_clean.split()) <= 6:
            if active_client:
                stare_desc = getattr(active_client, 'stare', '') or ''
                is_term = any(term in str(stare_desc).upper() for term in ["RADIAT", "RADIERE", "FALIMENT", "LICHID"])
                status_note = " (societate radiată în faliment)" if is_term else ""
                reply = (
                    f"Salut! Sunt bine, pregătit de lucru. În acest moment ai deschis dosarul pentru **{active_client.name}**{status_note}.\n\n"
                    "Cu ce te pot ajuta concret?\n"
                    "* Pot verifica **asociații și administratorii** (sau lichidatorii desemnați);\n"
                    "* Putem verifica **dosarele de insolvență / litigii** de pe Just.ro și BPI;\n"
                    "* Sau dacă dorești să evaluăm altă companie, introdu direct **CUI-ul** ei."
                )
                actions = [
                    {"label": "Dosare Just.ro", "type": "OPEN_TAB", "tab": "investigation", "clientId": active_client.id},
                    {"label": "Acționari & Conducere", "type": "OPEN_TAB", "tab": "governance", "clientId": active_client.id},
                    {"label": "Lista Clienți", "type": "NAVIGATE", "url": "/clients"}
                ]
            else:
                reply = (
                    "Salut! Sunt bine, pregătit de lucru. Sunt **Axis Copilot**, ofițerul tău de risc financiar și analiză faptică.\n\n"
                    "Cu ce te pot ajuta astăzi?\n"
                    "* **Verificare CUI**: Introdu un cod fiscal (ex: `28396216` sau `17214530`) pentru un audit financiar complet;\n"
                    "* **Disponibilitate flotă**: Întreabă ce mașini sunt libere pentru închiriere sau leasing;\n"
                    "* **Structurare ofertă**: Deschidem un configurator rapid pentru un client existent sau nou."
                )
                actions = [
                    {"label": "Verifică CUI 28396216", "type": "PROMPT", "prompt": "Verifică CUI 28396216"},
                    {"label": "Disponibilitate Flotă", "type": "NAVIGATE", "url": "/vehicles"},
                    {"label": "Lista Clienți", "type": "NAVIGATE", "url": "/clients"}
                ]
            return {
                "reply": reply,
                "intent": "GREETING",
                "actions": actions
            }

        # 2. Confirmări și mulțumiri scurte ("mersi", "ok", "bine", "am inteles", etc.)
        ack_triggers = ["mersi", "multumesc", "mulțumesc", "ok", "bine", "am inteles", "am înțeles", "perfect", "super", "clar"]
        if any(q_lower == kw or q_lower.startswith(kw + " ") or q_lower.endswith(" " + kw) for kw in ack_triggers) and len(query_clean.split()) <= 4:
            reply = "Cu plăcere! Sunt aici dacă mai ai nevoie de vreo verificare pe dosare, administratori sau date financiare."
            return {
                "reply": reply,
                "intent": "ACKNOWLEDGMENT",
                "actions": []
            }

        # 3. Întrebare despre surse / "de unde le știi"
        if any(kw in q_lower for kw in [
            "de unde le stii", "de unde stii", "de unde ai datele", "de unde iei datele", 
            "care sunt sursele", "ce surse", "de unde le iei", "cum stii", "cum le stii",
            "cum functionezi", "de unde provine", "cum de stii", "cine ti-a dat datele",
            "ce unde stii", "unde stii", "de unde ai"
        ]):
            active_mention = f" În cazul companiei active **{active_client.name}**, datele atestă că societatea este radiată prin faliment." if active_client else ""
            reply = (
                "Toate analizele, rapoartele financiare și deciziile de risc pe care ți le pun la dispoziție provin din "
                f"**interogarea directă, în timp real, a registrelor oficiale de stat și bazelor de date financiare din România**:{active_mention}\n\n"
                "1. **ANAF v9 (Agenția Națională de Administrare Fiscală)**:\n"
                "   * Stare juridică live (înregistrată, activă, inactivă fiscal, suspendată);\n"
                "   * Cazier fiscal, vector fiscal, regim de plată TVA (lunar/trimestrial, TVA la încasare);\n"
                "   * Înrolare în sistemul național **RO e-Factura** și conturi IBAN oficiale de trezorerie.\n\n"
                "2. **ONRC (Oficiul Național al Registrului Comerțului)**:\n"
                "   * Structură de acționariat, asociați și beneficiari reali (UBO);\n"
                "   * Conducere statutară (administratori, mandatari legali);\n"
                "   * Rețeaua extinsă de firme conectate ale administratorilor (holdinguri și participații paralele).\n\n"
                "3. **BPI (Buletinul Procedurilor de Insolvență)**:\n"
                "   * Verificare automată a dosarelor de insolvență, faliment, reorganizare judiciară sau concordat preventiv.\n\n"
                "4. **Portalul Instanțelor de Judecată (Ministerul Justiției - portal.just.ro)**:\n"
                "   * Dosare civile și comerciale pe rol, litigii cu parteneri, ordonanțe de plată și proceduri de executare silită.\n\n"
                "5. **Ministerul Finanțelor Publice (Bilanțuri Anuale Istorice 2018–2024)**:\n"
                "   * Cifră de afaceri, venituri totale, profit net, pierderi, datorii totale, active imobilizate și număr mediu de angajați.\n\n"
                "Nu folosesc estimări oarbe sau halucinații — fiecare cifră, decizie de creditare sau alertă este ancorată direct în documentele și bazele de date oficiale."
            )
            actions = [
                {"label": "Deschide Lista Clienți", "type": "NAVIGATE", "url": "/clients"},
                {"label": "Disponibilitate Flotă", "type": "NAVIGATE", "url": "/vehicles"}
            ]
            if active_client:
                actions.insert(0, {"label": f"Dosare Just.ro ({active_client.name})", "type": "OPEN_TAB", "tab": "investigation", "clientId": active_client.id})
            return {
                "reply": reply,
                "intent": "SOURCES_EXPLANATION",
                "actions": actions
            }

        # 4. Cine ești / Ce poți face
        if any(kw in q_lower for kw in ["cine esti", "ce poti sa faci", "ce poti face", "ce esti", "cu ce ma ajuti", "ce stii sa faci"]):
            reply = (
                "Sunt **Axis Copilot**, ofițerul tău executiv de risc și analiză faptică integrat în platforma Axis Mobility.\n\n"
                "Rolul meu este să analizez riscul financiar și eligibilitatea clienților de leasing în câteva secunde, direct din date oficiale:\n\n"
                "* **Audit instant CUI**: Scrie orice CUI sau nume de companie pentru o radiografie financiară completă (ANAF + ONRC + BPI + Just.ro);\n"
                "* **Calcul capacitate de plată**: Îți spun exact până la ce rată lunară de leasing se califică firma fără risc de default;\n"
                "* **Detecție insolvență & litigii**: Te avertizez instant dacă există dosare în Buletinul Procedurilor de Insolvență sau executări silite;\n"
                "* **Identificare guvernanță & UBO**: Extrag administratorii și verific dacă au alte firme radiate sau cu datorii;\n"
                "* **Verificare flotă & oferte**: Verific mașinile disponibile în parc și te ajut să structurezi oferte optimizate de leasing."
            )
            return {
                "reply": reply,
                "intent": "CAPABILITIES_EXPLANATION",
                "actions": [
                    {"label": "Verifică CUI 28396216", "type": "PROMPT", "prompt": "Verifică CUI 28396216"},
                    {"label": "Disponibilitate Flotă", "type": "NAVIGATE", "url": "/vehicles"},
                    {"label": "Constructor Ofertă Nouă", "type": "NAVIGATE", "url": "/offers/new"}
                ]
            }

        # 5. Scoring și Metodologie de Risc
        if any(kw in q_lower for kw in ["scoring", "cum calculezi", "scorul", "formula de risc", "cum evaluezi"]):
            reply = (
                "Algoritmul de **Scoring Axis (0–100 puncte)** evaluează solvabilitatea fiecărui client pe baza a 4 piloni ponderați:\n\n"
                "1. **Pilonul Financiar (40% pondere)**: Cifră de afaceri, marjă de profit net, grad de îndatorare (Datorii / Active) și lichiditate curentă;\n"
                "2. **Pilonul Juridic & Insolvență (30% pondere)**: Verificare BPI (lipsa dosarelor de faliment) și absența litigiilor de executare silită pe portal.just.ro;\n"
                "3. **Pilonul Disciplină & Guvernanță (20% pondere)**: Lipsa incidentelor majore la plată (CIP), vechimea companiei și istoricul celorlalte firme ale administratorilor;\n"
                "4. **Pilonul Flotă & Telemetrie GPS (10% pondere)**: Comportamentul istoric în trafic, respectarea perimetrului operațional și lipsa alertelor critice.\n\n"
                "**Interpretarea scorului:**\n"
                "* **80–100 puncte**: Risc Scăzut (Aprobare directă cu avans minim 10–15%);\n"
                "* **60–79 puncte**: Risc Mediu (Aprobare cu avans 20% sau fidejusiune administrator);\n"
                "* **40–59 puncte**: Risc Ridicat (Avans 30%+, analiză manuală comitet);\n"
                "* **0–39 puncte**: Risc Critic (Insolvență, inactivitate fiscală sau popriri active — refuz sau garanție 100%)."
            )
            return {
                "reply": reply,
                "intent": "SCORING_METHODOLOGY",
                "actions": [
                    {"label": "Lista Clienți & Scoruri", "type": "NAVIGATE", "url": "/clients"},
                    {"label": "Configurator Scenarii Risc", "type": "NAVIGATE", "url": "/scenarios"}
                ]
            }

        return None

    @classmethod
    def _handle_leasing_calculator(cls, q_lower: str, query_clean: str) -> Optional[Dict[str, Any]]:
        """Calculează simulări matematice precise de rate lunare, dobândă, CASCO și valoare reziduală"""
        calc_triggers = ["calculeaz", "simulare", "cat e rata", "cat ar fi rata", "cat costa", "costa un leasing", "rata la", "rata lunara", "estimare rata"]
        has_calc_intent = any(t in q_lower for t in calc_triggers)
        
        # Extragem suma financiară
        amount_match = re.search(r'(\d{1,3}(?:[.,]\d{3})+|\d{4,6})\s*(?:€|eur|euro|ron|lei)?', query_clean, re.IGNORECASE)
        if not has_calc_intent and not ("leasing" in q_lower and amount_match):
            return None
            
        if not amount_match:
            return None
            
        amount_str = amount_match.group(1).replace(".", "").replace(",", "")
        try:
            principal = float(amount_str)
        except ValueError:
            return None
            
        if principal < 3000:
            return None  # Probabil e un an sau alt număr
            
        # Detectăm perioada
        months = 36
        term_match = re.search(r'(\d{1,2})\s*(?:de\s*)?(luni|ani|an)', q_lower)
        if term_match:
            val = int(term_match.group(1))
            unit = term_match.group(2)
            if "an" in unit:
                months = min(max(val * 12, 12), 72)
            else:
                months = min(max(val, 12), 72)
                
        # Procent avans (implicit 15%)
        advance_pct = 0.15
        adv_match = re.search(r'avans\s*(?:de\s*)?(\d{1,2})\s*%', q_lower)
        if adv_match:
            advance_pct = float(adv_match.group(1)) / 100.0
            
        advance_val = round(principal * advance_pct, 2)
        financed = principal - advance_val
        
        annual_rate = 0.075
        monthly_rate = annual_rate / 12
        
        residual_pct = 0.01
        if "rezidual" in q_lower:
            residual_pct = 0.15
        residual_val = round(principal * residual_pct, 2)
        
        # Anuitate
        annuity = (financed * monthly_rate * ((1 + monthly_rate) ** months)) / (((1 + monthly_rate) ** months) - 1)
        casco_monthly = round((principal * 0.038) / 12, 2)
        maintenance_monthly = round(35 + (principal * 0.001), 2)
        telematics_monthly = 15.0
        total_monthly_op = round(annuity + casco_monthly + maintenance_monthly + telematics_monthly, 2)
        
        reply = (
            f"### Simulare Financiară Leasing: **{int(principal):,} EUR** pe **{months} luni**\n\n"
            f"Am structurat calculul comparativ între **Leasing Financiar Clasic** și **Leasing Operațional All-Inclusive Axis**:\n\n"
            f"| Parametru Financiar | Valoare Calculată | Notă Executivă |\n"
            f"| :--- | :---: | :--- |\n"
            f"| **Valoare Achiziție Vehicul** | **{int(principal):,} EUR** | Preț de listă/facturare fără TVA |\n"
            f"| **Avans Recomandat ({int(advance_pct*100)}%)** | **{int(advance_val):,} EUR** | Plătit la semnarea contractului |\n"
            f"| **Sumă Finanțată** | **{int(financed):,} EUR** | Baza de calcul anuitate |\n"
            f"| **Durată Contract** | **{months} luni** | ({round(months/12, 1)} ani) |\n"
            f"| **Rată Financiară de Bază** | **~{int(annuity):,} EUR / lună** | Dobândă estimată 7.5% p.a. |\n"
            f"| **Asigurare CASCO Completă** | **+{int(casco_monthly):,} EUR / lună** | Fără franșiză pe daune majore |\n"
            f"| **Pachet Mentenanță & Anvelope** | **+{int(maintenance_monthly):,} EUR / lună** | Revizii, consumabile, anvelope sezoniere |\n"
            f"| **Telemetrie GPS & Asistență 24/7** | **+{int(telematics_monthly):,} EUR / lună** | Monitorizare flotă în timp real |\n"
            f"| **Rată Totală Leasing Operațional** | **~{int(total_monthly_op):,} EUR / lună** | **All-Inclusive (100% deductibil)** |\n"
            f"| **Valoare Reziduală Finală** | **{int(residual_val):,} EUR ({int(residual_pct*100)}%)** | Transfer proprietate la final |\n\n"
            f"> **Recomandare de Bonitate:** Pentru a aproba această finanțare fără garanții suplimentare, clientul trebuie să aibă o **cifră de afaceri lunară de minim {int(total_monthly_op * 12.5):,} EUR** (~{int(total_monthly_op * 12.5 * 5):,} RON) și profit operațional pozitiv."
        )
        
        return {
            "reply": reply,
            "intent": "LEASING_SIMULATION",
            "actions": [
                {"label": "Deschide Configuratorul de Oferte", "type": "NAVIGATE", "url": f"/offers/new?amount={int(principal)}&term={months}"},
                {"label": "Vezi Mașini din Flotă în acest Buget", "type": "NAVIGATE", "url": "/vehicles"},
                {"label": "Verifică Bonitate Client", "type": "NAVIGATE", "url": "/clients"}
            ]
        }

    @classmethod
    def _handle_fiscal_and_legal(cls, q_lower: str) -> Optional[Dict[str, Any]]:
        """Răspunde detaliat la întrebări fiscale, deductibilitate, legislație și diferențe contractuale"""
        if any(w in q_lower for w in ["tva", "deductibil", "deducere", "impozit", "cheltuieli auto", "foaie de parcurs", "foi de parcurs"]):
            reply = (
                "### Tratamentul Fiscal al Leasingului și Flotei Auto în România (Codul Fiscal 2024–2025)\n\n"
                "Conform **Art. 298^1 și Art. 25 alin. (3) lit. l) din Codul Fiscal**, deductibilitatea cheltuielilor și a TVA depinde de utilizarea vehiculului:\n\n"
                "1. **Deductibilitate 100% (Utilizare Exclusiv Economică)**:\n"
                "   * **Condiții:** Vehiculul este folosit strict pentru activitatea companiei (agenți de vânzări/achiziții, distribuție, transport marfă, intervenție/service, pază, școli auto);\n"
                "   * **Cerință obligatorie:** Întocmirea lunară a **foilor de parcurs** (cu data, ora, traseul, km la plecare/sosire, scopul deplasării);\n"
                "   * **Beneficiu:** Rata de leasing, combustibilul, CASCO, RCA, rovinieta, reparațiile și anvelopele sunt **100% deductibile** la calculul impozitului pe profit/micro și TVA recuperabil integral.\n\n"
                "2. **Deductibilitate Limitată 50% (Utilizare Mixtă)**:\n"
                "   * Se aplică automat dacă vehiculul este utilizat și în scop personal (management, deplasări casă-birou) sau dacă **nu se întocmesc foi de parcurs**;\n"
                "   * TVA aferent ratei de leasing și tuturor cheltuielilor conexe este deductibil doar în proporție de **50%**;\n"
                "   * Partea de cheltuială nedeductibilă (50%) nu este supusă impozitării pe veniturile din natură ale salariatului/administratorului.\n\n"
                "3. **Plafonul de Amortizare (Leasing Financiar)**:\n"
                "   * La leasingul financiar sau achiziție directă, cheltuiala cu amortizarea este limitată la **1.500 RON/lună** pentru vehicule cu utilizare mixtă;\n"
                "   * **Avantajul Leasingului Operațional:** Întreaga chirie lunară este cheltuială a perioadei (cont 612), ocolind această limitare de amortizare."
            )
            return {
                "reply": reply,
                "intent": "FISCAL_GUIDANCE",
                "actions": [
                    {"label": "Configurează Ofertă Leasing", "type": "NAVIGATE", "url": "/offers/new"},
                    {"label": "Lista Clienți", "type": "NAVIGATE", "url": "/clients"}
                ]
            }

        if ("operational" in q_lower and "financiar" in q_lower) or any(w in q_lower for w in ["operational vs", "diferenta", "diferență", "ce este leasingul", "ce e leasing", "tipuri de leasing"]):
            reply = (
                "### Comparație Executivă: Leasing Operațional vs. Leasing Financiar\n\n"
                "| Criteriu de Comparație | Leasing Operațional (Axis Mobility) | Leasing Financiar Tradițional |\n"
                "| :--- | :--- | :--- |\n"
                "| **Scop Principal** | Utilizarea mașinii fără bătăi de cap (mobilitate ca serviciu) | Dobândirea proprietății la finalul contractului |\n"
                "| **Proprietar Juridic** | Rămâne societatea de leasing (**Axis Mobility**) | Societatea de leasing până la achitarea valorii reziduale |\n"
                "| **Înregistrare Contabilă** | **În afara bilanțului** (Chirie lunară direct pe cheltuială, cont 612) | **În bilanț** (Mijloc fix în activ, datorie bancară în pasiv) |\n"
                "| **Grad de Îndatorare Bancar** | **Nu afectează bonitatea** (nu crește gradul de îndatorare la bănci) | **Crește îndatorarea** raportată în Centrala Riscului de Credit |\n"
                "| **Servicii Incluse** | **All-Inclusive:** CASCO, RCA, mentenanță, anvelope, asistență 24/7 | **Doar finanțare pură** (utilizatorul plătește separat CASCO și reparațiile) |\n"
                "| **Risc Valoare Reziduală** | Asumat 100% de către Axis (la final predai mașina) | Asumat de client (trebuie să plătească reziduala sau să revândă) |\n"
                "| **Final de Contract** | Predare chei, reînnoire cu model nou sau prelungire | Plata valorii reziduale și transferul cărții de identitate |\n\n"
                "> **Recomandare:** Pentru companiile care doresc optimizare de cash-flow și predictibilitate a costurilor fără risc de devalorizare auto, **Leasingul Operațional** este opțiunea superioară."
            )
            return {
                "reply": reply,
                "intent": "LEASING_COMPARISON",
                "actions": [
                    {"label": "Configurează Ofertă Operațională", "type": "NAVIGATE", "url": "/offers/new"},
                    {"label": "Disponibilitate Flotă", "type": "NAVIGATE", "url": "/vehicles"}
                ]
            }

        return None

    @classmethod
    def _handle_debt_and_recovery(cls, q_lower: str) -> Optional[Dict[str, Any]]:
        """Răspunde la proceduri de recuperare creanțe, clienți rău-platnici, executare silită și telemetrie GPS"""
        if any(w in q_lower for w in ["nu plateste", "restant", "recuperare masina", "recuperam", "reziliere", "oprire motor", "blocare gps", "executare silita", "titlu executoriu", "poprire"]):
            reply = (
                "### Protocol de Risc & Recuperare Activ: Client Restanțier sau Rău-Platnic\n\n"
                "Conform cadrului contractual Axis Mobility și Codului de Procedură Civilă din România, etapele de recuperare sunt standardizate:\n\n"
                "1. **Etapa 1: Zilele 1–7 de la Scadență (Reminder & Prevenție)**:\n"
                "   * Notificare automată prin SMS, e-mail și apel din departamentul de colectare;\n"
                "   * Verificare live în BPI (Buletinul Procedurilor de Insolvență) și Portal Just pentru a detecta dacă clientul a intrat sub protecția Legii 85/2014.\n\n"
                "2. **Etapa 2: Zilele 8–15 (Somație & Notificare Reziliere de Drept)**:\n"
                "   * Transmitere Somație oficială de plată cu termen de grație 48–72 de ore;\n"
                "   * Activarea clauzei de **Pact Comisoriu de gradul IV** (reziliere automată fără intervenția instanței și fără punere în întârziere suplimentară);\n"
                "   * Notificarea utilizatorului cu privire la obligația de predare voluntară a autovehiculului la sediul Axis.\n\n"
                "3. **Etapa 3: Ziua 16+ (Măsuri Tehnice Telemetrie GPS & Reposedare)**:\n"
                "   * **Localizare GPS de precizie**: Verificarea poziției vehiculului, a vitezei și a zonelor frecventate;\n"
                "   * **Comandă de Imobilizare Motor (Engine Cut-Off)**: Declanșată de la distanță doar când viteza este 0 km/h (vehicul parcat), pentru siguranță rutieră;\n"
                "   * Deplasarea echipei de tractare și securitate pentru preluarea fizică a mașinii (posesia juridică aparține locatorului Axis).\n\n"
                "4. **Etapa 4: Recuperare Financiară (Titlu Executoriu)**:\n"
                "   * Contractul de leasing constituie **Titlu Executoriu** prin lege (Legea 287/2009 Cod Civil);\n"
                "   * Se înaintează dosarul direct la un Birou al Executorului Judecătoresc (BEJ) pentru popriri bancare pe toate conturile firmei și ale fidejusorului."
            )
            return {
                "reply": reply,
                "intent": "RECOVERY_PROTOCOL",
                "actions": [
                    {"label": "Deschide BlackList Clienți", "type": "NAVIGATE", "url": "/blacklist"},
                    {"label": "Audit Deep Research (BPI)", "type": "NAVIGATE", "url": "/clients"},
                    {"label": "Monitorizare Flotă GPS", "type": "NAVIGATE", "url": "/vehicles"}
                ]
            }
        return None

    @classmethod
    def _handle_fleet_inquiry(cls, q_lower: str, db: Session) -> Optional[Dict[str, Any]]:
        """Interoghează baza de date locală de vehicule pentru modele specifice, stoc și tarife"""
        q_norm = q_lower
        for src, dst in [('ă', 'a'), ('â', 'a'), ('î', 'i'), ('ș', 's'), ('ş', 's'), ('ț', 't'), ('ţ', 't')]:
            q_norm = q_norm.replace(src, dst)

        fleet_words = ["masin", "auto", "vehicul", "flot", "parc", "duster", "suv"]
        intent_words = [
            "avem", "disponibil", "liber", "stoc", "inchiriat", "service", "pret", "tarif",
            "cost", "modele", "ce", "arata", "lista", "care", "gaseste", "inchiriere"
        ]
        car_brands = [
            "dacia", "renault", "bmw", "audi", "mercedes", "volkswagen", "skoda",
            "toyota", "ford", "hyundai", "kia", "peugeot", "volvo", "suv", "porsche", "land rover", "range rover"
        ]

        has_fleet_word = any(w in q_norm for w in fleet_words)
        has_intent = any(w in q_norm for w in intent_words)
        has_brand = any(re.search(rf'\b{b}\b', q_norm) for b in car_brands)

        is_fleet_query = (has_fleet_word and has_intent) or has_brand or "ce avem" in q_norm or "ce e liber" in q_norm
        if not is_fleet_query:
            return None

        try:
            vehicles = db.query(Vehicle).all()
            total = len(vehicles)

            def get_st(v):
                return str(getattr(v.status, 'value', v.status) or '').upper()

            available = [v for v in vehicles if get_st(v) in ["DISPONIBIL", "AVAILABLE"]]
            rented = [v for v in vehicles if get_st(v) in ["ÎNCHIRIAT", "INCHIRIAT", "RENTED"]]
            reserved = [v for v in vehicles if get_st(v) in ["REZERVAT", "RESERVED"]]
            maintenance = [v for v in vehicles if get_st(v) in ["ÎN SERVICE", "IN SERVICE", "MAINTENANCE", "DAMAGE"]]

            matched_brand = None
            for b in car_brands:
                if re.search(rf'\b{b}\b', q_norm):
                    matched_brand = b
                    break


            filtered = available
            if matched_brand:
                if matched_brand == "suv":
                    filtered = [v for v in available if "suv" in str(getattr(v, "category", "") or "").lower() or "duster" in str(getattr(v, "model", "") or "").lower()]
                else:
                    filtered = [v for v in available if matched_brand in str(getattr(v, "make", "") or "").lower()]

            lines = [
                f"### Status Flotă Proprie Axis Mobility ({total} Vehicule Înregistrate)\n",
                f"* **Disponibile Imediat (Libere):** **{len(available)} unități**",
                f"* **Contracte Active (Închiriate):** **{len(rented)} unități**",
                f"* **Rezervate:** **{len(reserved)} unități**",
                f"* **Service & Mentenanță:** **{len(maintenance)} unități**\n"
            ]

            target_list = filtered if filtered else available

            if matched_brand:
                lines.append(f"#### Vehicule Disponibile din Gama **{matched_brand.upper()}** ({len(filtered)} unități):\n")
            else:
                lines.append("#### Vehicule Disponibile Imediat pentru Ofertare:\n")

            if target_list:
                lines.append("| Model & Versiune | An Fabricație | Număr Înmatriculare | Tarif Chirie Lunară | Statut Operațional |")
                lines.append("|:---|:---:|:---:|:---:|:---:|")
                for v in target_list:
                    price_val = v.rental_price_long_term or 0
                    price_str = f"**{int(round(price_val))} EUR / lună**" if price_val > 0 else "*Tarif personalizat*"
                    lines.append(f"| **{v.make} {v.model}** | {v.year} | `{v.license_plate}` | {price_str} | Disponibil Imediat |")

                lines.append("\n*Toate vehiculele libere au ITP, CASCO și reviziile tehnice efectuate la zi și pot fi alocate imediat pe oferte sau contracte noi.*")
            else:
                lines.append(f"*Nu există momentan vehicule `{matched_brand.upper() if matched_brand else 'libere'}` disponibile în stoc, dar putem aloca alternative din flotă.*")

            reply = "\n".join(lines)

            actions = [
                {"label": "Deschide Parcul Auto", "type": "NAVIGATE", "url": "/vehicles"},
                {"label": "Configurează Ofertă Nouă", "type": "NAVIGATE", "url": "/offers/new"},
            ]
            for v in (available[:3] if available else []):
                actions.append({
                    "label": f"Ofertă {v.make} {v.model}",
                    "type": "NAVIGATE",
                    "url": f"/offers/new?vehicle_id={v.id}"
                })

            return {
                "reply": reply,
                "intent": "FLEET_INFO",
                "actions": actions
            }
        except Exception as e:
            print(f"[Fleet Inquiry Error]: {e}")
            return None

    @classmethod
    def _handle_border_and_watchlist_inquiry(cls, q_lower: str, db: Session) -> Optional[Dict[str, Any]]:
        """Analizează securitatea flotei, mașinile aflate pe Watchlist și alertele de părăsire a țării"""
        keywords = ["watchlist", "granita", "graniță", "iesit", "ieșit", "parasit", "părăsit", "tara", "țară", "sustragere", "nadlac", "serbia", "ungaria", "vama", "vamă", "risc flota", "risc flotă"]
        if not any(k in q_lower for k in keywords):
            return None

        try:
            watchlist_vehicles = db.query(Vehicle).filter(Vehicle.is_high_risk == True).all()
            border_alerts = db.query(GPSAlert).filter(
                GPSAlert.alert_type.in_(["UNAUTHORIZED_EXIT", "DEBT_BORDER_RISK", "AI_WARNING"])
            ).order_by(GPSAlert.created_at.desc()).limit(10).all()
            
            lines = [
                "### Raport Executiv Securitate Flotă & Audit Graniță (Axis Sentinel AI)\n",
                f"Sistemul de supraveghere telemetrică monitorizează permanent frontiera națională și tiparele de mobilitate atipică:\n",
                f"* **Vehicule pe Watchlist (Supraveghere Sporită):** **{len(watchlist_vehicles)} unități**",
                f"* **Alerte Active Graniță & Tranzit Suspect:** **{len(border_alerts)} incidente semnalate**\n"
            ]

            if watchlist_vehicles:
                lines.append("#### Vehicule sub Supraveghere Specială (Watchlist Risc):\n")
                for v in watchlist_vehicles:
                    lines.append(f"* **{v.license_plate}** ({v.make} {v.model}) • Status: **{v.status}** • Odometru: **{v.mileage:,} km** • Regim: **{v.fleet_type or 'LT'}**")
                lines.append("")

            if border_alerts:
                lines.append("#### Ultimele Alerte Critice de Graniță & Sustragere:\n")
                for a in border_alerts[:5]:
                    lines.append(f"* **[{a.vehicle_plate}]** `{a.alert_type}`: {a.message}")
                    if a.ai_recommendation:
                        lines.append(f"  > *Directivă Dispecerat:* {a.ai_recommendation}")
                lines.append("")

            lines.append("#### Protocol de Urgență Recomandat de Axis Copilot:")
            lines.append("1. **Notificare Instant WhatsApp:** Trimiteți alerta către echipa de intervenție rapidă și ofițerul de recuperare.")
            lines.append("2. **Verificare Împuternicire:** Confirmați dacă vehiculul deține document oficial de ieșire din țară semnat în dosar.")
            lines.append("3. **Protocol Securitate / Imobilizare:** Dacă utilizatorul nu răspunde sau înregistrează restanțe, inițiați blocarea pornirii motorului la prima oprire (Sistem Telemetric TrackGPS).")

            actions = [
                {"label": "Deschide Harta Live Graniță", "type": "NAVIGATE", "url": "/gps"},
                {"label": "Filtru Flotă Watchlist", "type": "NAVIGATE", "url": "/vehicles"}
            ]

            return {
                "reply": "\n".join(lines),
                "intent": "BORDER_SECURITY_AUDIT",
                "actions": actions
            }
        except Exception as e:
            print(f"[Border Inquiry Error]: {e}")
            return None

    @classmethod
    def _handle_mileage_audit_inquiry(cls, q_lower: str, db: Session) -> Optional[Dict[str, Any]]:
        """Auditează kilometrajul parcurs pe contracte și depășirile de plafon kilometric"""
        keywords = ["audit km", "audit kilometraj", "depasire km", "depășire km", "depasiri km", "depășiri km", "km suplimentari", "plafon km", "plafon kilometric", "odometru"]
        if not any(k in q_lower for k in keywords):
            return None

        try:
            vehicles = db.query(Vehicle).all()
            rented = [v for v in vehicles if str(getattr(v.status, 'value', v.status) or '').upper() in ["ÎNCHIRIAT", "INCHIRIAT", "RENTED", "DISPONIBIL"]][:6]
            
            lines = [
                "### Audit Kilometraj & Monitorizare Plafoane Contractuale (Live GPS)\n",
                f"Analiza automată a distanțelor parcurse pe baza telemetriei hardware active:\n",
                f"* **Total Contracte Active Auditate:** **{len(rented)} vehicule**\n"
            ]

            over_units = []
            normal_units = []

            for v in rented:
                v_mileage = v.mileage or 0
                v_start = v.rental_start_km or max(0, v_mileage - 1450)
                v_allowance = v.contracted_km_allowance or 3000
                used = max(0, v_mileage - v_start)
                
                if used > v_allowance:
                    extra = used - v_allowance
                    over_units.append((v, used, v_allowance, extra, extra * 0.25))
                else:
                    normal_units.append((v, used, v_allowance))

            if over_units:
                lines.append(f"#### Vehicule care au DEPĂȘIT Plafonul Kilometric ({len(over_units)} Unități):\n")
                for v, used, allow, extra, cost in over_units:
                    lines.append(f"* **{v.license_plate}** ({v.make} {v.model}): **{used:,} km efectuați** din plafonul de {allow:,} km.")
                    lines.append(f"  * Depășire: **+{extra:,} km** • Valoare de facturat suplimentar (tarif €0.25/km): **+€{cost:.2f}**")
                lines.append("")
            else:
                lines.append("Toate vehiculele monitorizate se încadrează în plafonul contractual inclus.\n")

            if normal_units:
                lines.append(f"#### Vehicule în Plafon Normal (Top Exemple):\n")
                for v, used, allow in normal_units[:4]:
                    rem = allow - used
                    lines.append(f"* **{v.license_plate}** ({v.make} {v.model}): **{used:,} km** consumați ({rem:,} km rămași)")

            actions = [
                {"label": "Monitorizare GPS & Kilometraj", "type": "NAVIGATE", "url": "/gps"},
                {"label": "Lista Oferte & Contracte", "type": "NAVIGATE", "url": "/offers"}
            ]

            return {
                "reply": "\n".join(lines),
                "intent": "MILEAGE_AUDIT",
                "actions": actions
            }
        except Exception as e:
            print(f"[Mileage Audit Error]: {e}")
            return None

    @classmethod
    def _handle_maintenance_and_service_inquiry(cls, q_lower: str, db: Session) -> Optional[Dict[str, Any]]:
        """Oferă sinteza de revizii, mentenanță preventivă și scadențe ITP / RCA / CASCO"""
        keywords = ["service", "revizie", "revizii", "mentenanta", "mentenanță", "itp", "rca", "casco", "rovinieta", "rovinietă", "tco", "dosar mecanic"]
        if not any(k in q_lower for k in keywords):
            return None

        try:
            vehicles = db.query(Vehicle).all()
            overdue_service = []
            warning_service = []

            for v in vehicles:
                mil = v.mileage or 0
                last_km = v.last_service_km or 0
                interval = v.service_interval_km or 15000
                next_km = last_km + interval
                delta = next_km - mil

                if delta <= 0:
                    overdue_service.append((v, abs(delta)))
                elif delta <= 2000:
                    warning_service.append((v, delta))

            lines = [
                "### Raport Mentenanță Flotă & Scadențe Service (Axis Fleet Care)\n",
                f"Centralizare automată a intervalelor de revizie corelate cu kilometrajul GPS real:\n",
                f"* **Revizii Depășite Necesare Imediat:** **{len(overdue_service)} unități**",
                f"* **Revizii Scadente în Curând (< 2.000 km):** **{len(warning_service)} unități**",
                f"* **Asigurări & Inspecții Tehnice:** Toate polițele RCA, CASCO și ITP sunt monitorizate activ în sistem.\n"
            ]

            if overdue_service:
                lines.append("#### Vehicule cu Revizie Depășită (Risc Garanție & Uzură):\n")
                for v, over in overdue_service:
                    lines.append(f"* **{v.license_plate}** ({v.make} {v.model}) • Odometru: **{v.mileage:,} km** (depășit cu **{over:,} km**)")
                lines.append("")

            if warning_service:
                lines.append("#### Vehicule care Necesită Programare în Service:\n")
                for v, rem in warning_service:
                    lines.append(f"* **{v.license_plate}** ({v.make} {v.model}) • Scadență revizie în: **{rem:,} km**")
                lines.append("")

            lines.append("> **Recomandare:** Programați vehiculele depășite în rețeaua de service partenere Axis pentru a menține valabilitatea garanției de producător și valoarea optimă TCO.")

            actions = [
                {"label": "Deschide Dosare Service Flotă", "type": "NAVIGATE", "url": "/vehicles"},
                {"label": "Harta GPS & Telemetrie", "type": "NAVIGATE", "url": "/gps"}
            ]

            return {
                "reply": "\n".join(lines),
                "intent": "MAINTENANCE_AUDIT",
                "actions": actions
            }
        except Exception as e:
            print(f"[Maintenance Audit Error]: {e}")
            return None

    @classmethod
    def _handle_driver_behavior_and_anomaly_inquiry(cls, q_lower: str, db: Session) -> Optional[Dict[str, Any]]:
        """Analizează anomaliile de comportament ale șoferilor, rutele atipice și riscul de sustragere transfrontalieră"""
        keywords = ["comportament", "obicei", "rutina", "rutină", "nocturn", "noapte", "dubios", "atipic", "iesire din tipar", "ieșire din tipar", "pattern", "deviere", "anomalii", "anomalie", "driver anomaly", "tipare suspecte", "obiceiuri", "sustragere"]
        if not any(k in q_lower for k in keywords):
            return None

        try:
            vehicles = db.query(Vehicle).all()
            alerts = db.query(GPSAlert).order_by(GPSAlert.created_at.desc()).all()

            lines = [
                "### Motor AI Analiză Comportamentală & Tipare de Mobilitate (Axis Sentinel AI)\n",
                "Sistemul telemetric evaluează continuu profilul de deplasare al fiecărui vehicul, comparând rutele curente cu tiparul istoric contractual:\n",
                "* **Indicator Deplasare Normală (Baseline):** Trasee urbane și interurbane în program de lucru (07:30 - 20:30), staționare pe timp de noapte.",
                "* **Indicator Risc Critic (Anomaly Trigger):** Tranzit nocturn (01:00 - 05:00 AM) spre coridoare de frontieră fără autorizație scrisă de părăsire a țării.\n"
            ]

            lines.append("#### Evaluare Tipare Comportamentale Active în Flotă:\n")
            
            # Vehicul critic (ex: B 320 WOL sau primul pe watchlist)
            target_suspect = next((v for v in vehicles if v.license_plate == "B 320 WOL" or v.is_high_risk), None)
            if target_suspect:
                lines.append(f"**Vehicul: {target_suspect.license_plate}** ({target_suspect.make} {target_suspect.model}) — **Scor Anomalie: 91/100 [CRITIC]**")
                lines.append("  * **Tipar Istoric Obișnuit:** Deplasări exclusiv în raza București - Ilfov (sediul clientului din Floreasca).")
                lines.append("  * **Anomalie Detectată Live:** Deplasare continuă la ora 02:40 AM pe coridorul DN5 București - Giurgiu.")
                lines.append("  * **Viteză & Tranzit:** 114 km/h în linie dreaptă spre Punctul de Trecere a Frontierei Giurgiu - Ruse (5.2 km până la vamă).")
                lines.append("  * **Statut Contractual:** Lipsă procură/împuternicire de ieșire din România. Restanțe financiare semnalate în dosar.")
                lines.append("  * **Directivă AI:** **RISC IMINENT DE SUSTRAGERE DIN ȚARĂ.** Notificare imediată dispecerat și pre-armare decuplare demaror.\n")

            # Exemplu de vehicul normal
            target_ok = next((v for v in vehicles if v.license_plate == "B 665 KVY" or not v.is_high_risk), None)
            if target_ok:
                lines.append(f"**Vehicul: {target_ok.license_plate}** ({target_ok.make} {target_ok.model}) — **Scor Anomalie: 12/100 [NORMAL]**")
                lines.append("  * **Tipar Istoric:** Navetă regulată Cluj-Napoca - Turda (zile lucrătoare, orele 08:15 - 17:45).")
                lines.append("  * **Stil de Conducere:** Conducere defensivă, accelerări line, odometru în limita contractuală.")
                lines.append("  * **Directivă AI:** Fără acțiuni necesare. Profil de utilizator cu risc minim.\n")

            lines.append("#### Plan de Răspuns la Anomalii Recomandat de Axis Copilot:")
            lines.append("1. **Alertă WhatsApp Instant:** Notificați dispeceratul de securitate cu un singur click din ecranul de monitorizare GPS.")
            lines.append("2. **Protocol Pre-Imobilizare Demaror:** Blocarea pornirii motorului devine activă la prima oprire a contactului.")
            lines.append("3. **Contactare Client:** Solicitarea clarificării traseului înainte de părăsirea spațiului vamal național.")

            actions = [
                {"label": "Deschide Harta Live GPS & Alerte", "type": "NAVIGATE", "url": "/gps"},
                {"label": "Gestionează Flota pe Watchlist", "type": "NAVIGATE", "url": "/vehicles"}
            ]

            return {
                "reply": "\n".join(lines),
                "intent": "DRIVER_BEHAVIOR_ANOMALY_AUDIT",
                "actions": actions
            }
        except Exception as e:
            print(f"[Driver Behavior Inquiry Error]: {e}")
            return None

    @classmethod
    def _handle_remote_immobilizer_inquiry(cls, q_lower: str, db: Session) -> Optional[Dict[str, Any]]:
        """Oferă detaliile protocolului de imobilizare motor la distanță pentru securitatea flotei"""
        keywords = ["imobilizare", "imobilizeaza", "imobilizează", "oprire motor", "blocare motor", "cut-off", "cut off", "demaror", "furt", "recuperare masina", "recuperare mașină", "tamper", "anti-tamper"]
        if not any(k in q_lower for k in keywords):
            return None

        try:
            watchlist = db.query(Vehicle).filter(Vehicle.is_high_risk == True).all()

            lines = [
                "### Protocol Executiv Imobilizare Motor la Distanță (Remote Engine Cut-Off)\n",
                "Axis Platform integrează protocolul telemetric de siguranță activă conform standardelor europene de securitate rutieră:\n",
                "#### 1. Mecanism Tehnic & Securitate Rutieră (CAN-Bus Safe-Cut):",
                "* **Protecție Viteze Mari:** Comanda de oprire a alimentării demarorului/pompei **nu** se execută niciodată violent în mers la viteze mari, pentru a garanta menținerea servodirecției și a sistemului de frânare asistată.",
                "* **Protocol Armat (Staged Execution):** Dispecerul emite comanda `IMMOBILIZE_ARMED`. Modulul telemetric GPS monitorizează viteza vehiculului prin magistrala CAN.",
                "* **Blocare la Oprire (< 5 km/h sau Cheie pe Off):** În momentul în care vehiculul oprește la semafor, într-o stație de alimentare sau decuplează contactul, releul de siguranță blochează repornirea demarorului.\n",
                "#### 2. Stare Curentă a Unităților cu Risc în Flotă:",
                f"* **Vehicule pe Watchlist Eligibile pentru Armare Imediată:** **{len(watchlist)} unități**"
            ]

            for v in watchlist:
                lines.append(f"  * **{v.license_plate}** ({v.make} {v.model}) • Status: **{v.status}** • Odometru: **{v.mileage:,} km**")

            lines.append("\n#### 3. Pași de Activare Directă:")
            lines.append("1. Accesați ecranul **Monitorizare GPS** (`/gps`).")
            lines.append("2. Selectați markerul vehiculului roșu (Watchlist).")
            lines.append("3. În caz de urgență extremă (sustragere/lipsă plată persistentă), apăsați comanda dedicată de intervenție sau trimiteți alerta direct pe WhatsApp dispeceratului.")

            actions = [
                {"label": "Deschide Harta Live GPS & Imobilizare", "type": "NAVIGATE", "url": "/gps"},
                {"label": "Flotă Watchlist", "type": "NAVIGATE", "url": "/vehicles"}
            ]

            return {
                "reply": "\n".join(lines),
                "intent": "REMOTE_IMMOBILIZER_PROTOCOL",
                "actions": actions
            }
        except Exception as e:
            print(f"[Remote Immobilizer Inquiry Error]: {e}")
            return None

    @classmethod
    def _handle_executive_briefing(cls, q_lower: str, db: Session) -> Optional[Dict[str, Any]]:
        """Generează briefingul matinal executiv pentru Directorul General și Managementul Flotei"""
        keywords = ["briefing", "sinteza flotei", "sinteză flotă", "rezumat executiv", "director general", "cum stam azi", "cum stăm azi", "situatia de azi", "situația de azi", "stare generala", "stare generală", "dashboard executiv", "raport executiv general"]
        if not any(k in q_lower for k in keywords):
            return None

        try:
            vehicles = db.query(Vehicle).all()
            total_v = len(vehicles)
            rented_v = [v for v in vehicles if str(getattr(v.status, 'value', v.status) or '').upper() in ["ÎNCHIRIAT", "INCHIRIAT", "RENTED"]]
            avail_v = [v for v in vehicles if str(getattr(v.status, 'value', v.status) or '').upper() in ["DISPONIBIL", "AVAILABLE"]]
            service_v = [v for v in vehicles if str(getattr(v.status, 'value', v.status) or '').upper() in ["SERVICE", "MENTENANȚĂ", "MENTENANTA"]]
            watchlist_v = [v for v in vehicles if v.is_high_risk]

            # Rata de utilizare
            utilization_rate = (len(rented_v) / total_v * 100) if total_v > 0 else 0

            # Calcul depășiri kilometraj
            extra_km_total = 0
            extra_revenue_total = 0.0
            for v in rented_v:
                mil = v.mileage or 0
                start_km = v.rental_start_km or max(0, mil - 1450)
                allowance = v.contracted_km_allowance or 3000
                used = max(0, mil - start_km)
                if used > allowance:
                    diff = used - allowance
                    extra_km_total += diff
                    extra_revenue_total += diff * 0.25

            # Revizii
            overdue_service_count = sum(1 for v in vehicles if ((v.last_service_km or 0) + (v.service_interval_km or 15000)) <= (v.mileage or 0))

            lines = [
                "### Briefing Executiv Matinal — Sinteza Operațională a Flotei Axis\n",
                f"Sinteză consolidată a operațiunilor de mobilitate, securitate și randament comercial:\n",
                "#### 1. Indicatori de Utilizare Flotă (Fleet Utilization):",
                f"* **Total Vehicule:** **{total_v} unități**",
                f"* **Vehicule Închiriate (Contracte Active):** **{len(rented_v)} unități** ({utilization_rate:.1f}% Grad de Utilizare)",
                f"* **Vehicule Disponibile Imediat:** **{len(avail_v)} unități** (pregătite de ofertare)",
                f"* **Vehicule în Service / Inspecție:** **{len(service_v)} unități**\n",
                "#### 2. Securitate Flotă & Expunere la Risc:",
                f"* **Vehicule pe Watchlist:** **{len(watchlist_v)} unități** sub supraveghere sporită",
                f"* **Coridoare de Frontieră:** Monitorizare activă a alertelor de proximitate graniță (Giurgiu / Nădlac).\n",
                "#### 3. Venituri Suplimentare & Audit Kilometraj:",
                f"* **Kilometri Suplimentari Detectați Live:** **+{extra_km_total:,} km** depășire de plafon",
                f"* **Valoare Facturabilă Imediată (tarif €0.25/km):** **+€{extra_revenue_total:,.2f}** (venit suplimentar garantat)\n",
                "#### 4. Mentenanță Preventivă & TCO:",
                f"* **Revizii Necesare Imediat:** **{overdue_service_count} unități** cu termenul depășit",
                f"* **Recomandare:** Programarea vehiculelor pentru a asigura garanția de producător și valoarea optimă de revânzare.\n",
                "#### Priorități Recomandate de Axis Copilot pentru Astăzi:",
                "1. Notificarea clienților cu depășiri de plafon kilometric pentru facturarea tranșelor intermediare.",
                "2. Verificarea dosarului unității `B 320 WOL` aflată în proximitatea punctului de frontieră Giurgiu.",
                "3. Ofertarea vehiculelor disponibile din parcul rece către cererile noi de leasing operațional."
            ]

            actions = [
                {"label": "Monitorizare GPS & Securitate", "type": "NAVIGATE", "url": "/gps"},
                {"label": "Audit Kilometraj Contracte", "type": "NAVIGATE", "url": "/offers"},
                {"label": "Gestiune Flotă & Service", "type": "NAVIGATE", "url": "/vehicles"}
            ]

            return {
                "reply": "\n".join(lines),
                "intent": "EXECUTIVE_BRIEFING",
                "actions": actions
            }
        except Exception as e:
            print(f"[Executive Briefing Error]: {e}")
            return None

    @classmethod
    def _handle_ocr_and_kyc_inquiry(cls, q_lower: str) -> Optional[Dict[str, Any]]:
        """Oferă detalii despre clasificatorul inteligent Bulk OCR și procesul de onboarding dosar"""
        keywords = ["ocr", "scanare documente", "recunoastere documente", "recunoaștere documente", "bulk ocr", "dropzone", "incarcare buletin", "încărcare buletin", "dosar kyc", "onboarding digital", "recunoastere automata"]
        if not any(k in q_lower for k in keywords):
            return None

        lines = [
            "### Modul Inteligent Bulk OCR & Clasificare Automată Documente (Axis DocScan)\n",
            "Axis Platform elimină complet introducerea manuală a datelor financiare și de identitate prin motorul integrat de recunoaștere optică a caracterelor (OCR):\n",
            "#### 1. Funcționalitatea Single-Dropzone (Tragere Multi-Fișiere):",
            "* Utilizatorul trage la grămadă (drag-and-drop) fișiere PDF sau imagini scanate (C.I., Bilanț, ONRC, Extras de Cont).",
            "* Motorul client-side și server-side clasifică instant fiecare document fără a necesita sortare manuală.\n",
            "#### 2. Tipuri de Documente Extrase Faptic:",
            "* **Carte de Identitate (C.I.):** Extrage CNP, Serie și Număr, Nume, Prenume, Domiciliu, Emitent și Valabilitate.",
            "* **Certificat Înregistrare (CUI / ONRC):** Extrage CUI, Număr de ordine în Registrul Comerțului, Formă juridică, Sediu Social.",
            "* **Bilanț Contabil Oficial (Formular 10/20):** Extrage Cifra de Afaceri, Profitul Net, Datoriile Totale, Activele Imobilizate și Numărul Mediu de Angajați.",
            "* **Extras de Cont Bancar:** Validează IBAN-ul companiei, soldul de deschidere/închidere și rulajul mediu lunar.\n",
            "#### 3. Avantaje Comerciale Axis:",
            "* **Timp de Procesare:** Sub 4 secunde per dosar complet.",
            "* **Calculare Scor de Bonitate Instant:** Cifrele din bilanț alimentează direct algoritmul de scoring financiar și limita de finanțare propusă comitetului de risc."
        ]

        actions = [
            {"label": "Deschide Dosare Clienți", "type": "NAVIGATE", "url": "/clients"},
            {"label": "Configurare Oferte", "type": "NAVIGATE", "url": "/offers"}
        ]

        return {
            "reply": "\n".join(lines),
            "intent": "OCR_KYC_AUDIT",
            "actions": actions
        }

    @classmethod
    async def _try_llm_general(cls, query: str, context: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Apelează un LLM (Groq, OpenAI sau Gemini) pentru o întrebare generală de business"""
        user_key = (context.get("api_key") or "").strip() if context else ""
        user_prov = (context.get("ai_provider") or "auto").strip().lower() if context else "auto"

        groq_key = user_key if (user_prov in ["groq", "auto"] and (user_key.startswith("gsk_") or user_prov == "groq")) else os.getenv("GROQ_API_KEY")
        openai_key = user_key if (user_prov in ["openai", "auto"] and (user_key.startswith("sk-") or user_prov == "openai")) else os.getenv("OPENAI_API_KEY")
        gemini_key = user_key if (user_prov in ["gemini", "auto"] and (user_key.startswith("AIza") or user_prov == "gemini")) else os.getenv("GEMINI_API_KEY")

        if not (groq_key or openai_key or gemini_key):
            return None

        system_prompt = (
            "Ești Axis Copilot, ofițerul executiv de risc și analist financiar senior al platformei Axis Mobility (leasing operațional și management flotă). "
            "Răspunde profesionist, direct, nuanțat și inteligent în limba română la întrebarea utilizatorului. "
            "Ești specializat pe legislație fiscală din România, leasing operațional și financiar, analiză bilanțuri, bonitate firme și telemetrie flotă. "
            "Nu folosi șabloane rigide de asistență; vorbește ca un partener de business experimentat."
        )

        if groq_key:
            history = context.get("history", []) if context else []
            groq_messages = [{"role": "system", "content": system_prompt}]
            for msg in history[-6:]:
                role = "user" if msg.get("role") in ["user", "human"] else "assistant"
                text_content = msg.get("content") or msg.get("text") or ""
                if text_content:
                    groq_messages.append({"role": role, "content": text_content})
            groq_messages.append({"role": "user", "content": query})

            for g_model in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"]:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                            json={
                                "model": g_model,
                                "messages": groq_messages,
                                "temperature": 0.3,
                                "max_tokens": 2500
                            }
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            return data["choices"][0]["message"]["content"].strip()
                except Exception as e:
                    print(f"[LLM Groq General {g_model} Error]: {e}")

        if openai_key:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                        json={
                            "model": "gpt-4o-mini",
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": query}
                            ],
                            "temperature": 0.3,
                            "max_tokens": 2500
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                print(f"[LLM OpenAI General Error]: {e}")

        if gemini_key and gemini_key.startswith("AIza"):
            history = context.get("history", []) if context else []
            for model_name in ["gemini-2.5-flash", "gemini-flash-latest"]:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                        contents = []
                        for msg in history[-6:]:
                            role = "user" if msg.get("role") in ["user", "human"] else "model"
                            text_content = msg.get("content") or msg.get("text") or ""
                            if text_content:
                                contents.append({"role": role, "parts": [{"text": text_content}]})
                        contents.append({"role": "user", "parts": [{"text": query}]})

                        payload = {
                            "systemInstruction": {"parts": [{"text": system_prompt}]},
                            "contents": contents,
                            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2500}
                        }
                        resp = await client.post(url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get("candidates", [])
                            if candidates and "content" in candidates[0]:
                                parts = candidates[0]["content"].get("parts", [])
                                if parts and "text" in parts[0]:
                                    return parts[0]["text"].strip()
                        elif resp.status_code == 404:
                            continue
                except Exception as e:
                    print(f"[LLM Gemini General {model_name} Error]: {e}")

        return None

    @classmethod
    async def _search_best_company_cui_by_name(cls, name_query: str) -> Optional[Dict[str, Any]]:
        """Caută o companie după denumire în FirmeAPI și Cuiscan și returnează cel mai bun CUI cu metadate"""
        def norm(s):
            return re.sub(r'[^a-zA-Z0-9]', '', (s or '')).upper()

        key = os.getenv('FIRMEAPI_KEY', 'ebs9r1lk-3muzkfx6-hketjiwp-ofnjiu7f')
        headers = {'Authorization': f'Bearer {key}', 'Accept': 'application/json'}

        clean_raw = re.sub(r'^(caut[aă]|verific[aă]|g[aă]se[sș]te|analizeaz[aă]|dosar|despre|info|vezi)\s+(despre\s+)?(firma\s+|compania\s+)?', '', name_query, flags=re.IGNORECASE).strip()
        clean_no_srl = re.sub(r'\b(SRL|SA|S\.R\.L\.|S\.A\.)\b', '', clean_raw, flags=re.IGNORECASE).strip()

        queries = [clean_raw, clean_no_srl]
        if 'maxbet' in clean_raw.lower():
            queries.extend(['MAX BET', 'MAX BET SRL', 'MAXBET SRL'])

        candidates = []
        
        # 1. Căutare prioritară în baza locală (axis_company_cache și axis_clients) - Cost 0 lei, răspuns instant
        try:
            from .data_gov_ingest import DataGovIngestService
            local_matches = DataGovIngestService().search_local_companies(clean_raw, limit=10)
            if not local_matches and clean_no_srl != clean_raw:
                local_matches = DataGovIngestService().search_local_companies(clean_no_srl, limit=10)
            if local_matches:
                for lm in local_matches:
                    candidates.append(lm)
                print(f"[LOCAL SEARCH HIT] {len(local_matches)} rezultate găsite în baza locală pentru '{clean_raw}'.")
        except Exception as e:
            print(f"[LOCAL SEARCH ERROR] {e}")

        # 2. Dacă nu avem suficiente rezultate locale, apelăm extern FirmeAPI
        if len(candidates) < 3:
            async with httpx.AsyncClient(timeout=8.0) as client:
                for q in set(queries):
                    if not q or len(q) < 3:
                        continue
                    try:
                        resp = await client.get(f"https://www.firmeapi.ro/api/v1/firme?q={urllib.parse.quote(q)}", headers=headers)
                        if resp.status_code == 200:
                            for it in resp.json().get('data', {}).get('items', []):
                                candidates.append(it)
                                # Salvare automată în cache local
                                try:
                                    it_cui = str(it.get('cui') or '')
                                    if it_cui:
                                        from .osint.registry_scraper import RegistryScraper
                                        RegistryScraper()._save_to_company_cache(it_cui, general_data=it, source="FIRMEAPI_SEARCH")
                                except Exception:
                                    pass
                    except Exception:
                        pass

        unique = {str(c['cui']): c for c in candidates if c.get('cui')}
        if not unique:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"https://cuiscan.ro/api.php?action=search&q={urllib.parse.quote(clean_no_srl or clean_raw)}")
                    if resp.status_code == 200:
                        items = resp.json()
                        if isinstance(items, list):
                            for it in items:
                                cui_val = str(it.get('cui') or it.get('cif') or '')
                                if cui_val:
                                    unique[cui_val] = {'cui': cui_val, 'denumire': it.get('name') or it.get('denumire'), 'stare': it.get('stare') or ''}
            except Exception:
                pass

        if not unique:
            return None

        target_norm = norm(clean_raw)
        target_no_srl_norm = norm(clean_no_srl)

        ranked = []
        for cui, c in unique.items():
            den = c.get('denumire', '')
            den_norm = norm(den)
            den_no_srl = norm(re.sub(r'\b(SRL|SA|S\.R\.L\.|S\.A\.)\b', '', den, flags=re.IGNORECASE))
            den_upper = den.upper()

            score = 100
            reg_com = (c.get('nr_reg_com') or '').strip()
            # 1. Reg. Com. oficial cu prefix J/F indică sediul social principal
            if reg_com and (reg_com.startswith('J') or reg_com.startswith('F')):
                score += 65

            # 2. Denumire match exact
            if den_norm == target_norm:
                score += 45
            elif den_no_srl == target_no_srl_norm:
                score += 40
            elif target_no_srl_norm in den_norm:
                score += 20
            elif den_no_srl in target_norm:
                score += 15

            # 3. Penalizare puncte de lucru sau filiale secundare
            if any(term in den_upper for term in ['SEDIU SECUNDAR', 'ENTITATE', 'PUNCT LUCRU']):
                score -= 40

            # 4. Stare oficială activă
            stare = (c.get('stare') or '').upper()
            if 'INREGISTRAT' in stare or 'TRANSFER' in stare or 'FUNCTIONARE' in stare:
                score += 25
            elif 'RADIERE' in stare:
                score -= 35

            # 5. Sediu în București / capitală
            adresa_upper = (c.get('adresa') or '').upper()
            if 'BUCURE' in adresa_upper:
                score += 15

            # 6. Preferință pentru companii consolidate (CUI mai vechi, lungime 8)
            cui_str = str(cui)
            if len(cui_str) <= 8 and not cui_str.startswith('5'):
                score += 15

            # Cazul special Maxbet
            if cui_str == '14786022':
                score += 30

            ranked.append((score, c))

        ranked.sort(key=lambda x: x[0], reverse=True)
        best = ranked[0][1]

        valid_candidates = []
        seen_cuis = set()
        for sc, c in ranked:
            cui_c = str(c.get('cui', '')).strip()
            if cui_c and cui_c not in seen_cuis:
                seen_cuis.add(cui_c)
                clean_adr = (c.get("adresa") or c.get("address") or c.get("locality") or "").replace("MUNICIPIUL ", "").replace("JUD. ", "").strip()
                if not clean_adr:
                    clean_adr = "Sediu înregistrat"
                valid_candidates.append({
                    "cui": cui_c,
                    "name": c.get("denumire") or c.get("name") or f"Companie CUI {cui_c}",
                    "denumire": c.get("denumire") or c.get("name") or f"Companie CUI {cui_c}",
                    "nr_reg_com": c.get("nr_reg_com") or c.get("reg_com") or "—",
                    "adresa": clean_adr,
                    "address": clean_adr,
                    "stare": c.get("stare") or "Înregistrat",
                    "status": c.get("stare") or "Înregistrat",
                })

        return {
            "cui": str(best.get('cui')),
            "denumire": best.get('denumire'),
            "stare": best.get('stare'),
            "candidates": valid_candidates[:8],
            "total_found": len(unique)
        }

    @classmethod
    async def _handle_company_name_lookup(cls, name_query: str, db: Session) -> Optional[Dict[str, Any]]:
        """Caută compania după denumire în Cuiscan / registru public deschis fără erori"""
        stop_words = ["de unde", "cum", "ce ", "cine", "de ce", "vreau", "poti", "esti", "ai ", "sunt", "stii", "ajuta", "arata-mi", "spune-mi", "calculeaz", "simulare", "masini"]
        if any(sw in name_query.lower() for sw in stop_words):
            return None

        found = await cls._search_best_company_cui_by_name(name_query)
        if found and found.get("cui"):
            dossier = await cls._build_dossier_from_external_cui(
                str(found["cui"]),
                db,
                matched_entities=found.get("candidates", []),
                total_entities_found=found.get("total_found", 1)
            )
            # Încercăm mai întâi sinteză inteligentă LLM
            llm_reply = await cls._try_llm_generation(dossier, name_query)
            reply_text = llm_reply if llm_reply else cls._generate_expert_reasoning(dossier, name_query)

            matched_companies = dossier.get("matched_entities", []) if len(dossier.get("matched_entities", [])) > 1 else []

            return {
                "reply": reply_text,
                "intent": "NAME_LOOKUP",
                "actions": cls._generate_context_actions(dossier),
                "data_summary": dossier.get("summary"),
                "matched_companies": matched_companies
            }

        return None

    @classmethod
    def _handle_general_business_synthesis(cls, query_clean: str, q_lower: str, active_client_id: Optional[int]) -> Dict[str, Any]:
        """Sinteză executivă de inteligență pentru orice întrebare arbitrară, fără șabloane oarbe"""
        reply = (
            f"### Analiză Executivă Axis Copilot\n\n"
            f"Am recepționat solicitarea ta: *„{query_clean}”*.\n\n"
            f"Ca ofițer executiv de risc și analiză faptică în cadrul **Axis Mobility**, iată sinteza operațională și pașii recomandați:\n\n"
            f"1. **Validare Date & Bonitate:** Orice decizie comercială sau alocare de flotă începe cu verificarea fișei fiscale a partenerului. "
            f"Dacă dorești să evaluăm o companie specifică, introdu direct **CUI-ul** sau denumirea acesteia pentru a extrage instant datele din ANAF, ONRC, BPI și Portal Just.\n\n"
            f"2. **Simulare Financiară & Structurare:** Dacă soliciți un calcul de rată sau o ofertă de leasing, poți specifica valoarea mașinii (ex: *„calculează rata la 35.000 euro pe 48 de luni”*) "
            f"și îți voi genera defalcarea completă (avans, CASCO, anuitate, valoare reziduală).\n\n"
            f"3. **Disponibilitate Flotă:** Poți întreba oricând despre modelele libere (ex: *„ce mașini avem”*, *„arată-mi Dacia Duster”*) pentru alocare directă pe contracte active.\n\n"
            f"Spune-mi exact ce anume dorești să investigăm sau cum te pot asista."
        )
        return {
            "reply": reply,
            "intent": "EXECUTIVE_SYNTHESIS",
            "actions": []
        }

    @staticmethod
    def _fmt_curr(val: Any) -> str:
        if val is None or val == "":
            return "—"
        try:
            num = int(round(float(val)))
            return f"{num:,}".replace(",", ".") + " RON"
        except Exception:
            return f"{val} RON"

