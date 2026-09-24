import re
import urllib.parse
from typing import Dict, Any, Optional
import httpx
from .address_checker import AddressChecker

PUBLIC_EMAIL_PROVIDERS = {
    'gmail.com', 'yahoo.com', 'yahoo.ro', 'hotmail.com', 'outlook.com', 
    'icloud.com', 'proton.me', 'protonmail.com', 'mail.ru', 'zoho.com'
}

class VisualEnricher:
    def __init__(self):
        self.address_checker = AddressChecker()

    def extract_domain(self, website: Optional[str] = None, email: Optional[str] = None) -> Optional[str]:
        """Extrage domeniul curat al companiei din website sau email oficial."""
        if website and website.strip():
            w = website.strip().lower()
            if not w.startswith(('http://', 'https://')):
                w = 'https://' + w
            try:
                parsed = urllib.parse.urlparse(w)
                netloc = parsed.netloc or parsed.path
                netloc = re.sub(r'^www\.', '', netloc)
                if '.' in netloc and len(netloc.split('.')) >= 2:
                    return netloc.split('/')[0]
            except Exception:
                pass

        if email and '@' in email:
            try:
                domain = email.strip().split('@')[-1].lower()
                if domain not in PUBLIC_EMAIL_PROVIDERS and '.' in domain:
                    return domain
            except Exception:
                pass

        return None

    async def enrich_company(
        self, 
        cui: str, 
        company_name: str, 
        address: Optional[str] = None, 
        email: Optional[str] = None, 
        website: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generează profilul vizual și dosarul OSINT de verificare fizică pentru o companie:
        - Logo & identitate vizuală
        - Geocodificare coordonate sediu (lat, lon)
        - Google Street View 360 & Satelit HD
        - Link-uri directe pentru verificări fizice & registre publice (SEAP, RNPM, BPI, Recenzii)
        """
        clean_cui = "".join(filter(str.isdigit, str(cui)))
        domain = self.extract_domain(website, email)
        
        logo_url = None
        favicon_url = None
        if domain:
            logo_url = f"https://logo.clearbit.com/{domain}"
            favicon_url = f"https://www.google.com/s2/favicons?domain={domain}&sz=128"

        location_info = {}
        coords = None
        clean_address = (address or "").strip()

        if clean_address:
            try:
                location_info = self.address_checker._extract_location_info(clean_address)
                coords = await self.address_checker._geocode_address(location_info)
            except Exception as e:
                print(f"[VisualEnricher] Geocoding error for address '{clean_address}': {e}")

        lat = coords.get("lat") if coords else None
        lon = coords.get("lon") if coords else None

        city = location_info.get("city") or ""
        search_query = f"{company_name} {city}".strip()

        # URLs pentru hărți și Street View
        maps_satellite_embed = None
        maps_street_embed = None
        street_view_url = None
        if lat is not None and lon is not None:
            maps_satellite_embed = f"https://maps.google.com/maps?q={lat},{lon}&t=k&z=18&ie=UTF8&iwloc=&output=embed"
            maps_street_embed = f"https://maps.google.com/maps?q={lat},{lon}&t=m&z=17&ie=UTF8&iwloc=&output=embed"
            street_view_url = f"https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat},{lon}"
        elif clean_address:
            encoded_addr = urllib.parse.quote(clean_address)
            maps_satellite_embed = f"https://maps.google.com/maps?q={encoded_addr}&t=k&z=17&ie=UTF8&iwloc=&output=embed"
            maps_street_embed = f"https://maps.google.com/maps?q={encoded_addr}&t=m&z=17&ie=UTF8&iwloc=&output=embed"
            street_view_url = f"https://www.google.com/maps/search/?api=1&query={encoded_addr}"

        google_places_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(search_query)}"

        return {
            "domain": domain,
            "website": website or (f"https://{domain}" if domain else None),
            "logo_url": logo_url,
            "favicon_url": favicon_url,
            "has_logo": bool(logo_url),
            "address": clean_address,
            "location_info": location_info,
            "coordinates": {
                "lat": lat,
                "lon": lon,
                "geocoded": bool(lat is not None and lon is not None)
            },
            "views": {
                "satellite_embed": maps_satellite_embed,
                "street_embed": maps_street_embed,
                "street_view_direct_url": street_view_url,
                "google_places_search_url": google_places_url
            },
            "osint_portals": {
                "google_reviews_url": f"https://www.google.com/search?q={urllib.parse.quote(company_name + ' recenzii pareri')}",
                "seap_url": f"https://www.e-licitatie.ro/pub/notices/contract-notices/list/cui/{clean_cui}",
                "rnpm_url": f"https://www.coim.ro/cautare-avize?cui={clean_cui}",
                "bpi_url": f"https://bpi.ro/cautare?cui={clean_cui}",
                "linkedin_url": f"https://www.google.com/search?q={urllib.parse.quote('site:linkedin.com/company ' + company_name)}"
            }
        }
