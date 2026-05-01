import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY")
SENDING_DOMAIN = os.getenv("SENDING_DOMAIN", "vritas.com")

def send_invite_email(to_email: str, invite_link: str, role: str, org_name: str):
    try:
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f1117; color: #f1f5f9; padding: 30px; border-radius: 10px;">
            <h2 style="color: #34d399; margin-bottom: 20px;">Welcome to Vritas RBQM</h2>
            <p>You have been invited to join <strong>{org_name}</strong> as a <strong>{role.replace('_', ' ').title()}</strong>.</p>
            <p style="margin: 30px 0;">
                <a href="{invite_link}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
            </p>
            <p style="color: #94a3b8; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #64748b; font-size: 12px; word-break: break-all;">{invite_link}</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0;" />
            <p style="color: #64748b; font-size: 12px;">This invitation will expire in 72 hours.</p>
        </div>
        """
        
        response = resend.Emails.send({
            "from": f"Vritas <noreply@{SENDING_DOMAIN}>",
            "to": to_email,
            "subject": f"Invitation to join Vritas RBQM - {org_name}",
            "html": html_content
        })
        print(f"RESEND SUCCESS: {response}")
        return response
    except Exception as e:
        import traceback
        print(f"RESEND ERROR SENDING INVITE: {str(e)}")
        print(traceback.format_exc())
        return None

def send_password_reset_email(to_email: str, reset_link: str):
    try:
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f1117; color: #f1f5f9; padding: 30px; border-radius: 10px;">
            <h2 style="color: #34d399; margin-bottom: 20px;">Password Reset Request</h2>
            <p>We received a request to reset your password for your Vritas RBQM account.</p>
            <p style="margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </p>
            <p style="color: #94a3b8; font-size: 14px;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0;" />
            <p style="color: #64748b; font-size: 12px;">This link will expire in 1 hour.</p>
        </div>
        """
        
        response = resend.Emails.send({
            "from": f"Vritas Security <security@{SENDING_DOMAIN}>",
            "to": to_email,
            "subject": "Reset your Vritas RBQM password",
            "html": html_content
        })
        return response
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return None
