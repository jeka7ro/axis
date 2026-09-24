import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime
from ..services.mof_pdf_generator import generate_mof_pdf

from ..database import get_db
from ..models.client import Client, Evaluation, ClientType, RiskLevel
from ..models.user import User
from ..schemas.client import ClientCreate, ClientResponse, ClientDetailResponse, EvaluationResponse
from ..services.ai_engine import AIEngineService

router = APIRouter(prefix="/api/clients", tags=["Clients"])

# --- AUTH BYPASS FOR LOCAL DEV & RESILIENCE ---
def mock_get_current_user(db: Session = Depends(get_db)):
    try:
        user = db.query(User).first()
        if not user:
            from ..models.user import RoleEnum
            user = User(
                email="admin@axis.ro",
                hashed_password="mock",
                full_name="Eugeniu Cazmal",
                role=RoleEnum.super_admin,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except Exception:
        class FallbackUser:
            id = None
            full_name = "Eugeniu Cazmal"
            email = "admin@axis.ro"
        return FallbackUser()
# -----------------------------------------------------------------------------

@router.post("/", response_model=ClientResponse)
@router.post("", response_model=ClientResponse)
def create_client(client: ClientCreate, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    # Check if CUI already exists
    db_client = db.query(Client).filter(Client.cui_cnp == client.cui_cnp).first()
    if db_client:
        raise HTTPException(status_code=400, detail="Client with this CUI/CNP already exists")
    
    new_client = Client(**client.model_dump())
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(client_id: int, client: ClientCreate, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    db_client = db.query(Client).filter(Client.id == client_id).first()
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)
        
    db.commit()
    db.refresh(db_client)
    return db_client

@router.get("/", response_model=List[ClientResponse])
@router.get("", response_model=List[ClientResponse])
def get_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    clients = db.query(Client).order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    
    # Attach latest score dynamically for the response
    for client in clients:
        latest_eval = db.query(Evaluation).filter(Evaluation.client_id == client.id).order_by(Evaluation.created_at.desc()).first()
        if latest_eval:
            setattr(client, "latest_score", latest_eval.score)
            setattr(client, "latest_risk_level", latest_eval.risk_level)
            
    return clients

@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    return {"message": "Client deleted successfully"}

class BlacklistRequest(BaseModel):
    reason: Optional[str] = "Risc major identificat"
    severity: Optional[str] = "Critic"

@router.post("/{client_id}/blacklist", response_model=ClientResponse)
def add_to_blacklist(client_id: int, payload: BlacklistRequest, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.is_blacklisted = True
    client.blacklist_reason = payload.reason or "Risc major identificat"
    client.blacklist_severity = payload.severity or "Critic"
    client.blacklist_added_at = datetime.utcnow()
    db.commit()
    db.refresh(client)
    
    # Dynamic latest score
    latest_eval = db.query(Evaluation).filter(Evaluation.client_id == client.id).order_by(Evaluation.created_at.desc()).first()
    if latest_eval:
        setattr(client, "latest_score", latest_eval.score)
        setattr(client, "latest_risk_level", latest_eval.risk_level)
    return client

@router.post("/{client_id}/unblacklist", response_model=ClientResponse)
def remove_from_blacklist(client_id: int, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.is_blacklisted = False
    client.blacklist_reason = None
    client.blacklist_severity = None
    client.blacklist_added_at = None
    db.commit()
    db.refresh(client)
    
    # Dynamic latest score
    latest_eval = db.query(Evaluation).filter(Evaluation.client_id == client.id).order_by(Evaluation.created_at.desc()).first()
    if latest_eval:
        setattr(client, "latest_score", latest_eval.score)
        setattr(client, "latest_risk_level", latest_eval.risk_level)
    return client

@router.get("/blacklist/all", response_model=List[ClientResponse])
def get_all_blacklisted(db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    clients = db.query(Client).filter(Client.is_blacklisted == True).order_by(Client.created_at.desc()).all()
    for client in clients:
        latest_eval = db.query(Evaluation).filter(Evaluation.client_id == client.id).order_by(Evaluation.created_at.desc()).first()
        if latest_eval:
            setattr(client, "latest_score", latest_eval.score)
            setattr(client, "latest_risk_level", latest_eval.risk_level)
    return clients

from ..services.osint.anaf_scraper import AnafScraper
from ..services.osint.registry_scraper import RegistryScraper
from ..services.osint.cross_checker import CrossChecker

@router.get("/lookup/{cui}")
async def lookup_client_by_cui(cui: str, current_user = Depends(mock_get_current_user)):
    """Fetches official company data from ANAF v9 for smart auto-fill in the UI"""
    scraper = AnafScraper()
    data = await scraper.fetch_company_data(cui)
    return {
        "name": data.get("nume", ""),
        "address": data.get("adresa", ""),
        "reg_com": data.get("reg_com", ""),
        "phone": data.get("telefon", "") if data.get("telefon") != "Nespecificat" else "",
        "caen": data.get("cod_caen", ""),
        "caen_descriere": data.get("caen_descriere", ""),
        "caen_sectiune": data.get("caen_sectiune", ""),
        "tva_activ": data.get("tva_activ", False),
        "inactiv_fiscal": data.get("inactiv_fiscal", False),
        "status": data.get("status", "Activa")
    }

import asyncio
from ..services.osint.court_scraper import CourtScraper
from ..services.osint.cross_checker import CrossChecker

@router.get("/admin-network")
async def get_administrator_network(name: str, context_cui: Optional[str] = None):
    """Reverse lookup pentru administrator / asociat: găsește toate firmele deținute/administrate (filtrat inteligent după CUI pentru eliminare omonimi)"""
    if not name or len(name.strip()) < 2:
        return []
    scraper = RegistryScraper()
    return await scraper.fetch_administrator_network(name.strip(), match_cui=context_cui)

@router.get("/portal-just")
async def get_portal_just_cases(query: str, limit: int = 25):
    """Interoghează dosarele în instanță în timp real de pe Portal Just.ro (pentru firme sau persoane)"""
    if not query or len(query.strip()) < 3:
        return []
    scraper = CourtScraper()
    return await scraper.search_court_cases(query.strip(), limit=limit)

@router.get("/company-full-intel")
async def get_company_full_intel(cui: str, name: str = "", force_refresh: bool = False, db: Session = Depends(get_db)):
    """
    Super-Smart Full Intelligence:
    Verifică întâi dacă firma și datele OSINT există deja în baza locală de date Axis (0 credite consumate).
    Doar dacă firma nu există sau dacă force_refresh=True, interoghează sursele externe API (FirmeAPI, Just.ro),
    și SALVEAZĂ automat firma și evaluarea în baza noastră de date pentru viitor.
    """
    clean_cui = "".join(filter(str.isdigit, str(cui)))
    if not clean_cui:
        raise HTTPException(status_code=400, detail="CUI invalid")

    reg_scraper = RegistryScraper()
    court_scraper = CourtScraper()
    cross_checker = CrossChecker()
    search_name = name.strip() or f"CUI {clean_cui}"

    # 1. Verificare DB Cache Axis (Dacă nu este forțată o re-interogare cu credite)
    existing_client = db.query(Client).filter(Client.cui_cnp == clean_cui).first()
    existing_client_id = existing_client.id if existing_client else None
    
    if existing_client and not force_refresh:
        prev_eval = db.query(Evaluation).filter(Evaluation.client_id == existing_client.id).order_by(Evaluation.created_at.desc()).first()
        if prev_eval and prev_eval.raw_financial_data:
            try:
                prev_d = json.loads(prev_eval.raw_financial_data) if isinstance(prev_eval.raw_financial_data, str) else prev_eval.raw_financial_data
                if prev_d and (prev_d.get("personnel") or prev_d.get("holdings")):
                    print(f"[DB CACHE HIT - 0 CREDITE] Full Intel pentru CUI {clean_cui} ({existing_client.name}) extras din baza locală Axis.")
                    smart_ownership = prev_d.get("smart_ownership") or cross_checker.analyze_ownership_structure(
                        prev_d.get("personnel") or prev_d.get("holdings") or [],
                        prev_d.get("admin_networks") or []
                    )
                    return {
                        "cui": clean_cui,
                        "denumire": existing_client.name,
                        "existing_client_id": existing_client.id,
                        "general": prev_d.get("anaf", {}),
                        "personnel": prev_d.get("personnel", []),
                        "holdings": prev_d.get("holdings", []),
                        "administrators": prev_d.get("administrators", []),
                        "admin_networks": prev_d.get("admin_networks", []),
                        "caen_activities": prev_d.get("caen_activities", {}),
                        "smart_ownership": smart_ownership,
                        "balance": prev_d.get("balance", {}),
                        "bpi": prev_d.get("bpi", {}),
                        "mof": prev_d.get("mof", []),
                        "court_cases": prev_d.get("court_cases", []),
                        "total_dosare": len(prev_d.get("court_cases", [])),
                        "cached": True,
                        "credits_used": 0
                    }
            except Exception:
                pass

    # 2. Interogare externă API (Consumă 1 credit API)
    print(f"[API EXTERNAL CALL] Interogare surse externe pentru CUI {clean_cui} (force_refresh={force_refresh})")
    t_gen = reg_scraper.fetch_company_general(clean_cui)
    t_pers = reg_scraper.fetch_company_personnel(clean_cui)
    t_bal = reg_scraper.fetch_company_balance(clean_cui)
    t_bpi = reg_scraper.fetch_company_bpi(clean_cui)
    t_mof = reg_scraper.fetch_company_mof(clean_cui)
    t_hold = reg_scraper.fetch_company_holdings(clean_cui)
    t_adm = reg_scraper.fetch_company_administrators(clean_cui)
    t_caen = reg_scraper.fetch_company_caen(clean_cui)
    
    gen_data, personnel, balance, bpi, mof, holdings, administrators, caen_act = await asyncio.gather(
        t_gen, t_pers, t_bal, t_bpi, t_mof, t_hold, t_adm, t_caen
    )

    official_name = gen_data.get("denumire") or search_name
    
    # Interogare dosare just.ro
    court_cases = await court_scraper.search_court_cases(official_name, limit=20)
    if not court_cases and search_name != official_name:
        court_cases = await court_scraper.search_court_cases(search_name, limit=20)

    # Reverse Lookup Administrator Network ("Caracatița" companii conectate)
    admin_networks = []
    checked_names = set()
    all_people = list(personnel) + list(administrators) + [{"nume": h.get("name")} for h in holdings if h.get("name")]
    for p in all_people:
        p_name = (p.get("nume") or p.get("name") or "").strip()
        if p_name and p_name.upper() not in checked_names:
            checked_names.add(p_name.upper())
            net = await reg_scraper.fetch_administrator_network(p_name, match_cui=clean_cui)
            if net:
                admin_networks.extend(net)

    if not admin_networks and existing_client:
        prev_eval = db.query(Evaluation).filter(Evaluation.client_id == existing_client.id).order_by(Evaluation.created_at.desc()).first()
        if prev_eval and prev_eval.raw_financial_data:
            try:
                prev_d = json.loads(prev_eval.raw_financial_data) if isinstance(prev_eval.raw_financial_data, str) else prev_eval.raw_financial_data
                admin_networks = prev_d.get("admin_networks", []) or []
            except Exception:
                pass

    smart_ownership = cross_checker.analyze_ownership_structure(personnel, admin_networks)

    # 3. AUTO-SALVARE în baza locală de date Axis pentru a nu mai consuma credite în viitor!
    try:
        if not existing_client:
            new_client = Client(
                name=official_name,
                cui_cnp=clean_cui,
                type=ClientType.PJ,
                address=gen_data.get("adresa") or "",
                phone=gen_data.get("telefon") or None
            )
            db.add(new_client)
            db.commit()
            db.refresh(new_client)
            existing_client = new_client
            existing_client_id = new_client.id

        saved_intel_payload = {
            "anaf": gen_data,
            "personnel": personnel,
            "holdings": holdings,
            "administrators": administrators,
            "admin_networks": admin_networks,
            "caen_activities": caen_act,
            "smart_ownership": smart_ownership,
            "balance": balance,
            "bpi": bpi,
            "mof": mof,
            "court_cases": court_cases
        }
        
        # Salvare snapshot evaluare asociat în DB
        new_eval = Evaluation(
            client_id=existing_client.id,
            score=85,
            risk_level=RiskLevel.low,
            ai_summary=f"Snapshot inteligență OSINT stocat local pentru {official_name}",
            raw_financial_data=json.dumps(saved_intel_payload, default=str)
        )
        db.add(new_eval)
        db.commit()
        print(f"[DB PROPRIETARY BASE] CUI {clean_cui} ({official_name}) salvat permanent în baza Axis.")
    except Exception as save_err:
        print(f"[DB SAVE WARNING] Nu s-a putut salva snapshot-ul pentru CUI {clean_cui}: {save_err}")

    return {
        "cui": clean_cui,
        "denumire": official_name,
        "existing_client_id": existing_client_id,
        "general": gen_data,
        "personnel": personnel,
        "holdings": holdings,
        "administrators": administrators,
        "admin_networks": admin_networks,
        "caen_activities": caen_act,
        "smart_ownership": smart_ownership,
        "balance": balance,
        "bpi": bpi,
        "mof": mof,
        "court_cases": court_cases,
        "total_dosare": len(court_cases),
        "cached": False,
        "credits_used": 1
    }

@router.get("/person-full-intel")
async def get_person_full_intel(name: str, context_cui: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Super-Smart Person Intelligence:
    Rețeaua completă de companii ("Caracatița") + dosare personale pe Portal Just.ro.
    """
    clean_name = name.strip()
    if not clean_name or len(clean_name) < 3:
        raise HTTPException(status_code=400, detail="Nume invalid")

    reg_scraper = RegistryScraper()
    court_scraper = CourtScraper()

    clean_cui = "".join(filter(str.isdigit, str(context_cui or "")))

    t_network = reg_scraper.fetch_administrator_network(clean_name, match_cui=clean_cui)
    t_cases = court_scraper.search_court_cases(clean_name, limit=20)

    network, court_cases = await asyncio.gather(t_network, t_cases)

    # 1. Asigurăm o structură de rețea dacă e goală
    if not network:
        network = [{
            "nume": clean_name,
            "varsta": None,
            "loc_nastere": "",
            "total_firme": 0,
            "firme_active": 0,
            "firme_incetate": 0,
            "firme": []
        }]

    existing_cuis = set()
    for p in network:
        for f in p.get("firme", []):
            existing_cuis.add("".join(filter(str.isdigit, str(f.get("cui", "")))))

    # 2. Asigurăm garantat compania din contextul curent (ex: dosarul firmei din care s-a deschis modalul)
    if clean_cui and clean_cui not in existing_cuis:
        comp_name = None
        db_client = db.query(Client).filter(Client.cui_cnp.like(f"%{clean_cui}%")).first()
        if db_client and db_client.name:
            comp_name = db_client.name
        else:
            comp_data = await reg_scraper.fetch_company_general(clean_cui)
            comp_name = comp_data.get("denumire") or comp_data.get("nume")

        if not comp_name:
            comp_name = f"Compania CUI {clean_cui}"

        network[0]["firme"].insert(0, {
            "cui": clean_cui,
            "denumire": comp_name,
            "rol": "ADMINISTRATOR",
            "calitate": "Administrator",
            "curent": True,
            "stare": "Activ",
            "sursa": "Registrul Comerțului (Dosar Curent)"
        })
        existing_cuis.add(clean_cui)

    # 3. Calcul metrici de risc administrator
    all_firme = []
    for p in network:
        p["total_firme"] = len(p.get("firme", []))
        p["firme_active"] = sum(1 for f in p.get("firme", []) if f.get("curent", True))
        p["firme_incetate"] = p["total_firme"] - p["firme_active"]
        for f in p.get("firme", []):
            all_firme.append(f)

    total_firme = len(all_firme)
    firme_active = sum(1 for f in all_firme if f.get("curent", True))
    firme_radiate = total_firme - firme_active

    return {
        "nume": clean_name,
        "network": network,
        "total_firme": total_firme,
        "firme_active": firme_active,
        "firme_radiate": firme_radiate,
        "court_cases": court_cases,
        "total_dosare": len(court_cases),
        "api_credits_exhausted": getattr(reg_scraper, "last_search_credits_exhausted", False)
    }

@router.get("/{client_id}", response_model=ClientDetailResponse)
def get_client(client_id: int, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

from ..services.osint.address_checker import AddressChecker

@router.get("/{client_id}/verify-address")
async def verify_client_address(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    checker = AddressChecker()
    return await checker.verify_address(client.address, client.cui_cnp)

@router.post("/{client_id}/evaluate")
@router.post("/{client_id}/evaluate/")
async def evaluate_client(client_id: int, force_refresh: bool = False, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    import traceback
    from fastapi.responses import JSONResponse
    try:
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        # 0. Verificare CACHE local Axis dacă nu se cere expres re-verificare externă cu credite
        if not force_refresh:
            existing_eval = (
                db.query(Evaluation)
                .filter(Evaluation.client_id == client.id)
                .order_by(Evaluation.created_at.desc())
                .first()
            )
            if existing_eval and existing_eval.raw_financial_data:
                print(f"[DB CACHE HIT - 0 CREDITE] Evaluare existentă pentru clientul {client.name} (CUI {client.cui_cnp}) preluată direct din baza Axis.")
                risk_str = existing_eval.risk_level.value if hasattr(existing_eval.risk_level, 'value') else str(existing_eval.risk_level)
                return JSONResponse(content={
                    "id": existing_eval.id,
                    "client_id": existing_eval.client_id,
                    "score": existing_eval.score,
                    "risk_level": risk_str,
                    "ai_summary": existing_eval.ai_summary,
                    "raw_financial_data": existing_eval.raw_financial_data,
                    "created_at": existing_eval.created_at.isoformat() if existing_eval.created_at else None,
                    "created_by_user_id": existing_eval.created_by_user_id,
                    "cached": True,
                    "credits_used": 0
                })
            
        # 1. OSINT Data Collection (Caracatița & Sediu) — Apel surse externe (Consumă credit)
        print(f"[API EXTERNAL CALL] Re-evaluare completă declanșată pentru Client {client_id} ({client.name}) — Consum credit API...")
        osint_data = {}
        
        if client.type == ClientType.PJ:
            anaf_scraper = AnafScraper()
            registry_scraper = RegistryScraper()
            cross_checker = CrossChecker()
            address_checker = AddressChecker()
            
            print(f"[EVALUATE] Client {client_id} ({client.name}) — Starting OSINT pipeline...")
            
            anaf_data = await anaf_scraper.fetch_company_data(client.cui_cnp)
            print(f"[EVALUATE] ANAF OK: {anaf_data.get('nume', '?')}")
            
            personnel_data = await registry_scraper.fetch_company_personnel(client.cui_cnp)
            balance_data = await registry_scraper.fetch_company_balance(client.cui_cnp)
            bpi_data = await registry_scraper.fetch_company_bpi(client.cui_cnp)
            mof_data = await registry_scraper.fetch_company_mof(client.cui_cnp)
            holdings_data = await registry_scraper.fetch_company_holdings(client.cui_cnp)
            admins_data = await registry_scraper.fetch_company_administrators(client.cui_cnp)
            caen_data = await registry_scraper.fetch_company_caen(client.cui_cnp)
            print(f"[EVALUATE] FirmeAPI OK: personnel={len(personnel_data)}, admins={len(admins_data)}")
            
            # Reverse Lookup Administrator Network ("Caracatița" extinsă)
            admin_networks = []
            checked_names = set()
            
            for p in personnel_data:
                admin_name = p.get("nume", "").strip()
                loc_nastere = p.get("loc_nastere", "").strip()
                if admin_name and admin_name.upper() not in checked_names:
                    checked_names.add(admin_name.upper())
                    try:
                        net = await registry_scraper.fetch_administrator_network(
                            admin_name, 
                            match_cui=client.cui_cnp,
                            match_loc=loc_nastere
                        )
                        if net:
                            admin_networks.extend(net)
                    except Exception as net_err:
                        print(f"[EVALUATE] Admin network error for {admin_name}: {net_err}")
                        
            if client.representative_name and client.representative_name.strip().upper() not in checked_names:
                rep_name = client.representative_name.strip()
                checked_names.add(rep_name.upper())
                try:
                    net = await registry_scraper.fetch_administrator_network(
                        rep_name, 
                        match_cui=client.cui_cnp
                    )
                    if net:
                        admin_networks.extend(net)
                except Exception as net_err:
                    print(f"[EVALUATE] Rep network error for {rep_name}: {net_err}")

            # Fallback de siguranță
            if not admin_networks:
                prev_eval = db.query(Evaluation).filter(Evaluation.client_id == client.id).order_by(Evaluation.created_at.desc()).first()
                if prev_eval and prev_eval.raw_financial_data:
                    try:
                        prev_d = json.loads(prev_eval.raw_financial_data) if isinstance(prev_eval.raw_financial_data, str) else prev_eval.raw_financial_data
                        admin_networks = prev_d.get("admin_networks", []) or []
                    except Exception:
                        pass

            target_addr = client.address or anaf_data.get("adresa", "")
            if not client.address and target_addr:
                client.address = target_addr
                db.commit()
                
            address_data = await address_checker.verify_address(target_addr, client.cui_cnp)
            print(f"[EVALUATE] Address OK: coords={bool(address_data.get('coordinates'))}, photos={len(address_data.get('photos', []))}")
            
            # 2. Cross Check
            osint_data = cross_checker.evaluate_risk(
                anaf_data,
                personnel_data,
                balance_data,
                address_data,
                bpi_data,
                mof_data,
                admin_networks,
                holdings_data=holdings_data,
                administrators_data=admins_data,
                caen_data=caen_data
            )
            print(f"[EVALUATE] Cross-check OK: score={osint_data.get('osint_score')}")
        else:
            osint_data = {
                "osint_score": 85,
                "osint_flags": ["Evaluare standard Persoană Fizică"],
                "details": "Nu se aplică verificări ANAF / Bilanț pentru Persoane Fizice."
            }
            
        # 3. Call AI Engine
        ai_result = AIEngineService.evaluate_client(name=client.name, osint_data=osint_data)
        print(f"[EVALUATE] AI Engine OK: score={ai_result['score']}, risk={ai_result['risk_level']}")
        
        # 4. Save evaluation — convert enum to string value for safe Postgres storage
        risk_val = ai_result["risk_level"]
        
        user_id = getattr(current_user, "id", None) if current_user else None
        if user_id:
            existing_user = db.query(User).filter(User.id == user_id).first()
            if not existing_user:
                user_id = None

        new_evaluation = Evaluation(
            client_id=client.id,
            score=ai_result["score"],
            risk_level=risk_val,
            ai_summary=ai_result["ai_summary"],
            raw_financial_data=ai_result["raw_financial_data"],
            created_by_user_id=user_id
        )
        
        db.add(new_evaluation)
        db.commit()
        db.refresh(new_evaluation)
        
        print(f"[EVALUATE] SAVED evaluation #{new_evaluation.id} for client {client_id}")
        
        # Return JSONResponse directly — bypasses response_model serialization which can crash and bypass CORS
        risk_str = new_evaluation.risk_level.value if hasattr(new_evaluation.risk_level, 'value') else str(new_evaluation.risk_level)
        return JSONResponse(content={
            "id": new_evaluation.id,
            "client_id": new_evaluation.client_id,
            "score": new_evaluation.score,
            "risk_level": risk_str,
            "ai_summary": new_evaluation.ai_summary,
            "raw_financial_data": new_evaluation.raw_financial_data,
            "created_at": new_evaluation.created_at.isoformat() if new_evaluation.created_at else None,
            "created_by_user_id": new_evaluation.created_by_user_id,
            "cached": False,
            "credits_used": 1
        })
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        print(f"[EVALUATE ERROR] Client {client_id}: {type(e).__name__}: {e}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": f"Evaluation failed: {type(e).__name__}: {str(e)}", "error": True}
        )

@router.post("/evaluate-by-cui/{cui}")
@router.post("/evaluate-by-cui/{cui}/")
async def evaluate_company_by_cui(cui: str, force_refresh: bool = False, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    """
    Evaluează orice companie după CUI.
    Dacă există deja în baza de date și nu se cere force_refresh, returnează datele din cache local (0 credite consumate).
    Dacă nu există, preia datele oficiale ANAF/FirmeAPI, o creează și o salvează automat în baza Axis.
    """
    cui_clean = str(cui).strip().upper().replace("RO", "").strip()
    
    # 1. Căutare client existent în DB
    client = db.query(Client).filter(Client.cui_cnp == cui_clean).first()
    if client and not force_refresh:
        existing_eval = db.query(Evaluation).filter(Evaluation.client_id == client.id).order_by(Evaluation.created_at.desc()).first()
        if existing_eval and existing_eval.raw_financial_data:
            print(f"[DB CACHE HIT - 0 CREDITE] evaluate_company_by_cui pentru {client.name} ({cui_clean}) returnat din baza Axis.")
            risk_str = existing_eval.risk_level.value if hasattr(existing_eval.risk_level, 'value') else str(existing_eval.risk_level)
            return {
                "client_id": client.id,
                "name": client.name,
                "cui": client.cui_cnp,
                "score": existing_eval.score,
                "risk_level": risk_str,
                "cached": True,
                "credits_used": 0
            }
            
    if not client:
        anaf_scraper = AnafScraper()
        anaf_data = await anaf_scraper.fetch_company_data(cui_clean)
        name = anaf_data.get("nume") or f"COMPANIE CUI {cui_clean}"
        addr = anaf_data.get("adresa") or ""
        
        client = Client(
            name=name,
            cui_cnp=cui_clean,
            type=ClientType.PJ,
            address=addr
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        
    # 2. Rulare pipeline evaluare cu force_refresh=True pentru a forța interogarea dacă s-a cerut expres
    new_eval_resp = await evaluate_client(client.id, force_refresh=True, db=db, current_user=current_user)
    import json
    data = json.loads(new_eval_resp.body.decode('utf-8'))
    return {
        "client_id": client.id,
        "name": client.name,
        "cui": client.cui_cnp,
        "score": data.get("score"),
        "risk_level": data.get("risk_level"),
        "cached": False,
        "credits_used": 1
    }

class MofPdfRequest(BaseModel):
    publicatieNr: Optional[str] = ""
    data: Optional[str] = ""
    denumire: Optional[str] = ""
    titlu_publicatie: Optional[str] = ""
    continut: Optional[str] = ""

@router.post("/mof/pdf")
async def download_mof_pdf(payload: MofPdfRequest):
    """
    Generează și livrează fișierul PDF oficial pentru o publicație din Monitorul Oficial.
    """
    pdf_bytes = generate_mof_pdf(
        publicatie_nr=payload.publicatieNr,
        data_pub=payload.data,
        denumire=payload.denumire,
        titlu=payload.titlu_publicatie,
        continut=payload.continut
    )
    safe_filename = f"Monitorul_Oficial_{payload.publicatieNr or 'act'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"'
        }
    )

@router.get("/{client_id}/fleet-telemetry-report")
def get_client_fleet_telemetry_report(client_id: int, db: Session = Depends(get_db)):
    """
    Raport Comportament Flotă GPS & Telemetrie pentru clienți existenți la cereri noi de ofertă (Cerința 7 Alin).
    Analizează parcul auto alocat, alertele GPS istorice, riscul de frontieră și corelarea cu riscul financiar.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Clientul nu a fost găsit.")

    from ..models.offer import Offer, OfferStatus
    from ..models.gps import GPSAlert, GPSData
    from ..models.vehicle import Vehicle

    # Find client's offers / contracts
    client_offers = db.query(Offer).filter(Offer.client_id == client_id).all()
    vehicle_ids = [o.vehicle_id for o in client_offers if o.vehicle_id]
    
    vehicles = db.query(Vehicle).filter(Vehicle.id.in_(vehicle_ids)).all() if vehicle_ids else []
    plates = [v.license_plate for v in vehicles]

    # Query GPS alerts for these plates or client_id
    alerts = []
    if plates:
        alerts = db.query(GPSAlert).filter((GPSAlert.vehicle_plate.in_(plates)) | (GPSAlert.client_id == client_id)).all()
    else:
        alerts = db.query(GPSAlert).filter(GPSAlert.client_id == client_id).all()

    lt_count = sum(1 for v in vehicles if getattr(v, 'fleet_type', 'LT') == 'LT')
    st_count = sum(1 for v in vehicles if getattr(v, 'fleet_type', 'LT') == 'ST')

    unauth_border_crossings = sum(1 for a in alerts if a.alert_type in ["UNAUTHORIZED_EXIT", "DEBT_BORDER_RISK"])
    colocation_alerts = sum(1 for a in alerts if a.alert_type == "SUSPICIOUS_COLOCATION")
    warning_alerts = sum(1 for a in alerts if a.alert_type in ["AI_WARNING", "SUSPICIOUS_COLOCATION"])

    # Determine risk level
    if unauth_border_crossings > 0:
        telemetry_risk = "HIGH"
        risk_label = "Risc Ridicat (Incidente Graniță Active)"
        recommendation = "BLOCARE / APROBARE SPECIALĂ: Clientul are tentative de părăsire a țării fără împuternicire sau cu restanțe active. Se recomandă garanție suplimentară sau limitare arie circulație."
    elif colocation_alerts > 0:
        telemetry_risk = "HIGH"
        risk_label = "Risc Ridicat (Suprapunere Trasee & Co-locare Suspectă)"
        recommendation = "ATENȚIE CO-LOCARE (ex: Dino Home Construct): Sistemul AI a identificat staționări repetate la adresele unor entități afiliate cu risc financiar/juridic. Se impune obligatoriu Contract Nou de Fidejusiune și aprobare specială Axis înainte de emiterea ofertei."
    elif warning_alerts > 0:
        telemetry_risk = "MEDIUM"
        risk_label = "Risc Mediu (Avertismente Telemetrice Înregistrate)"
        recommendation = "VERIFICARE: Monitorizați parcursul flotei. Este necesară reconfirmarea traseelor operaționale înainte de extinderea plafonului."
    else:
        telemetry_risk = "LOW"
        risk_label = "Risc Scăzut (Comportament Impecabil)"
        recommendation = "APROBARE RECOMANDATĂ: Zero încălcări ale perimetrului de operare. Vehiculele respectă traseul și procedurile de autorizare."

    return {
        "client_id": client.id,
        "client_name": client.name,
        "cui_cnp": client.cui_cnp,
        "total_active_vehicles": len(vehicles),
        "lt_vehicles_count": lt_count,
        "st_vehicles_count": st_count,
        "total_alerts": len(alerts),
        "unauthorized_border_events": unauth_border_crossings,
        "colocation_alerts_count": colocation_alerts,
        "warning_alerts_count": warning_alerts,
        "telemetry_risk": telemetry_risk,
        "risk_label": risk_label,
        "ai_recommendation": recommendation,
        "evaluated_at": datetime.utcnow().isoformat(),
        "vehicles_monitored": [
            {
                "id": v.id,
                "plate": v.license_plate,
                "model": f"{v.make} {v.model}",
                "fleet_type": getattr(v, 'fleet_type', 'LT'),
                "status": v.status.value if hasattr(v.status, 'value') else str(v.status)
            }
            for v in vehicles
        ],
        "recent_alerts": [
            {
                "id": a.id,
                "type": a.alert_type,
                "plate": a.vehicle_plate,
                "message": a.message,
                "recommendation": a.ai_recommendation,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in alerts[:5]
        ]
    }


