# Specificații Tehnice: Găzduire VPS IOSS, Securitate Cibernetică & Abonament de Mentenanță (Axis Platform)

Prezentul document definește arhitectura tehnică de producție, cerințele de securitate cibernetică și acordul de nivel al serviciilor (SLA) pentru platforma **Axis AI**, conform cerințelor operaționale formulate de conducerea Axis Rent.

---

## 1. Arhitectură Găzduire VPS (Infrastructură IOSS)

Platforma Axis AI este containerizată integral prin Docker și Docker Compose, permițând implementarea rapidă pe infrastructura VPS administrată de IOSS (compania internă a grupului).

### 1.1. Specificații Hardware Recomandate (VPS Producție)
* **Sistem de Operare:** Ubuntu Server 24.04 LTS (x64)
* **CPU:** Minim 4 vCPU (recomandat 8 vCPU pentru randare PDF / OCR masiv)
* **RAM:** Minim 8 GB RAM (recomandat 16 GB pentru procesare concurentă și cache)
* **Stocare:** 80 GB NVMe SSD (cu volum separat montat pentru documente și backups)
* **Rețea:** Conexiune gigabit (1 Gbps) cu IP public dedicat static

### 1.2. Structura Containerelor (Docker Compose)
1. **`axis_edge_proxy` (Nginx):**
   * Punct unic de intrare pentru traficul HTTPS (Port 443) și HTTP (Port 80 -> redirect 443).
   * Modul de **Rate Limiting** activ împotriva atacurilor de tip DoS / Brute-Force (`limit_req` 20r/s pe API, 5r/s pe autentificare).
   * Gzip/Brotli activ pentru compresie dinamică a resurselor.
2. **`axis_frontend` (Nginx + React SPA):**
   * Build de producție optimizat Vite + React 19.
   * Rulare Nginx non-root, cache static 1 an pentru `/assets/`.
3. **`axis_backend` (FastAPI + Uvicorn):**
   * Container rulat sub utilizatorul de sistem `axisuser` (UID 1001, fără drepturi de root).
   * 4 workers Uvicorn asincroni pentru procesare concurentă.
   * Healthcheck intern la `/health` la interval de 30 secunde.
4. **`axis_postgres` (PostgreSQL 16 Alpine):**
   * Bază relațională cu volume persistente izolate (`postgres_data`).
   * Politică strictă de acces doar în interiorul rețelei interne Docker `axis_network`.

---

## 2. Politici de Securitate Cibernetică (Cybersecurity Hardening)

### 2.1. Securitatea la Nivel de Server (Host OS)
* **Firewall (UFW):**
  * Doar porturile `80` (HTTP), `443` (HTTPS) și un port custom `SSH` (ex: 2222) sunt deschise.
  * Accesul la baza de date PostgreSQL (5432) este blocat extern.
* **Fail2ban:**
  * Protecție activă pe portul SSH și pe rutele Nginx cu ban automat timp de 24h după 5 încercări eșuate.
* **Acces SSH:**
  * Autentificare exclusivă pe bază de cheie publică Ed25519; login cu parolă dezactivat (`PasswordAuthentication no`).
  * Autentificarea directă `root` interzisă (`PermitRootLogin no`).

### 2.2. Header-e de Securitate HTTP (HSTS & Protecții Avansate)
Fiecare răspuns HTTP emis de platformă include obligatoriu:
* `Strict-Transport-Security: max-age=31536000; includeSubDomains` (forțează conexiuni TLS 1.3).
* `X-Frame-Options: SAMEORIGIN` (previne atacurile Clickjacking).
* `X-Content-Type-Options: nosniff` (previne interpretarea eronată a tipurilor MIME).
* `X-XSS-Protection: 1; mode=block` (filtrare cross-site scripting).
* `Referrer-Policy: strict-origin-when-cross-origin` (protejează intimitatea URL-urilor interne).

### 2.3. Criptografie & Păstrare Date Confidențiale
* **Semnătură Namirial eSign:**
  * Fiecare plic conține hash SHA-256 calculat la generare și la semnare.
  * Păstrare jurnal criptografic complet (IP, timestamp, cod OTP validat) în baza de date.
* **Autentificare Utilizatori:**
  * Parole criptate cu `bcrypt` (cost factor 12).
  * Token-uri de sesiune semnate criptografic cu cheie secretă de 256 biți.

---

## 3. Planul Abonamentului Lunar de Mentenanță & Integrări

Pentru asigurarea funcționării optime, securității continue și extinderii capabilităților platformei, suportul tehnic se desfășoară conform acordului de mentenanță lunară:

### 3.1. Niveluri de Suport și Timpi de Răspuns (SLA)

| Severitate | Descriere | Timp de Răspuns | Timp de Remediere |
| :--- | :--- | :--- | :--- |
| **P1 - Critic** | Platformă indisponibilă complet, eroare blocantă la semnătura eSign sau baze de date inaccesibile. | < 1 oră (24/7) | < 4 ore |
| **P2 - Major** | Funcționalitate majoră degradată (ex: generare contracte PDF eșuează pe un anumit template, telemetrie GPS întârziată). | < 4 ore | < 12 ore |
| **P3 - Minor** | Îmbunătățiri de interfață, rapoarte secundare, mici discrepanțe de stil fără impact operațional. | < 24 ore | Următorul release săptămânal |

### 3.2. Proceduri Lunare Obligatorii
1. **Actualizări de Securitate:**
   * Patch-uri de securitate la nivel de kernel Linux și containere Docker.
   * Reînnoire automată și verificare a certificatelor SSL Let's Encrypt (cu alertă la 30 zile înainte de expirare).
2. **Mentenanță Bază de Date:**
   * Rulare `VACUUM ANALYZE` și `REINDEX` lunar pentru menținerea vitezei optime de interogare.
   * Verificarea integrității backup-urilor automate (dump zilnic criptat și stocat redundant).
3. **Audit Telemetrie & API-uri Terțe:**
   * Verificarea cotelor de interogare ANAF / Termene / Portal Just.
   * Rotația trimestrială a cheilor de acces Namirial eSign și feed hardware GPS.
   * Monitorizarea latenței endpoint-urilor prin verificări automate `/health`.

### 3.3. Foaie de Parcurs (Integrări Viitoare Incluse în Mentenanță)
* **Saga / ERP Sync:** Export automat al contractelor semnate și al scadențarelor direct în modulul de facturare.
* **Open Banking / PSD2:** Verificare automată a extraselor de cont la clienții care solicită leasing operațional fără bilanț depus.
* **Extindere Hardware GPS:** Integrare protocoale native Teltonika FMB920 via TCP socket direct în containerul Axis.

---

## 4. Instrucțiuni de Pornire pe VPS IOSS

```bash
# 1. Clonare repository în directorul dedicat
git clone <repo_url> /opt/axis-platform
cd /opt/axis-platform

# 2. Configurare variabile de producție
cp .env.production.example .env.production
nano .env.production

# 3. Lansare containere în producție
docker compose --env-file .env.production up -d --build

# 4. Verificare status containere și sănătate API
docker compose ps
curl -i http://localhost/health
```
