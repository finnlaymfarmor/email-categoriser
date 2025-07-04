# Outlook Integration Setup

This document explains how to set up the email categorizer to work with Outlook/Office 365.

## Prerequisites

1. An Office 365 or Outlook.com account
2. An Azure App Registration (free with any Microsoft account)

## Setup Steps

### 1. Create Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Fill in the following:
   - **Name**: Email Categorizer (or any name you prefer)
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Leave blank for now
5. Click "Register"
6. Copy the **Application (client) ID** - you'll need this

### 2. Configure App Authentication

1. In your app registration, go to "Authentication"
2. Click "Add a platform"
3. Select "Mobile and desktop applications"
4. Add this redirect URI: `https://login.microsoftonline.com/common/oauth2/nativeclient`
5. Under "Advanced settings", set "Allow public client flows" to **Yes**
6. Click "Save"

### 3. Configure App Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add these permissions:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `MailboxSettings.Read`
6. Click "Add permissions"
7. Click "Grant admin consent" (if you're an admin) or have an admin grant consent

### 4. Configure the Application

1. Copy `outlook-config.json.example` to `outlook-config.json`
2. Replace `your-azure-app-client-id-here` with your Application (client) ID
3. Save the file

### 5. Update App Configuration

1. Edit `app-config.json`
2. Change `emailProvider` from `"gmail"` to `"outlook"`
3. Save the file

Example `app-config.json`:
```json
{
  "emailProvider": "outlook",
  "maxResults": 50
}
```

### 6. Run the Application

1. Run `npm start`
2. The first time you run it, you'll be prompted to authenticate:
   - A URL will be displayed
   - Copy and paste the URL into your browser
   - Sign in with your Microsoft account
   - Enter the code displayed in the terminal
3. Your authentication token will be saved for future runs

## Configuration Files

- `app-config.json` - Main application configuration
- `outlook-config.json` - Outlook-specific configuration (Azure app details)
- `outlook-token.json` - Authentication token (auto-generated)

## Troubleshooting

### Authentication Issues

- Make sure your Azure app has the correct permissions
- Check that admin consent has been granted
- Ensure the client ID in `outlook-config.json` matches your Azure app

### Permission Errors

- Verify all required Graph API permissions are added
- Make sure consent has been granted for the permissions
- Try deleting `outlook-token.json` and re-authenticating

### Rate Limiting

- The application includes delays between API calls to respect rate limits
- If you encounter rate limit errors, the delays may need to be increased

## Features

When using Outlook integration:

- **Categories**: Outlook uses categories instead of labels
- **Color Support**: Basic color preset support for categories
- **Filtering**: Same email categorization logic as Gmail
- **Bulk Operations**: Support for applying categories to multiple emails

## Switching Back to Gmail

To switch back to Gmail:

1. Edit `app-config.json`
2. Change `emailProvider` back to `"gmail"`
3. Save the file
4. Run `npm start`

The application will automatically use the Gmail integration.