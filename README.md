# 📧 Email Categorizer

An intelligent email categorization system that automatically organizes your emails using AI. Supports both Gmail and Outlook with real-time processing via webhooks or scheduled monitoring.

## ✨ Features

- 🤖 **AI-Powered Categorization** - Uses Claude AI to intelligently categorize emails
- 📊 **Action-Oriented Categories** - Organizes emails by what you need to DO, not just topics
- ⚡ **Real-time Processing** - Instant categorization via webhooks
- 🔄 **Multiple Modes** - One-time, scheduled monitoring, or real-time webhooks
- 📧 **Multi-Provider** - Supports both Gmail and Outlook/Office 365
- 🏷️ **Smart Labels** - Automatically creates and applies labels/categories
- ⚙️ **Customizable** - Easy to configure categories and behavior

## 📊 Email Categories

The system categorizes emails based on actions needed:

| Category | Description | Examples |
|----------|-------------|----------|
| **📧 To Respond** | Emails requiring your response | Questions, meeting invites, client inquiries |
| **ℹ️ FYI** | Important but no response needed | Project updates, announcements, policy changes |
| **💬 Comment** | Team collaboration notifications | Google Docs comments, Slack notifications |
| **🔔 Notification** | Automated system updates | GitHub notifications, app updates, service alerts |
| **📅 Meeting Update** | Calendar and meeting related | Zoom links, meeting reminders, schedule changes |
| **⏳ Awaiting Reply** | Expecting responses from others | Follow-ups, pending approvals |
| **✅ Actioned** | Resolved/completed threads | Task confirmations, closed tickets |
| **📈 Marketing** | Promotional content | Sales emails, cold outreach, marketing newsletters |

## 🚀 Quick Start

### 1. Installation

```bash
git clone <repository-url>
cd email-categoriser
npm install
```

### 2. Set up AI API Key

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
# Or add to .env file
```

### 3. Choose Your Email Provider

**For Gmail:**
1. Set up Google API credentials (see [Gmail Setup](#gmail-setup))
2. Place `credentials.json` in the project root

**For Outlook:**
1. Create Azure app registration (see [Outlook Setup](#outlook-setup))
2. Configure `outlook-config.json`

### 4. Configure

Edit `app-config.json`:
```json
{
  "emailProvider": "gmail",  // or "outlook"
  "maxResults": 50
}
```

### 5. Run

**One-time categorization:**
```bash
npm start
```

**Continuous monitoring:**
```bash
npm run monitor
```

**Real-time webhooks:**
```bash
npm run webhook
```

## 📧 Gmail Setup

### Prerequisites
- Google Cloud Project
- Gmail API enabled
- OAuth 2.0 credentials

### Steps

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing one

2. **Enable Gmail API**
   - Go to APIs & Services → Library
   - Search for "Gmail API" and enable it

3. **Create OAuth Credentials**
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → OAuth 2.0 Client IDs
   - Application type: Desktop application
   - Download the JSON file as `credentials.json`

4. **Place Credentials**
   ```bash
   # Place the downloaded file in project root
   mv ~/Downloads/credentials.json ./credentials.json
   ```

5. **First Run**
   ```bash
   npm start
   ```
   - Browser will open for authentication
   - Grant permissions for Gmail access
   - Token will be saved for future use

## 📧 Outlook Setup

### Prerequisites
- Microsoft account or Office 365
- Azure app registration

### Steps

1. **Create Azure App Registration**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to Azure Active Directory → App registrations
   - Click "New registration"
   - Name: "Email Categorizer"
   - Supported account types: Multitenant and personal Microsoft accounts

2. **Configure Authentication**
   - Go to Authentication
   - Add platform → Mobile and desktop applications
   - Add redirect URI: `https://login.microsoftonline.com/common/oauth2/nativeclient`
   - Enable "Allow public client flows"

3. **Set API Permissions**
   - Go to API permissions
   - Add permission → Microsoft Graph → Delegated permissions
   - Add: `Mail.Read`, `Mail.ReadWrite`, `MailboxSettings.Read`
   - Grant admin consent

4. **Configure Application**
   ```bash
   cp outlook-config.json.example outlook-config.json
   # Edit outlook-config.json with your client ID
   ```

5. **Update App Config**
   ```json
   {
     "emailProvider": "outlook"
   }
   ```

See [OUTLOOK_SETUP.md](OUTLOOK_SETUP.md) for detailed instructions.

