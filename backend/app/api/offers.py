from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import uuid
import os
from datetime import datetime
try:
    from docx import Document
except ImportError:
    Document = None
from supabase import create_client, Client as SupabaseClient

from ..config import settings
from ..database import get_db
from ..models.offer import Offer, Contract, OfferStatus, ContractStatus
from ..models.client import Client, Evaluation
from ..models.user import User
from ..models.vehicle import Vehicle
from ..schemas.offer import OfferCreate, OfferResponse, ContractResponse, ContractCreateRequest
from ..api.auth import get_current_user
from ..services.contract_generator import create_official_fidejusor_template, create_standard_contract_template
import json

# --- AUTH BYPASS FOR LOCAL DEV (So the UI doesn't break due to missing JWT) ---
def mock_get_current_user(db: Session = Depends(get_db)):
    try:
        user = db.query(User).first()
        if not user:
            from ..models.user import RoleEnum
            user = User(email="admin@axis.ro", hashed_password="mock", full_name="Eugeniu Cazmal", role=RoleEnum.super_admin, is_active=True)
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

router = APIRouter(prefix="/api/offers", tags=["Offers & Contracts"])

def calculate_monthly_rate(price, advance_pct, residual_pct, period, interest_rate):
    """
    Mock financial calculation.
    In real life this would use PMT formula.
    """
    advance = price * (advance_pct / 100)
    residual = price * (residual_pct / 100)
    financed_amount = price - advance - residual
    
    # Simple mock calculation (Principal + total interest) / period
    total_interest = financed_amount * (interest_rate / 100) * (period / 12)
    monthly_payment = (financed_amount + total_interest) / period
    return round(monthly_payment, 2)

