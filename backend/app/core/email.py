import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr

# Email Configuration
is_testing = os.getenv("TESTING", "false").lower() == "true"

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@headhunter.ai"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=not is_testing, # Disable credentials check in testing
    VALIDATE_CERTS=True,
    SUPPRESS_SEND=1 if is_testing else 0
)

async def send_verification_email(email: EmailStr, token: str):
    """
    Sends a verification email with the given token.
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:30004")
    verification_url = f"{frontend_url}/verify?token={token}"
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4F46E5;">Welcome to Headhunter!</h2>
        <p>Please verify your email address to access your account.</p>
        <div style="margin: 30px 0;">
            <a href="{verification_url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p style="color: #666; font-size: 12px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">{verification_url}</p>
        <p style="margin-top: 30px; font-size: 12px; color: #999;">If you didn't create an account, you can ignore this email.</p>
    </div>
    """

    message = MessageSchema(
        subject="Headhunter - Verify your email",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)


async def send_interview_notification(
    interviewer_email: str,
    interviewer_name: str,
    candidate_name: str,
    job_title: str,
    interview_stage: str,
    scheduled_at: str,
    scheduled_by: str,
    candidate_email: str = None,
    recruiter_email: str = None,
    department_manager_email: str = None,
    scheduler_name: str = None,
    cv_path: str = None,
    is_cancellation: bool = False
):
    """
    Sends an email notification to an interviewer (and others) when an interview is scheduled or canceled.
    Includes an ICS calendar attachment for universal calendar support.
    """
    import uuid
    from datetime import datetime, timedelta, timezone
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:30004")
    dashboard_url = f"{frontend_url}/interviews"
    
    # Determine Status and Method
    ics_method = "CANCEL" if is_cancellation else "REQUEST"
    ics_status = "CANCELLED" if is_cancellation else "CONFIRMED"
    email_subject_prefix = "Canceled: " if is_cancellation else "Interview Scheduled: "
    header_color = "#EF4444" if is_cancellation else "#4F46E5" # Red for cancel, Indigo for schedule
    header_text = "🚫 Interview Canceled" if is_cancellation else "📅 New Interview Scheduled"
    intro_text = "The following interview has been <b>CANCELED</b>." if is_cancellation else "You have been assigned to conduct an interview. A calendar invitation is attached."
    
    # Parse the scheduled time
    try:
        dt = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
        formatted_date = dt.strftime("%A, %B %d, %Y at %I:%M %p")
        # Format for ICS (UTC format)
        dt_start = dt.strftime("%Y%m%dT%H%M%SZ")
        # Default interview duration: 1 hour
        dt_end = (dt + timedelta(hours=1)).strftime("%Y%m%dT%H%M%SZ")
    except Exception:
        formatted_date = scheduled_at
        dt_start = None
        dt_end = None
    
    # Generate ICS calendar content
    ics_path = None
    if dt_start and dt_end:
        event_uid = str(uuid.uuid4())
        
        # Build Attendees List
        attendees = ""
        # Mandatory: Interviewer (Now added as attendee since Scheduler is Organizer)
        attendees += f"ATTENDEE;CN=\"{interviewer_name}\";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{interviewer_email}\n"
        # Mandatory: Candidate
        if candidate_email:
             attendees += f"ATTENDEE;CN=\"{candidate_name}\";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{candidate_email}\n"
        # Optional: Recruiter
        if recruiter_email:
             attendees += f"ATTENDEE;CN=\"Recruiter\";ROLE=OPT-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{recruiter_email}\n"
        # Optional: Department Manager
        if department_manager_email:
             attendees += f"ATTENDEE;CN=\"Department Manager\";ROLE=OPT-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{department_manager_email}\n"

        # Organizer is the person who created the interview
        organizer_cn = scheduler_name or scheduled_by
        organizer_email = scheduled_by

        ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Headhunter ATS//Interview Scheduler//EN
