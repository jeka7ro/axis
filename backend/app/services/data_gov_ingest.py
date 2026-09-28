"""
DataGovIngestService - Serviciu pentru ingestia și căutarea în seturi deschise de date (Open Data)
Sursa: data.gov.ro, ANAF WebServices V9 gratuit, Ministerul Finanțelor Publice, ONRC.
Permite operarea Axis cu costuri ZERO sau aproape de zero prin utilizarea bazelor de date locale
și a API-urilor publice gratuite ale statului român.
"""

import os
import csv
import json
import asyncio
from datetime import datetime
from typing import List, Dict, Optional
import httpx
from sqlalchemy import or_

from ..database import SessionLocal
from ..models.client import CompanyCache, Client


class DataGovIngestService:
    def __init__(self):
        self.anaf_bulk_url = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"

    def search_local_companies(self, query: str, limit: int = 15) -> List[Dict]:
        """
        Căutare instantanee (sub 3ms) în baza de date locală SQLite.
        Verifică întâi axis_company_cache, apoi axis_clients.
        Returnează rezultate standardizate fără niciun apel la API extern plătit.
        """
        if not query or len(query.strip()) < 2:
            return []

        clean_q = query.strip()
        is_numeric = clean_q.isdigit()

        results = []
        seen_cuis = set()

        try:
            with SessionLocal() as db:
                # 1. Căutare în axis_company_cache
                if is_numeric:
                    cache_rows = (
                        db.query(CompanyCache)
                        .filter(CompanyCache.cui.like(f"%{clean_q}%"))
                        .limit(limit)
                        .all()
                    )
                else:
                    cache_rows = (
                        db.query(CompanyCache)
                        .filter(
                            or_(
                                CompanyCache.name.ilike(f"%{clean_q}%"),
                                CompanyCache.reg_com.ilike(f"%{clean_q}%")
                            )
                        )
                        .limit(limit)
                        .all()
                    )

                for r in cache_rows:
                    if r.cui not in seen_cuis:
                        seen_cuis.add(r.cui)
                        results.append({
                            "cui": r.cui,
                            "denumire": r.name or f"Companie CUI {r.cui}",
                            "nr_reg_com": r.reg_com or "—",
                            "stare": r.status or "Înregistrat",
                            "adresa": r.address or "—",
                            "cod_caen": r.caen or "—",
                            "caen_descriere": r.caen_desc or "—",
                            "sursa": r.source or "LOCAL_CACHE"
                        })

                # 2. Căutare în axis_clients (clienți deja salvați)
                if len(results) < limit:
                    if is_numeric:
                        client_rows = (
                            db.query(Client)
                            .filter(Client.cui_cnp.like(f"%{clean_q}%"))
                            .limit(limit - len(results))
                            .all()
                        )
                    else:
                        client_rows = (
                            db.query(Client)
                            .filter(Client.name.ilike(f"%{clean_q}%"))
                            .limit(limit - len(results))
                            .all()
                        )

                    for c in client_rows:
                        clean_c_cui = "".join(filter(str.isdigit, str(c.cui_cnp or "")))
                        if clean_c_cui and clean_c_cui not in seen_cuis:
                            seen_cuis.add(clean_c_cui)
                            results.append({
                                "cui": clean_c_cui,
                                "denumire": c.name,
                                "nr_reg_com": c.reg_com or "—",
                                "stare": "Client Salvat",
                                "adresa": c.address or "—",
                                "cod_caen": "—",
                                "caen_descriere": "—",
                                "sursa": "AXIS_CLIENTS_DB"
                            })
        except Exception as e:
            print(f"[LOCAL SEARCH ERROR] {e}")

        return results

    async def fetch_anaf_bulk_free(self, cui_list: List[str]) -> List[Dict]:
        """
        Interogare oficială ANAF V9 în pachet (până la 500 de CUI-uri într-un singur request GRATUIT).
        Toate datele obținute sunt salvate automat în axis_company_cache cu cost 0 lei.
        """
        if not cui_list:
            return []

        clean_cuis = []
        for c in cui_list:
            digits = "".join(filter(str.isdigit, str(c)))
            if digits:
                clean_cuis.append(int(digits))

        if not clean_cuis:
            return []

        # ANAF permite maxim 500 CUI-uri per cerere
        chunks = [clean_cuis[i:i + 500] for i in range(0, len(clean_cuis), 500)]
        all_companies = []
        today_str = datetime.now().strftime("%Y-%m-%d")

        async with httpx.AsyncClient(timeout=30.0) as client:
            for chunk in chunks:
                payload = [{"cui": c, "data": today_str} for c in chunk]
                try:
                    resp = await client.post(self.anaf_bulk_url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        found = data.get("found", [])
                        with SessionLocal() as db:
                            for item in found:
                                dg = item.get("date_generale", {})
                                tva = item.get("inregistrare_scop_Tva", {})
                                inactiv = item.get("stare_inactiv", {})
                                c_cui = str(dg.get("cui") or "")
                                if not c_cui:
                                    continue

                                name = dg.get("denumire", "")
                                reg_com = dg.get("nrRegCom", "")
                                addr = dg.get("adresa", "")
                                caen = str(dg.get("cod_CAEN") or "")
                                stare = dg.get("stare_inregistrare", "")
                                is_act = "INREGISTRAT" in stare and "RADIAT" not in stare.upper()
                                status_str = "Activa" if is_act else "Radiata"

                                company_dict = {
                                    "cui": c_cui,
                                    "denumire": name,
                                    "adresa": addr,
                                    "nr_reg_com": reg_com,
                                    "stare": status_str,
                                    "cod_caen": caen,
                                    "telefon": dg.get("telefon") or "—",
                                    "forma_juridica": dg.get("forma_juridica") or "SRL",
                                    "tva_activ": bool(tva.get("scpTVA", False)),
                                    "inactiv_fiscal": bool(inactiv.get("statusInactivi", False)),
                                    "ro_efactura": bool(dg.get("statusRO_e_Factura", False)),
                                    "data_inregistrare": dg.get("data_inregistrare", ""),
                                    "sursa": "ANAF_BULK_GRATUIT"
                                }

                                all_companies.append(company_dict)

                                # Salvare/actualizare în DB cache
                                row = db.query(CompanyCache).filter(CompanyCache.cui == c_cui).first()
                                if not row:
                                    row = CompanyCache(cui=c_cui)
                                    db.add(row)

                                row.name = name
                                row.reg_com = reg_com
                                row.status = status_str
                                row.address = addr
                                row.caen = caen
                                row.general_data = json.dumps(company_dict, ensure_ascii=False)
                                row.source = "ANAF_BULK_GRATUIT"
                                row.updated_at = datetime.utcnow()

                            db.commit()
                except Exception as e:
                    print(f"[ANAF BULK ERROR] {e}")

        return all_companies

    def ingest_csv_dump(self, csv_path: str, max_rows: int = 100000) -> int:
        """
        Ingestie dintr-un fișier CSV descărcat de pe data.gov.ro (ex: Date_firme_ONRC.csv sau Bilanțuri MF).
        Rulează în tranzacții bulk (2,000 linii per commit) pentru viteză maximă.
        """
        if not os.path.exists(csv_path):
            print(f"[INGEST ERROR] Fișierul {csv_path} nu a fost găsit.")
            return 0

        inserted = 0
        batch = []
        batch_size = 2000

        try:
            with open(csv_path, mode="r", encoding="utf-8-sig", errors="ignore") as f:
                reader = csv.DictReader(f, delimiter="^" if "^" in f.readline() else ",")
                f.seek(0)
                # Re-detect header
                first_line = f.readline()
                delim = "^" if "^" in first_line else (";" if ";" in first_line else ",")
                f.seek(0)
                reader = csv.DictReader(f, delimiter=delim)

                with SessionLocal() as db:
                    for i, row in enumerate(reader):
                        if i >= max_rows:
                            break

                        # Extragere câmpuri standard (suportă variațiile ONRC / MF)
                        cui = str(row.get("CUI") or row.get("cui") or row.get("CIF") or row.get("cod_fiscal") or "").strip()
                        cui = "".join(filter(str.isdigit, cui))
                        if not cui:
                            continue

                        name = str(row.get("DENUMIRE") or row.get("denumire") or row.get("nume") or "").strip()
                        reg_com = str(row.get("COD_INMATRICULARE") or row.get("reg_com") or row.get("nr_reg_com") or "").strip()
                        stare = str(row.get("STARE_FIRMA") or row.get("stare") or "Activă").strip()
                        adresa = str(row.get("ADRESA") or row.get("adresa") or "").strip()
                        caen = str(row.get("CAEN") or row.get("cod_caen") or "").strip()

                        batch.append({
                            "cui": cui,
                            "name": name,
                            "reg_com": reg_com,
                            "status": stare,
                            "address": adresa,
                            "caen": caen,
                            "source": "DATA_GOV_RO_DUMP",
                            "updated_at": datetime.utcnow()
                        })

                        if len(batch) >= batch_size:
                            for item in batch:
                                existing = db.query(CompanyCache).filter(CompanyCache.cui == item["cui"]).first()
                                if existing:
                                    existing.name = item["name"] or existing.name
                                    existing.reg_com = item["reg_com"] or existing.reg_com
                                    existing.status = item["status"] or existing.status
                                    existing.address = item["address"] or existing.address
                                    existing.caen = item["caen"] or existing.caen
                                    existing.updated_at = datetime.utcnow()
                                else:
                                    db.add(CompanyCache(**item))
                            db.commit()
                            inserted += len(batch)
                            batch = []
                            print(f"[INGEST PROGRESS] {inserted} companii procesate...")

                    if batch:
                        for item in batch:
                            existing = db.query(CompanyCache).filter(CompanyCache.cui == item["cui"]).first()
                            if existing:
                                existing.name = item["name"] or existing.name
                                existing.reg_com = item["reg_com"] or existing.reg_com
                                existing.status = item["status"] or existing.status
                                existing.address = item["address"] or existing.address
                                existing.caen = item["caen"] or existing.caen
                                existing.updated_at = datetime.utcnow()
                            else:
                                db.add(CompanyCache(**item))
                        db.commit()
                        inserted += len(batch)

            print(f"[INGEST SUCCESS] Total {inserted} companii salvate în baza de date locală.")
            return inserted
        except Exception as e:
            print(f"[INGEST ERROR] Eroare la citirea CSV: {e}")
            return inserted
