import httpx
import logging
from typing import Dict, Any, Optional
from ..config import settings

logger = logging.getLogger(__name__)

async def send_brevo_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> Dict[str, Any]:
    """
    Trimite un email tranzacțional prin Brevo (Sendinblue) Transactional API v3:
    Endpoint: https://api.brevo.com/v3/smtp/email
    """
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json"
    }

    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL
        },
        "to": [
            {
                "email": to_email,
                "name": to_name or to_email
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }

    if text_content:
        payload["textContent"] = text_content

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(settings.BREVO_API_URL, headers=headers, json=payload)
            if resp.status_code in [200, 201, 202]:
                data = resp.json()
                logger.info(f"[Brevo Email Sent] To: {to_email} | MessageId: {data.get('messageId')}")
                return {"success": True, "message_id": data.get("messageId"), "status_code": resp.status_code}
            else:
                logger.error(f"[Brevo Email Error] Status: {resp.status_code} | Body: {resp.text}")
                return {"success": False, "error": resp.text, "status_code": resp.status_code}
    except Exception as e:
        logger.error(f"[Brevo Email Exception]: {e}")
        return {"success": False, "error": str(e)}


def _get_base_email_template(
    title: str,
    content_html: str,
    action_button_html: str = "",
    action_url: str = "",
    action_text: str = ""
) -> str:
    """
    Șablon HTML executiv monocrom, minimalist (Swiss / Apple B2B Luxury Style).
    Include sigla oficială Axis, fundal neutru curat, fără culori stridente și fără fonturi robotizate.
    """
    button_markup = ""
    if action_url and action_text:
        button_markup = f"""
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 24px 0;">
            <tr>
              <td align="left" style="border-radius: 8px; background-color: #111111;">
                <a href="{action_url}" target="_blank" style="display: inline-block; padding: 13px 28px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px;">
                  {action_text}
                </a>
              </td>
            </tr>
          </table>
        """
    elif action_button_html:
        button_markup = action_button_html

    return f"""<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f8; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #111111;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f8; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e5e5e7; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
          
          <!-- Header cu Logo Oficial Axis (Monocrom, fără fundal colorat) -->
          <tr>
            <td style="padding: 36px 40px 24px 40px; border-bottom: 1px solid #f0f0f2;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="https://axisrent.ro/wp-content/uploads/2025/06/Black-AXIS-logo-1.png" alt="AXIS" width="100" style="display: block; border: 0; outline: none; height: auto;" />
                  </td>
                  <td align="right" valign="middle" style="font-size: 11px; color: #86868b; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 500;">
                    Platform
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Conținut Principal -->
          <tr>
            <td style="padding: 36px 40px 32px 40px;">
              <h1 style="font-size: 20px; font-weight: 600; color: #111111; margin: 0 0 18px 0; letter-spacing: -0.3px; line-height: 1.3;">
                {title}
              </h1>

              <div style="font-size: 14px; line-height: 1.65; color: #333336;">
                {content_html}
              </div>

              {button_markup}
            </td>
          </tr>

          <!-- Footer Oficial Minimalist -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafc; border-top: 1px solid #f0f0f2; font-size: 12px; line-height: 1.6; color: #86868b;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-weight: 500; color: #555558;">Axis Mobility</p>
                    <p style="margin: 0; font-size: 11px; color: #86868b;">
                      Mesaj securizat transmis automat prin serviciul tranzacțional Brevo.<br>
                      Pentru asistență, ne poți scrie la <a href="mailto:contact@axisrent.ro" style="color: #111111; text-decoration: underline;">contact@axisrent.ro</a> sau accesează <a href="https://axisrent.ro" target="_blank" style="color: #111111; text-decoration: underline;">axisrent.ro</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_password_reset_email(to_email: str, to_name: str, reset_token: str) -> Dict[str, Any]:
    """Expediază linkul securizat de recuperare parolă cu valabilitate 60 minute"""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    title = "Resetare Parolă Cont Axis"
    
    content_html = f"""
      <p style="margin: 0 0 16px 0;">
        Bună ziua, <strong>{to_name or 'Utilizator'}</strong>,
      </p>
      <p style="margin: 0 0 20px 0;">
        Am primit o solicitare de resetare a parolei pentru contul asociat adresei <strong>{to_email}</strong> pe platforma Axis.
      </p>
      <div style="background-color: #f7f7f8; border: 1px solid #e5e5e7; border-radius: 8px; padding: 14px 18px; margin: 0 0 22px 0;">
        <p style="margin: 0; font-size: 13px; color: #333336; line-height: 1.5;">
          Linkul de mai jos este securizat și rămâne valabil timp de <strong>60 de minute</strong>.
        </p>
      </div>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #77777a;">
        Dacă butonul nu se deschide, accesează direct adresa:
      </p>
      <p style="margin: 0 0 20px 0; font-size: 12px; word-break: break-all;">
        <a href="{reset_url}" style="color: #111111; text-decoration: underline;">{reset_url}</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #88888b; padding-top: 16px; border-top: 1px solid #f0f0f2;">
        Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest mesaj. Parola contului tău rămâne în siguranță.
      </p>
    """

    html = _get_base_email_template(
        title=title,
        content_html=content_html,
        action_url=reset_url,
        action_text="Resetează Parola"
    )
    return await send_brevo_email(to_email, to_name, "Axis Platform — Resetare Parolă", html)


async def send_welcome_email(to_email: str, to_name: str, role: str) -> Dict[str, Any]:
    """Expediază email de bun venit și confirmare a creării contului pe Axis Platform"""
    login_url = f"{settings.FRONTEND_URL}/login"
    title = "Confirmare Creare Cont Axis"
    
    content_html = f"""
      <p style="margin: 0 0 16px 0;">
        Bună ziua, <strong>{to_name or 'Utilizator'}</strong>,
      </p>
      <p style="margin: 0 0 20px 0;">
        Contul tău a fost creat pe platforma Axis. Datele asociate profilului tău sunt următoarele:
      </p>
      <div style="background-color: #f7f7f8; border: 1px solid #e5e5e7; border-radius: 8px; padding: 16px 20px; margin: 0 0 22px 0;">
        <table width="100%" cellpadding="5" cellspacing="0" border="0" style="font-size: 13px;">
          <tr>
            <td style="color: #77777a; width: 130px;">Email conectare:</td>
            <td style="color: #111111; font-weight: 600;">{to_email}</td>
          </tr>
          <tr>
            <td style="color: #77777a;">Rol alocat:</td>
            <td style="color: #111111; font-weight: 600;">{role}</td>
          </tr>
        </table>
      </div>
      <p style="margin: 0; font-size: 13px; color: #555558;">
        Te poți autentifica oricând în panoul de administrare folosind datele stabilite la înregistrare.
      </p>
    """

    html = _get_base_email_template(
        title=title,
        content_html=content_html,
        action_url=login_url,
        action_text="Conectare în Platformă"
    )
    return await send_brevo_email(to_email, to_name, "Axis Platform — Confirmare Înregistrare Cont", html)


async def send_password_changed_confirmation_email(to_email: str, to_name: str) -> Dict[str, Any]:
    """Confirmă schimbarea cu succes a parolei"""
    title = "Actualizare Parolă Cont Axis"
    
    content_html = f"""
      <p style="margin: 0 0 16px 0;">
        Bună ziua, <strong>{to_name or 'Utilizator'}</strong>,
      </p>
      <p style="margin: 0 0 20px 0;">
        Te informăm că parola pentru contul tău Axis (<strong>{to_email}</strong>) a fost actualizată cu succes.
      </p>
      <div style="background-color: #f7f7f8; border: 1px solid #e5e5e7; border-radius: 8px; padding: 14px 18px; margin: 0 0 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #333336; line-height: 1.5;">
          Noua parolă este activă pentru toate autentificările viitoare.
        </p>
      </div>
      <p style="margin: 0; font-size: 12px; color: #77777a; padding-top: 14px; border-top: 1px solid #f0f0f2;">
        Dacă nu ai efectuat tu această modificare, te rugăm să contactezi de urgență echipa administrativă la contact@axisrent.ro.
      </p>
    """

    html = _get_base_email_template(title, content_html)
    return await send_brevo_email(to_email, to_name, "Axis Platform — Confirmare Actualizare Parolă", html)


async def send_fleet_security_alert_email(
    to_email: str,
    to_name: str,
    alert_type: str,
    vehicle_plate: str,
    message: str,
    ai_recommendation: Optional[str] = None
) -> Dict[str, Any]:
    """Trimite notificare de alertă de securitate flotă prin email către dispecerat"""
    map_url = f"{settings.FRONTEND_URL}/gps"
    title = f"Notificare Securitate Flotă — {vehicle_plate}"
    
    content_html = f"""
      <p style="margin: 0 0 16px 0;">
        Bună ziua,
      </p>
      <p style="margin: 0 0 18px 0;">
        A fost înregistrată o notificare operațională pentru vehiculul <strong>{vehicle_plate}</strong>.
      </p>
      <div style="background-color: #f7f7f8; border: 1px solid #e5e5e7; border-radius: 8px; padding: 16px 20px; margin: 0 0 20px 0;">
        <table width="100%" cellpadding="5" cellspacing="0" border="0" style="font-size: 13px;">
          <tr>
            <td style="color: #77777a; width: 140px;">Vehicul:</td>
            <td style="color: #111111; font-weight: 600;">{vehicle_plate}</td>
          </tr>
          <tr>
            <td style="color: #77777a;">Tip eveniment:</td>
            <td style="color: #111111; font-weight: 600;">{alert_type}</td>
          </tr>
          <tr>
            <td style="color: #77777a;">Detalii:</td>
            <td style="color: #333336;">{message}</td>
          </tr>
        </table>
      </div>
    """

    if ai_recommendation:
        content_html += f"""
          <div style="background-color: #ffffff; border: 1px solid #d0d0d4; border-radius: 8px; padding: 14px 18px; margin: 0 0 20px 0;">
            <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #77777a; font-weight: 600;">Măsură recomandată:</p>
            <p style="margin: 0; font-size: 13px; color: #111111; line-height: 1.5;">{ai_recommendation}</p>
          </div>
        """

    html = _get_base_email_template(
        title=title,
        content_html=content_html,
        action_url=map_url,
        action_text="Vizualizare Hartă GPS"
    )
    return await send_brevo_email(to_email, to_name, f"Axis Platform — Notificare Securitate {vehicle_plate}", html)


async def send_test_email(to_email: str, to_name: str) -> Dict[str, Any]:
    """Trimite un email de test pentru verificarea serviciului Brevo Transactional v3"""
    title = "Verificare Serviciu Email"
    
    content_html = f"""
      <p style="margin: 0 0 16px 0;">
        Bună ziua, <strong>{to_name}</strong>,
      </p>
      <p style="margin: 0 0 20px 0;">
        Acesta este un mesaj de test pentru confirmarea funcționării serviciului de notificări prin email pentru platforma Axis.
      </p>
      <div style="background-color: #f7f7f8; border: 1px solid #e5e5e7; border-radius: 8px; padding: 16px 18px; margin: 0 0 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #111111;">Stare Conexiune</p>
        <p style="margin: 0; font-size: 13px; color: #555558; line-height: 1.5;">
          Serviciul de email Brevo este configurat și operațional pe adresa <strong>{to_email}</strong>.
        </p>
      </div>
      <p style="margin: 0; font-size: 13px; color: #666668;">
        Toate comunicările viitoare (confirmarea creării contului, instrucțiunile de recuperare parolă și alertele operaționale) vor fi transmise în acest format.
      </p>
    """

    html = _get_base_email_template(title, content_html)
    return await send_brevo_email(to_email, to_name, "Axis Platform — Verificare Serviciu Email", html)


async def send_invitation_email(
    to_email: str,
    to_name: str,
    role: str,
    invite_code: str,
    invited_by_name: str = "Super Admin Axis"
) -> Dict[str, Any]:
    """Trimite email oficial de invitație nominală pe platforma Axis cu cod de înregistrare unic"""
    register_url = f"{settings.FRONTEND_URL}/register?code={invite_code}&email={to_email}&name={to_name}"
    title = "Invitație Cont Executiv Axis Platform"
    
    content_html = f"""
      <p style="margin: 0 0 16px 0;">
        Bună ziua, <strong>{to_name}</strong>,
      </p>
      <p style="margin: 0 0 20px 0; line-height: 1.6;">
        Ați fost invitat(ă) de către <strong>{invited_by_name}</strong> să vă alăturați echipei pe platforma <strong>Axis Mobility</strong> cu rolul de <strong>{role}</strong>.
      </p>
      
      <div style="background-color: #f7f7f8; border: 1px solid #e5e5e7; border-radius: 10px; padding: 20px; margin: 0 0 24px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size: 13px;">
          <tr>
            <td style="color: #77777a; width: 140px;">Beneficiar Invitație:</td>
            <td style="color: #111111; font-weight: 700;">{to_name}</td>
          </tr>
          <tr>
            <td style="color: #77777a;">Email Înregistrare:</td>
            <td style="color: #111111; font-weight: 600;">{to_email}</td>
          </tr>
          <tr>
            <td style="color: #77777a;">Rol Alocat:</td>
            <td style="color: #111111; font-weight: 600;">{role}</td>
          </tr>
          <tr>
            <td style="color: #77777a;">Cod Invitație Unic:</td>
            <td style="font-family: monospace; color: #2563eb; font-weight: 800; font-size: 15px; letter-spacing: 1px;">{invite_code}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fcfcfc; border-left: 3px solid #111111; padding: 12px 16px; margin: 0 0 20px 0; font-size: 12px; color: #555558; line-height: 1.5;">
        <strong>Notă de securitate:</strong> Această invitație este nominală și exclusivă. Poate fi utilizată o singură dată și este strict asociată adresei de email <strong>{to_email}</strong> și numelui <strong>{to_name}</strong>.
      </div>

      <p style="margin: 0; font-size: 13px; color: #666668; line-height: 1.5;">
        Pentru a vă activa contul și a vă stabili parola personală, accesați link-ul securizat de mai jos:
      </p>
    """

    html = _get_base_email_template(
        title=title,
        content_html=content_html,
        action_url=register_url,
        action_text="Finalizează Înregistrarea Contului"
    )
    return await send_brevo_email(to_email, to_name, f"Axis Platform — Invitație Înregistrare ({role})", html)