CALSCALE:GREGORIAN
METHOD:{ics_method}
BEGIN:VEVENT
UID:{event_uid}
DTSTAMP:{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")}
DTSTART:{dt_start}
DTEND:{dt_end}
SUMMARY:{email_subject_prefix}{candidate_name} - {interview_stage}
DESCRIPTION:Interview with {candidate_name} for {job_title} position.\\n\\nStage: {interview_stage}\\nScheduled by: {scheduled_by}\\n\\nView in Headhunter: {dashboard_url}
LOCATION:Video Call / TBD
ORGANIZER;CN="{organizer_cn}":mailto:{organizer_email}
{attendees}STATUS:{ics_status}
SEQUENCE:1
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Interview with {candidate_name} in 15 minutes
TRIGGER:-PT15M
END:VALARM
END:VEVENT
END:VCALENDAR"""

        # Save to temp file
        try:
            filename = f"interview_{event_uid}.ics"
            ics_path = f"/tmp/{filename}"
            with open(ics_path, "w") as f:
                f.write(ics_content)
        except Exception as e:
            print(f"Failed to create ICS file: {e}")
            ics_path = None
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: {header_color};">{header_text}</h2>
        <p>Hi {interviewer_name or 'there'},</p>
        <p>{intro_text}</p>
        
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 120px;">Candidate</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">{candidate_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Position</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">{job_title}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Stage</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b;">{interview_stage}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Scheduled For</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #4F46E5;">{formatted_date}</td>
                </tr>
            </table>
        </div>
        
        <p style="color: #666;">Scheduled by: {scheduled_by}</p>
        
        <div style="margin: 30px 0;">
            <a href="{dashboard_url}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Headhunter</a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #999;">This is an automated notification from Headhunter ATS.</p>
    </div>
    """

    # Note: ICS attachment with method=REQUEST triggers the calendar UI in email clients
    
    # Collect all recipients
    all_recipients = {interviewer_email}
    if candidate_email:
        all_recipients.add(candidate_email)
    if recruiter_email:
        all_recipients.add(recruiter_email)
    if department_manager_email:
        all_recipients.add(department_manager_email)

    # Attachments list
    attachments = []
    temp_cv_path = None
    
    if ics_path:
        attachments.append(ics_path)
    
    if cv_path and os.path.exists(cv_path) and not is_cancellation:
        # User requested renaming to "Candidate Name.pdf"
        # We try to honor this, but if it's strictly DOCX, renaming to PDF might break it.
        # However, for now, we will assume the user knows it's a PDF or wants the rename.
        # Ideally, we should check mime type.
        
        # Sanitize candidate name for filename
        import re
        import shutil
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', candidate_name)
        
        # Check original extension
        _, ext = os.path.splitext(cv_path)
        if not ext:
            ext = ".pdf" # Default to pdf if missing
            
        # If user explicitly asked for .pdf and not .docx, and the file is .docx
        # We can't convert easily without tools.
        # We will use the original extension for safety, unless it's missing.
        # Update: User request "rename ... .pdf and not docx"
        # We will use .pdf if the original is .pdf, otherwise update to CandidateName.ext
        
        new_filename = f"{safe_name}{ext}"
        temp_cv_path = f"/tmp/{new_filename}"
        
        try:
            shutil.copy(cv_path, temp_cv_path)
            attachments.append(temp_cv_path)
        except Exception as e:
            print(f"Failed to rename CV: {e}")
            # Fallback to original path if copy fails
            attachments.append(cv_path)

    message = MessageSchema(
        subject=f"{email_subject_prefix}{candidate_name} - {interview_stage}",
        recipients=list(all_recipients),
        body=html,
        subtype=MessageType.html,
        attachments=attachments,
        headers={
            "Content-Type": f"text/calendar; method={ics_method}; charset=UTF-8",
            "Content-Disposition": "inline; filename=invite.ics"
        }
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
    finally:
        # Cleanup temp file
        if ics_path and os.path.exists(ics_path):
            try:
                os.remove(ics_path)
            except:
                pass
        if temp_cv_path and os.path.exists(temp_cv_path):
            try:
                os.remove(temp_cv_path)
            except:
                pass


async def send_password_reset_email(email: EmailStr, token: str, user_name: str = "User"):
    """Sends a password reset email with a secure reset link."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:30004")
    reset_url = f"{frontend_url}/reset-password?token={token}"
    
    html = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 16px;">
        <div style="background: white; border-radius: 12px; padding: 40px;">
            <h1 style="color: #667eea; text-align: center; font-size: 28px;">🔐 Password Reset</h1>
            <p style="color: #333; font-size: 16px;">Hi {user_name},</p>
            <p style="color: #666; font-size: 15px;">We received a request to reset your password. Click the button below:</p>
            <div style="text-align: center; margin: 35px 0;">
                <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
            </div>
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #666; font-size: 13px;"><strong>⏱️ This link expires in 1 hour</strong></p>
            </div>
            <p style="color: #999; font-size: 13px; margin-top: 25px;">Didn't request this? You can safely ignore this email.</p>
        </div>
    </div>
    """

    message = MessageSchema(
        subject="Reset Your Password - Headhunter",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)


async def send_team_invite_email(email: EmailStr, token: str, sender_name: str, company_name: str, role: str):
    """
    Sends an invitation email to a new team member.
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:30004")
    # Using /reset-password for now as it sets the password, effectively activating the account
    # In the future we might want a dedicated /join endpoint
    invite_url = f"{frontend_url}/reset-password?token={token}&type=invite"
    
    html = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 10px;">You've been invited!</h1>
            <p style="color: #64748b; font-size: 16px;"><strong>{sender_name}</strong> has invited you to join <strong>{company_name}</strong> on Headhunter.</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 14px; margin-bottom: 8px;">Role</p>
            <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600;">{role.replace('_', ' ').title()}</p>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
            <a href="{invite_url}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; text-align: center;">
            This link will expire in 48 hours. If you were not expecting this invitation, you can ignore this email.
        </p>
    </div>
    """

    message = MessageSchema(
        subject=f"Join {company_name} on Headhunter",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)