## ⚙️ Configuration

### Basic Configuration (`app-config.json`)

```json
{
  "emailProvider": "gmail",
  "maxResults": 50,
  "monitoring": {
    "enabled": false,
    "pollInterval": 5,
    "maxEmailsPerCheck": 10,
    "logActivity": true
  },
  "webhooks": {
    "enabled": false,
    "port": 3000,
    "secret": "your-webhook-secret"
  }
}
```

### Custom Categories (`labels-config.json`)

Customize email categories by editing the generated `labels-config.json`:

```json
{
  "labels": [
    {
      "name": "custom_category",
      "prompt": "Description of when to use this category",
      "description": "Human-readable description",
      "examples": ["Example 1", "Example 2"]
    }
  ]
}
```

## 🎯 Usage Modes

### 1. One-time Processing

Process all unread emails once:

```bash
npm start
```

**Best for:** Initial setup, catching up on emails

### 2. Continuous Monitoring

Check for new emails every few minutes:

```bash
npm run monitor
```

**Best for:** Regular background processing

**Configuration:**
```json
{
  "monitoring": {
    "enabled": true,
    "pollInterval": 5,      // Check every 5 minutes
    "maxEmailsPerCheck": 10,
    "logActivity": true
  }
}
```

### 3. Real-time Webhooks

Instant processing when emails arrive:

```bash
npm run webhook
```

**Best for:** Immediate response, production use

**Setup:** See [WEBHOOK_SETUP.md](WEBHOOK_SETUP.md)

## 🔧 Advanced Features

### Environment Variables

```bash
# API Configuration
ANTHROPIC_API_KEY=your-api-key-here

# Debug Mode
DEBUG=true

# Custom Config Path
CONFIG_PATH=/path/to/custom/config.json
```

### Custom Prompts

Modify the AI categorization by editing prompts in `labels-config.json`. Each category can have:

- **prompt**: Detailed instructions for the AI
- **description**: Human-readable description
- **examples**: Example emails for this category

### Webhook Security

For production webhook deployments:

```json
{
  "webhooks": {
    "enabled": true,
    "port": 3000,
    "secret": "use-a-strong-random-secret-here"
  }
}
```

### Multiple Email Accounts

Run separate instances with different configurations:

```bash
# Account 1
CONFIG_PATH=./config-account1.json npm start

# Account 2  
CONFIG_PATH=./config-account2.json npm start
```

## 🚀 Deployment

### Local Development

```bash
npm install
npm start
```

### Production (PM2)

```bash
# Install PM2
npm install -g pm2

# Start webhook server
pm2 start "npm run webhook" --name email-categorizer

# Monitor
pm2 logs email-categorizer
pm2 monit
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "webhook"]
```

### Webhook Public Access

For webhooks in development:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run webhook

# In another terminal
ngrok http 3000
```

## 📊 Monitoring

### Logs

The application provides detailed logging:

```bash
# View logs in monitor mode
npm run monitor

# View webhook logs
npm run webhook
```

### Health Check

When running webhook mode:

```bash
curl http://localhost:3000/health
```

### Metrics

Monitor categorization effectiveness:
- Categories applied per email
- Processing time
- API usage
- Error rates

## 🛠️ Troubleshooting

### Common Issues

**Authentication Errors:**
- Check API credentials are valid
- Verify permissions are granted
- Delete token files and re-authenticate

**No Emails Processed:**
- Check email provider configuration
- Verify unread emails exist
- Check API rate limits

**Webhook Issues:**
- Ensure endpoint is publicly accessible
- Verify HTTPS for production
- Check webhook secret configuration

**Categories Not Applied:**
- Check AI API key is valid
- Verify email client permissions
- Review category prompts

### Debug Mode

Enable detailed logging:

```bash
DEBUG=true npm start
```

### Reset Authentication

```bash
# Gmail
rm token.json

# Outlook  
rm outlook-token.json

# Re-run to re-authenticate
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Microsoft Graph Documentation](https://docs.microsoft.com/en-us/graph/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Webhook Setup Guide](WEBHOOK_SETUP.md)
- [Outlook Setup Guide](OUTLOOK_SETUP.md)

## ❓ Support

- 📖 Check documentation files
- 🐛 Report issues on GitHub
- 💡 Feature requests welcome
- 📧 Questions? Create an issue

---

**Made with ❤️ and AI** - Intelligent email organization for the modern inbox.