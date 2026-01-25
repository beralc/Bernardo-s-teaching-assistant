# Email Templates for Supabase

All email templates for Bernardo's English Helper. Apply these in Supabase Dashboard → Authentication → Email Templates.

---

## 1. CONFIRM SIGNUP

**Template Name:** Confirm signup
**Subject:** Confirm Your Email - Welcome to Bernardo's English Helper!

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Email - Bernardo's English Helper</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background-color: rgba(255, 255, 255, 0.2); border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 48px; font-weight: 900; color: white;">A</span>
                            </div>
                            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800;">Bernardo's English Helper</h1>
                            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 18px;">Practice English with confidence</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 50px 40px;">
                            <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 28px; font-weight: 700; text-align: center;">
                                Welcome! 🎉
                            </h2>

                            <p style="margin: 0 0 30px; color: #4b5563; font-size: 18px; line-height: 1.6; text-align: center;">
                                We're excited to have you join our community of English learners!
                            </p>

                            <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                                To get started with your English practice journey, please confirm your email address by clicking the button below:
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 40px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 18px 50px; background-color: #10b981; color: white; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                                            Confirm My Email ✓
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link -->
                            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 30px 0;">
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-weight: 600;">
                                    Button not working?
                                </p>
                                <p style="margin: 0; color: #9ca3af; font-size: 13px; word-break: break-all; line-height: 1.5;">
                                    Copy and paste this link:<br>
                                    <a href="{{ .ConfirmationURL }}" style="color: #10b981;">{{ .ConfirmationURL }}</a>
                                </p>
                            </div>

                            <!-- What's Next -->
                            <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
                                <h3 style="margin: 0 0 20px; color: #1f2937; font-size: 20px; font-weight: 700;">
                                    What's next?
                                </h3>
                                <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 15px; line-height: 1.8;">
                                    <li>Complete your profile with your learning goals</li>
                                    <li>Start practicing with our AI English teacher</li>
                                    <li>Track your progress and improve every day</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">
                                This link will expire in 24 hours for security reasons.
                            </p>
                            <p style="margin: 0 0 15px; color: #9ca3af; font-size: 13px;">
                                If you didn't create an account, you can safely ignore this email.
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                                Happy learning! 📚<br>
                                <span style="color: #10b981;">Bernardo's English Helper Team</span>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## 2. INVITE USER

**Template Name:** Invite user
**Subject:** You've Been Invited to Bernardo's English Helper!

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">

                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800;">You're Invited! 🎉</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 50px 40px;">
                            <p style="margin: 0 0 30px; color: #4b5563; font-size: 18px; line-height: 1.6;">
                                You've been invited to join <strong>Bernardo's English Helper</strong> - a safe and friendly space to practice speaking English at your own pace.
                            </p>

                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 40px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 18px 50px; background-color: #10b981; color: white; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 30px 0;">
                                <p style="margin: 0; color: #9ca3af; font-size: 13px; word-break: break-all;">
                                    Or copy this link:<br>
                                    <a href="{{ .ConfirmationURL }}" style="color: #10b981;">{{ .ConfirmationURL }}</a>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                                This invitation expires in 24 hours.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## 3. MAGIC LINK

**Template Name:** Magic Link
**Subject:** Your Magic Link to Sign In

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">

                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800;">Sign In to Your Account</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 50px 40px;">
                            <p style="margin: 0 0 30px; color: #4b5563; font-size: 18px; line-height: 1.6;">
                                Click the button below to sign in to <strong>Bernardo's English Helper</strong>:
                            </p>

                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 40px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 18px 50px; background-color: #10b981; color: white; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                                            Sign In Now
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 30px 0;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
                                    ⚠️ Security Notice
                                </p>
                                <p style="margin: 10px 0 0; color: #78350f; font-size: 13px;">
                                    This link expires in 60 minutes. If you didn't request this, please ignore this email.
                                </p>
                            </div>

                            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 30px 0;">
                                <p style="margin: 0; color: #9ca3af; font-size: 13px; word-break: break-all;">
                                    Or copy this link:<br>
                                    <a href="{{ .ConfirmationURL }}" style="color: #10b981;">{{ .ConfirmationURL }}</a>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                <span style="color: #10b981; font-weight: 600;">Bernardo's English Helper</span>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## 4. CHANGE EMAIL ADDRESS

