# Webhook Setup Guide

This guide explains how to set up real-time email categorization using webhooks instead of polling. Webhooks are more efficient and provide instant categorization when emails arrive.

## 🚀 Quick Start

### 1. Enable Webhooks

Edit `app-config.json`:

```json
{
  "emailProvider": "outlook",
  "webhooks": {
    "enabled": true,
    "port": 3000,
    "secret": "your-webhook-secret-here"
  }
}
```

### 2. Start Webhook Server

```bash
npm run webhook
```

Your webhook server will be available at `http://localhost:3000`

## 📧 Gmail Webhooks (Google Cloud Pub/Sub)

Gmail uses Google Cloud Pub/Sub for push notifications.

### Prerequisites

1. **Google Cloud Project** with Gmail API enabled
2. **Pub/Sub API** enabled
3. **Service Account** with appropriate permissions

### Setup Steps

1. **Create Pub/Sub Topic**
   ```bash
   gcloud pubsub topics create email-categorizer-topic
   ```

2. **Create Push Subscription**
   ```bash
   gcloud pubsub subscriptions create email-categorizer-sub \
     --topic=email-categorizer-topic \
     --push-endpoint=https://your-domain.com/webhooks/gmail
   ```

3. **Configure Gmail Watch**
   
   Add this to your Gmail client or call the API directly:
   ```javascript
   gmail.users.watch({
     userId: 'me',
     resource: {
       labelIds: ['INBOX'],
       topicName: 'projects/your-project-id/topics/email-categorizer-topic'
     }
   });
   ```

4. **Update Configuration**
   ```json
   {
     "emailProvider": "gmail",
     "webhooks": {
       "enabled": true,
       "port": 3000,
       "gmailTopic": "projects/your-project-id/topics/email-categorizer-topic",
       "secret": "your-webhook-secret"
     }
   }
   ```

### Gmail Webhook Flow

1. New email arrives in Gmail
2. Gmail publishes message to Pub/Sub topic
3. Pub/Sub delivers webhook to your endpoint
4. Email categorizer processes the notification
5. Categories are applied automatically

## 📧 Outlook Webhooks (Microsoft Graph)

Outlook uses Microsoft Graph webhook subscriptions.

### Prerequisites

1. **Azure App Registration** with Microsoft Graph permissions
2. **Public HTTPS endpoint** (use ngrok for testing)
3. **MailboxSettings.ReadWrite** permission

### Setup Steps

1. **Make Endpoint Public**
   
   For development, use ngrok:
   ```bash
   # Install ngrok
   npm install -g ngrok
   
   # Start your webhook server
   npm run webhook
   
   # In another terminal, expose it publicly
   ngrok http 3000
   ```
   
   Note the HTTPS URL (e.g., `https://abc123.ngrok.io`)

2. **Update Configuration**
   ```json
   {
     "emailProvider": "outlook",
     "webhooks": {
       "enabled": true,
       "port": 3000,
       "secret": "your-webhook-secret",
       "outlookValidationToken": "random-validation-token"
     }
   }
   ```

3. **Create Subscription**
   
   The webhook server will attempt to create subscriptions automatically, or you can create them manually:
   
   ```bash
   curl -X POST https://graph.microsoft.com/v1.0/subscriptions \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "changeType": "created",
       "notificationUrl": "https://your-ngrok-url.ngrok.io/webhooks/outlook",
       "resource": "/me/messages",
       "expirationDateTime": "2025-07-07T18:00:00.0000000Z",
       "clientState": "your-webhook-secret"
     }'
   ```

### Outlook Webhook Flow

1. New email arrives in Outlook
2. Microsoft Graph sends webhook notification
3. Your webhook endpoint receives the notification
4. Email categorizer processes new emails
5. Categories are applied automatically

## 🔧 Advanced Configuration

### Security

Always use HTTPS in production and set a webhook secret:

```json
{
  "webhooks": {
    "enabled": true,
    "port": 3000,
    "secret": "use-a-strong-random-secret-here"
  }
}
```

### Custom Ports

If port 3000 is in use:

```json
{
  "webhooks": {
    "enabled": true,
    "port": 8080
  }
}
```

### Production Deployment

For production, consider:

1. **Reverse Proxy** (nginx/Apache)
2. **SSL Certificate** (Let's Encrypt)
3. **Process Manager** (PM2)
4. **Logging** and monitoring

Example PM2 configuration:
```bash
pm2 start "npm run webhook" --name email-categorizer-webhook
```

## 🔍 Testing Webhooks

### Test Endpoints

Your webhook server exposes these endpoints:

- `GET /health` - Health check
- `POST /webhooks/gmail` - Gmail notifications
- `POST /webhooks/outlook` - Outlook notifications
- `GET /webhooks/outlook` - Outlook validation

### Manual Testing

Test webhook endpoint:
```bash
curl -X POST http://localhost:3000/webhooks/outlook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

Check health:
```bash
curl http://localhost:3000/health
```

## 🐛 Troubleshooting

### Common Issues

1. **"Port already in use"**
   - Change the port in `app-config.json`
   - Or kill the process using the port

2. **"Webhook validation failed"**
   - Ensure your endpoint is publicly accessible
   - Check SSL certificate for HTTPS
   - Verify webhook secret matches

3. **"No notifications received"**
   - Check subscription is active
   - Verify webhook URL is correct
   - Test endpoint manually

4. **Gmail Pub/Sub Issues**
   - Verify topic permissions
   - Check service account credentials
   - Ensure Gmail API watch is active

5. **Outlook Subscription Expires**
   - Subscriptions expire (max 3 days)
   - Implement renewal logic
   - Monitor subscription status

### Logs and Monitoring

Enable detailed logging by setting `logActivity: true` in monitoring config:

```json
{
  "monitoring": {
    "logActivity": true
  }
}
```

## 📊 Monitoring

### Subscription Management

List active Outlook subscriptions:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://graph.microsoft.com/v1.0/subscriptions
```

### Webhook Metrics

Monitor webhook performance:
- Response times
- Success/error rates
- Email processing volume

## 🔄 Migration from Polling

To migrate from polling mode to webhooks:

1. Stop the monitor: `Ctrl+C` in monitor terminal
2. Update `app-config.json` to enable webhooks
3. Set up webhook endpoints (Gmail/Outlook)
4. Start webhook server: `npm run webhook`

## 🆚 Comparison: Polling vs Webhooks

| Feature | Polling (`npm run monitor`) | Webhooks (`npm run webhook`) |
|---------|----------------------------|------------------------------|
| **Latency** | 1-15 minutes | Instant (seconds) |
| **Efficiency** | High API usage | Low API usage |
| **Setup** | Simple | Complex (public endpoint) |
| **Reliability** | Good | Excellent |
| **Cost** | Higher API calls | Lower API calls |
| **Development** | Easy testing | Requires ngrok/tunneling |

## 📚 References

- [Gmail Push Notifications](https://developers.google.com/gmail/api/guides/push)
- [Microsoft Graph Webhooks](https://learn.microsoft.com/en-us/graph/webhooks)
- [ngrok Documentation](https://ngrok.com/docs)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)

---

**Need help?** Check the troubleshooting section or create an issue in the repository.