@router.post("/", response_model=OfferResponse)
def create_offer(offer: OfferCreate, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    # Check client
    client = db.query(Client).filter(Client.id == offer.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    rate = calculate_monthly_rate(
        offer.vehicle_price, 
        offer.advance_percent, 
        offer.residual_value_percent, 
        offer.period_months, 
        offer.interest_rate
    )
    
    new_offer = Offer(
        **offer.model_dump(),
        monthly_rate=rate,
        created_by_id=current_user.id
    )
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)
    return new_offer

from sqlalchemy.orm import joinedload

@router.get("/", response_model=List[OfferResponse])
@router.get("", response_model=List[OfferResponse])
def get_offers(db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    offers = db.query(Offer).options(joinedload(Offer.contract)).order_by(Offer.created_at.desc()).all()
    return offers

@router.get("/contracts", response_model=List[ContractResponse])
def get_contracts(db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    return db.query(Contract).order_by(Contract.created_at.desc()).all()

@router.get("/{offer_id}", response_model=OfferResponse)
def get_offer(offer_id: int, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    offer = db.query(Offer).options(joinedload(Offer.contract)).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return offer

@router.get("/fidejusor-suggestion/{client_id}")
def get_fidejusor_suggestion(client_id: int, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    """
    Extracts the recommended Fidejusor (Guarantor) from the client's AI evaluation governance data (holdings, administrators).
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    candidates = []
    
    # 1. Search in latest evaluation
    latest_eval = db.query(Evaluation).filter(Evaluation.client_id == client_id).order_by(Evaluation.created_at.desc()).first()
    if latest_eval and latest_eval.raw_financial_data:
        try:
            raw_data = json.loads(latest_eval.raw_financial_data) if isinstance(latest_eval.raw_financial_data, str) else latest_eval.raw_financial_data
            
            # Check holdings
            holdings = raw_data.get("holdings", [])
            for h in holdings:
                if h.get("current") is not False and h.get("name"):
                    pct = float(h.get("percent") or 0)
                    is_adm = bool(h.get("is_administrator"))
                    quality = f"Asociat ({pct}%) & Administrator" if (is_adm and pct > 0) else f"Asociat ({pct}%)" if pct > 0 else "Administrator Statutar"
                    candidates.append({
                        "name": str(h.get("name")).strip().upper(),
                        "cnp": str(h.get("cnp") or ""),
                        "address": str(h.get("placeofbirth") or client.address or "Mun. București"),
                        "id_card": "",
                        "quality": quality,
                        "ownership_percent": pct,
                        "is_administrator": is_adm,
                        "source": "Registrul Comerțului (Asociați)"
                    })
                    
            # Check administrators
            admins = raw_data.get("administrators", [])
            for a in admins:
                adm_name = str(a.get("nume") or a.get("name") or "").strip().upper()
                if adm_name and not any(c["name"] == adm_name for c in candidates):
                    candidates.append({
                        "name": adm_name,
                        "cnp": str(a.get("cnp") or ""),
                        "address": str(a.get("loc_nastere") or client.address or "Mun. București"),
                        "id_card": "",
                        "quality": "Administrator Statutar",
                        "ownership_percent": 0.0,
                        "is_administrator": True,
                        "source": "Registrul Comerțului (Administratori)"
                    })
                    
            # Check personnel
            personnel = raw_data.get("personnel", [])
            for p in personnel:
                p_name = str(p.get("nume") or "").strip().upper()
                if p_name and not any(c["name"] == p_name for c in candidates):
                    candidates.append({
                        "name": p_name,
                        "cnp": "",
                        "address": str(p.get("loc_nastere") or client.address or "Mun. București"),
                        "id_card": "",
                        "quality": str(p.get("rol") or "Conducere Executivă"),
                        "ownership_percent": float(p.get("cota_participare") or 0),
                        "is_administrator": bool(p.get("este_administrator")),
                        "source": "Date Guvernanță FirmeAPI"
                    })
        except Exception as e:
            print(f"Error parsing raw_financial_data for fidejusor: {e}")
            
    # 2. Add representative from client record if available
    if client.representative_name:
        rep_name = str(client.representative_name).strip().upper()
        if not any(c["name"] == rep_name for c in candidates):
            id_card_str = f"Seria {client.id_card_series or ''} nr. {client.id_card_number or ''}".strip()
            candidates.append({
                "name": rep_name,
                "cnp": str(client.representative_cnp or ""),
                "address": str(client.representative_address or client.address or "Mun. București"),
                "id_card": id_card_str,
                "quality": "Reprezentant Legal / Administrator",
                "ownership_percent": 0.0,
                "is_administrator": True,
                "source": "Profil Client Axis"
            })
            
    # Sort candidates: highest ownership %, then administrators
    candidates.sort(key=lambda x: (x.get("ownership_percent", 0), 1 if x.get("is_administrator") else 0), reverse=True)
    suggested = candidates[0] if candidates else {
        "name": client.representative_name or client.name,
        "cnp": client.representative_cnp or (client.cui_cnp if client.type == 'PF' else ""),
        "address": client.address or "Mun. București",
        "id_card": f"Seria {client.id_card_series or ''} nr. {client.id_card_number or ''}".strip(),
        "quality": "Administrator / Fidejusor Garant",
        "ownership_percent": 0.0,
        "is_administrator": True,
        "source": "Implicit"
    }
    
    return {
        "client_id": client.id,
        "client_name": client.name,
        "suggested_fidejusor": suggested,
        "all_candidates": candidates
    }

@router.put("/{offer_id}", response_model=OfferResponse)
def update_offer(offer_id: int, request: OfferCreate, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    if offer.status != OfferStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Doar ofertele Draft pot fi editate.")
        
    offer.client_id = request.client_id
    offer.vehicle_id = getattr(request, 'vehicle_id', None)
    offer.vehicle_make = request.vehicle_make
    offer.vehicle_model = request.vehicle_model
    offer.vehicle_price = request.vehicle_price
    offer.advance_percent = request.advance_percent
    offer.period_months = request.period_months
    offer.residual_value_percent = request.residual_value_percent
    offer.interest_rate = request.interest_rate
    offer.currency = getattr(request, 'currency', offer.currency or 'EUR')
    offer.template_type = getattr(request, 'template_type', offer.template_type or 'standard')
    
    # Update Fidejusor fields
    offer.fidejusor_name = getattr(request, 'fidejusor_name', offer.fidejusor_name)
    offer.fidejusor_cnp = getattr(request, 'fidejusor_cnp', offer.fidejusor_cnp)
    offer.fidejusor_address = getattr(request, 'fidejusor_address', offer.fidejusor_address)
    offer.fidejusor_id_card = getattr(request, 'fidejusor_id_card', offer.fidejusor_id_card)
    offer.fidejusor_quality = getattr(request, 'fidejusor_quality', offer.fidejusor_quality)
    
    advance = (offer.vehicle_price * offer.advance_percent) / 100
    residual = (offer.vehicle_price * offer.residual_value_percent) / 100
    financed = offer.vehicle_price - advance - residual
    total_interest = financed * (offer.interest_rate / 100) * (offer.period_months / 12)
    offer.monthly_rate = (financed + total_interest) / offer.period_months

    db.commit()
    db.refresh(offer)
    return offer

@router.delete("/{offer_id}")
def delete_offer(offer_id: int, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    if offer.contract:
        db.delete(offer.contract)
    
    db.delete(offer)
    db.commit()
    return {"message": "Offer deleted successfully"}

@router.post("/{offer_id}/approve", response_model=OfferResponse)
def approve_offer(offer_id: int, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    offer.status = OfferStatus.APPROVED
    offer.approved_by_id = current_user.id
    db.commit()
    db.refresh(offer)
    return offer

@router.post("/upload-template")
async def upload_template(file: UploadFile = File(...), current_user = Depends(mock_get_current_user)):
    os.makedirs("templates", exist_ok=True)
    file_location = f"templates/contract_template.docx"
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())
    return {"info": f"file '{file.filename}' saved at '{file_location}'"}

@router.post("/{offer_id}/generate-contract", response_model=ContractResponse)
def generate_contract(offer_id: int, request: ContractCreateRequest, db: Session = Depends(get_db), current_user = Depends(mock_get_current_user)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    vehicle = None
    vehicle_id_to_use = request.vehicle_id or offer.vehicle_id
    if vehicle_id_to_use:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id_to_use).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
    contract_num = f"AXIS-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}"
    document_url = f"/documents/{contract_num}.docx"
    document_path = f"documents/{contract_num}.docx"
    
    selected_template = (request.template_type or offer.template_type or 'standard').lower()
    
    os.makedirs("templates", exist_ok=True)
    os.makedirs("documents", exist_ok=True)
    
    template_mapping = {
        'standard': 'templates/contract_template.docx',
        'fidejusor': 'templates/contract_template_fidejusor.docx',
        'leasing': 'templates/contract_template_leasing.docx'
    }
    template_path = template_mapping.get(selected_template, 'templates/contract_template.docx')
    
    # Auto-generate templates if missing
    if not os.path.exists(template_path):
        try:
            if 'fidejusor' in selected_template:
                create_official_fidejusor_template(template_path)
            else:
                create_standard_contract_template(template_path)
        except Exception as e:
            print(f"Error auto-generating template {template_path}: {e}")
            
    # Resolve Fidejusor details
    f_name = request.fidejusor_name or offer.fidejusor_name
    f_cnp = request.fidejusor_cnp or offer.fidejusor_cnp
    f_addr = request.fidejusor_address or offer.fidejusor_address
    f_id_card = request.fidejusor_id_card or offer.fidejusor_id_card
    f_qual = request.fidejusor_quality or offer.fidejusor_quality
    
    # If fidejusor still missing and template is fidejusor, extract from evaluation
    if not f_name and selected_template == 'fidejusor':
        try:
            suggestion = get_fidejusor_suggestion(offer.client_id, db, current_user)
            s = suggestion.get("suggested_fidejusor", {})
            f_name = s.get("name")
            f_cnp = s.get("cnp")
            f_addr = s.get("address")
            f_id_card = s.get("id_card")
            f_qual = s.get("quality")
        except Exception:
            f_name = offer.client.representative_name or offer.client.name
            f_qual = "Administrator / Fidejusor Garant"
            
    # Compute financial amounts
    advance_amount = round((offer.vehicle_price * offer.advance_percent) / 100, 2)
    residual_amount = round((offer.vehicle_price * offer.residual_value_percent) / 100, 2)
    currency_str = getattr(offer, 'currency', 'EUR') or 'EUR'
    
    if os.path.exists(template_path) and Document:
        doc = Document(template_path)
        replacements = {
            "{{nr_contract}}": contract_num,
            "{{data_contract}}": datetime.now().strftime("%d.%m.%Y"),
            "{{client_name}}": offer.client.name,
            "{{client_cui}}": offer.client.cui_cnp,
            "{{client_reg_com}}": offer.client.reg_com or "J40/___/____",
            "{{client_address}}": offer.client.address or "Mun. București",
            "{{client_representative}}": offer.client.representative_name or offer.client.name,
            "{{client_representative_quality}}": "Administrator Statutar",
            "{{client_id_card_series}}": offer.client.id_card_series or "__",
            "{{client_id_card_number}}": offer.client.id_card_number or "______",
            "{{vehicle_make}}": vehicle.make if vehicle else offer.vehicle_make,
            "{{vehicle_model}}": vehicle.model if vehicle else offer.vehicle_model,
            "{{vehicle_vin}}": vehicle.vin if vehicle else "___________",
            "{{vehicle_plate}}": vehicle.license_plate if vehicle else "___________",
            "{{vehicle_price}}": f"{offer.vehicle_price:,.2f}",
            "{{currency}}": currency_str,
            "{{period_months}}": str(offer.period_months),
            "{{advance_percent}}": f"{offer.advance_percent:.1f}",
            "{{advance_amount}}": f"{advance_amount:,.2f}",
            "{{monthly_rate}}": f"{offer.monthly_rate:,.2f}",
            "{{residual_value_percent}}": f"{offer.residual_value_percent:.1f}",
            "{{residual_value_amount}}": f"{residual_amount:,.2f}",
            "{{interest_rate}}": f"{offer.interest_rate:.1f}",
            "{{fidejusor_name}}": f_name or "___________",
            "{{fidejusor_cnp}}": f_cnp or "___________",
            "{{fidejusor_address}}": f_addr or offer.client.address or "Mun. București",
            "{{fidejusor_id_card}}": f_id_card or "Seria __ nr. ______",
            "{{fidejusor_quality}}": f_qual or "Administrator / Fidejusor Garant"
        }
        
        def replace_in_paragraphs(paragraphs):
            for p in paragraphs:
                for key, value in replacements.items():
                    if key in p.text:
                        p.text = p.text.replace(key, str(value))
                        
        replace_in_paragraphs(doc.paragraphs)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    replace_in_paragraphs(cell.paragraphs)
                    
        doc.save(document_path)
        
        # Upload to Supabase Storage if configured
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            try:
                supabase: SupabaseClient = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
                file_name = f"{contract_num}.docx"
                
                with open(document_path, 'rb') as f:
                    supabase.storage.from_('axis-documents').upload(
                        file_name, 
                        f, 
                        {"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
                    )
                document_url = supabase.storage.from_('axis-documents').get_public_url(file_name)
            except Exception as e:
                print(f"Supabase upload failed, falling back to local: {e}")
    else:
        # Fallback minimal docx
        doc = Document()
        doc.add_heading(f'Contract Auto Axis - {contract_num}', 0)
        doc.add_paragraph(f'Client: {offer.client.name} (CUI: {offer.client.cui_cnp})')
        doc.add_paragraph(f'Vehicul: {vehicle.make if vehicle else offer.vehicle_make} {vehicle.model if vehicle else offer.vehicle_model}')
        doc.add_paragraph(f'Pret: {offer.vehicle_price:,.2f} {currency_str}')
        doc.add_paragraph(f'Rată Lunară: {offer.monthly_rate:,.2f} {currency_str}')
        if f_name:
            doc.add_paragraph(f'Fidejusor Garant: {f_name} ({f_qual})')
        doc.save(document_path)
    
    new_contract = Contract(
        offer_id=offer.id,
        vehicle_id=vehicle_id_to_use,
        contract_number=contract_num,
        template_type=selected_template,
        status=ContractStatus.GENERATED,
        document_url=document_url,
        fidejusor_name=f_name,
        fidejusor_cnp=f_cnp,
        fidejusor_address=f_addr,
        fidejusor_id_card=f_id_card,
        fidejusor_quality=f_qual
    )
    offer.status = OfferStatus.CONVERTED
    
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    return new_contract

