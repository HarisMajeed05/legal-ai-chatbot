import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings


def send_email(to_email: str, subject: str, html_body: str):
    """Sends an email through a standard SMTP relay, configured entirely
    through environment variables, so it works with Gmail (an app password,
    not your regular password), SendGrid's SMTP relay, or any other provider
    that speaks SMTP. If SMTP is not configured, this raises clearly rather
    than failing silently, so a misconfigured deployment is obvious in the
    logs instead of just quietly never sending anything."""
    if not settings.smtp_host or not settings.smtp_user:
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, "
            "SMTP_PASSWORD, and SMTP_FROM in your .env file to enable emails."
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, [to_email], msg.as_string())


def send_password_reset_email(to_email: str, reset_link: str):
    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0b1d3a;">Reset your password</h2>
      <p>We received a request to reset the password for your Law AI Assistant account.</p>
      <p>
        <a href="{reset_link}"
           style="display:inline-block; padding: 10px 20px; background: #c9a227;
                  color: #0b1d3a; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Reset Password
        </a>
      </p>
      <p>This link expires in 30 minutes. If you did not request this, you can safely ignore this email.</p>
    </div>
    """
    send_email(to_email, "Reset your Law AI Assistant password", html)
