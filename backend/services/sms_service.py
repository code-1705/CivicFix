import os
import re
from dotenv import load_dotenv

load_dotenv()

def format_phone_number(phone: str) -> str:
    """
    Format phone number to E.164 standard.
    Defaults to +91 (India) if 10 digits are provided without country code.
    """
    if not phone:
        return ""
    
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if not cleaned:
        return ""

    if cleaned.startswith("+"):
        return cleaned

    # If 10 digits (e.g. 9609903555), default to +91
    if len(cleaned) == 10:
        return f"+91{cleaned}"

    # If 11 digits starting with 0
    if len(cleaned) == 11 and cleaned.startswith("0"):
        return f"+91{cleaned[1:]}"

    return f"+{cleaned}"


def send_sms(phone_number: str, message: str) -> bool:
    """
    Sends an SMS message using Twilio if configured, or prints a mock message.
    """
    if not phone_number:
        print("[SMS] Skipped: No phone number provided.")
        return False

    formatted_phone = format_phone_number(phone_number)
    enabled = os.getenv("ENABLE_TWILIO_SMS", "true").lower() == "true"
    sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    from_number = os.getenv("TWILIO_PHONE_NUMBER", "")

    is_configured = (
        enabled 
        and sid 
        and token 
        and from_number 
        and not sid.startswith("your_")
    )

    if not is_configured:
        print(f"\n[MOCK SMS TO {formatted_phone}]: {message}\n")
        return True

    print(f"\n[TWILIO SENDING] Initiating SMS to {formatted_phone} from {from_number}...")
    try:
        from twilio.rest import Client
        client = Client(sid, token)
        twilio_msg = client.messages.create(
            body=message,
            from_=from_number,
            to=formatted_phone
        )
        print(f"[TWILIO SUCCESS] Message queued! SID: {twilio_msg.sid} | Status: {twilio_msg.status}\n")
        return True
    except Exception as e:
        print(f"[TWILIO ERROR] Failed to send SMS to {formatted_phone}: {e}\n")
        return False