**Template Name:** Change Email Address
**Subject:** Confirm Your New Email Address

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">

                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800;">Email Change Request</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 50px 40px;">
                            <p style="margin: 0 0 30px; color: #4b5563; font-size: 18px; line-height: 1.6;">
                                You requested to change your email address for <strong>Bernardo's English Helper</strong>.
                            </p>

                            <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                                Please confirm this change by clicking the button below:
                            </p>

                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 40px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 18px 50px; background-color: #10b981; color: white; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                                            Confirm New Email
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 30px 0;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
                                    ⚠️ Important
                                </p>
                                <p style="margin: 10px 0 0; color: #78350f; font-size: 13px;">
                                    If you didn't request this change, please ignore this email and contact support immediately.
                                </p>
                            </div>

                            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 30px 0;">
                                <p style="margin: 0; color: #9ca3af; font-size: 13px; word-break: break-all;">
                                    Or copy this link:<br>
                                    <a href="{{ .ConfirmationURL }}" style="color: #10b981;">{{ .ConfirmationURL }}</a>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                                This link expires in 24 hours.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## 5. RESET PASSWORD

**Template Name:** Reset Password
**Subject:** Reset Your Password - Bernardo's English Helper

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">

                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800;">Reset Your Password</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 50px 40px;">
                            <p style="margin: 0 0 30px; color: #4b5563; font-size: 18px; line-height: 1.6;">
                                We received a request to reset your password for <strong>Bernardo's English Helper</strong>.
                            </p>

                            <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                                Click the button below to create a new password:
                            </p>

                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 40px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 18px 50px; background-color: #10b981; color: white; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 15px; margin: 30px 0;">
                                <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                                    🔒 Security Notice
                                </p>
                                <p style="margin: 10px 0 0; color: #7f1d1d; font-size: 13px;">
                                    This link expires in 60 minutes. If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                                </p>
                            </div>

                            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 30px 0;">
                                <p style="margin: 0; color: #9ca3af; font-size: 13px; word-break: break-all;">
                                    Or copy this link:<br>
                                    <a href="{{ .ConfirmationURL }}" style="color: #10b981;">{{ .ConfirmationURL }}</a>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px;">
                                Need help? Contact us at bernardm@ucm.es
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                <span style="color: #10b981; font-weight: 600;">Bernardo's English Helper</span>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## 6. REAUTHENTICATION

**Template Name:** Reauthentication
**Subject:** Confirm Your Identity - Bernardo's English Helper

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">

                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800;">Identity Verification Required</h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 50px 40px;">
                            <p style="margin: 0 0 30px; color: #4b5563; font-size: 18px; line-height: 1.6;">
                                For security purposes, we need to verify your identity before proceeding with this action.
                            </p>

                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 40px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 18px 50px; background-color: #10b981; color: white; text-decoration: none; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                                            Verify My Identity
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 30px 0;">
                                <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                                    ℹ️ Why am I seeing this?
                                </p>
                                <p style="margin: 10px 0 0; color: #1e3a8a; font-size: 13px;">
                                    This additional verification step helps keep your account secure when making sensitive changes.
                                </p>
                            </div>

                            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 30px 0;">
                                <p style="margin: 0; color: #9ca3af; font-size: 13px; word-break: break-all;">
                                    Or copy this link:<br>
                                    <a href="{{ .ConfirmationURL }}" style="color: #10b981;">{{ .ConfirmationURL }}</a>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                                This link expires in 15 minutes for security.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## How to Apply These Templates

1. Go to **Supabase Dashboard**
2. Click **Authentication** → **Email Templates**
3. Select the template you want to update (e.g., "Confirm signup")
4. Copy the HTML code from above
5. Paste it into the template editor
6. Click **Save**
7. Repeat for all 6 templates

---

## Important Settings to Configure

### 1. Site URL (for confirmation links)
**Location:** Supabase → Authentication → URL Configuration
**Set to:** `https://bernardo-s-teaching-assistant.vercel.app`

### 2. Redirect URLs (whitelist)
**Location:** Supabase → Authentication → URL Configuration → Redirect URLs
**Add:** `https://bernardo-s-teaching-assistant.vercel.app/**`

### 3. Sender Name (Pro plan only)
**Location:** Supabase → Settings → Custom SMTP
**Current (Free tier):** Supabase <noreply@mail.app.supabase.io>
**Custom (Pro tier):** Bernardo's English Helper <hello@yourdomain.com>

---

## Template Variables Available

All templates can use these Supabase variables:

- `{{ .ConfirmationURL }}` - The confirmation/action link
- `{{ .Token }}` - The verification token (rarely used directly)
- `{{ .TokenHash }}` - Hashed token (rarely used)
- `{{ .SiteURL }}` - Your configured site URL
- `{{ .Email }}` - User's email address (in some templates)

Always use `{{ .ConfirmationURL }}` for action buttons - it includes all necessary parameters.
