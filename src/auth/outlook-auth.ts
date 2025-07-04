import { PublicClientApplication, Configuration, AuthenticationResult } from '@azure/msal-node';
import fs from 'fs';
import path from 'path';

const TOKEN_PATH = path.join(process.cwd(), 'outlook-token.json');
const CONFIG_PATH = path.join(process.cwd(), 'outlook-config.json');

export interface OutlookConfig {
  clientId: string;
  authority?: string;
}

export class OutlookAuth {
  private pca: PublicClientApplication | null = null;
  private config: OutlookConfig | null = null;

  async authenticate(): Promise<string> {
    if (!this.pca) {
      await this.initialize();
    }

    try {
      const cachedToken = await this.getCachedToken();
      if (cachedToken) {
        return cachedToken;
      }
    } catch (error) {
      console.log('No cached token found, requesting new token');
    }

    return await this.getNewToken();
  }

  private async initialize(): Promise<void> {
    this.config = await this.loadConfig();
    
    const clientConfig: Configuration = {
      auth: {
        clientId: this.config.clientId,
        authority: this.config.authority || 'https://login.microsoftonline.com/organizations',
      },
      cache: {
        cacheLocation: 'filesystem'
      },
      system: {
        loggerOptions: {
          loggerCallback: (level: any, message: string) => {
            if (level <= 3) { // Log errors and warnings
              console.log('MSAL Log:', message);
            }
          },
          piiLoggingEnabled: false,
          logLevel: 3
        }
      }
    };

    this.pca = new PublicClientApplication(clientConfig);
  }

  private async loadConfig(): Promise<OutlookConfig> {
    try {
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error('Unable to load Outlook config file. Please ensure outlook-config.json exists with clientId.');
    }
  }

  private async getCachedToken(): Promise<string | null> {
    try {
      const tokenData = fs.readFileSync(TOKEN_PATH, 'utf8');
      const token = JSON.parse(tokenData);
      
      // Check if token is still valid (simple expiry check)
      const now = Date.now();
      if (token.expiresOn && now < token.expiresOn) {
        return token.accessToken;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async getNewToken(): Promise<string> {
    if (!this.pca) {
      throw new Error('PublicClientApplication not initialized');
    }

    const scopes = [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/MailboxSettings.Read'
    ];

    try {
      console.log('\n🔍 Trying device code authentication...');
      
      const deviceCodeRequest = {
        scopes: scopes,
        deviceCodeCallback: (response: any) => {
          console.log('\n🔐 To authenticate with Outlook/Office 365:');
          console.log(`1. Go to: ${response.verificationUri || response.verificationUriComplete || 'https://microsoft.com/devicelogin'}`);
          console.log(`2. Enter code: ${response.userCode || 'Code not available'}`);
          console.log('3. Sign in with your Microsoft account');
          console.log('\n⏳ Waiting for authentication...');
        }
      };

      const response = await this.pca.acquireTokenByDeviceCode(deviceCodeRequest);
      
      if (response) {
        // Save token to file
        const tokenData = {
          accessToken: response.accessToken,
          expiresOn: response.expiresOn?.getTime(),
          account: response.account
        };
        
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
        console.log('✅ Token saved to', TOKEN_PATH);
        
        return response.accessToken;
      }
      
      throw new Error('Failed to acquire token');
    } catch (error: any) {
      console.error('❌ Device code authentication failed:', error);
      
      // Try alternative manual approach
      console.log('\n🔄 Trying alternative authentication method...');
      return await this.getTokenManually();
    }
  }

  private async getTokenManually(): Promise<string> {
    const scopes = [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/MailboxSettings.Read'
    ];

    // Use organizations endpoint instead of common for single-tenant apps
    const authUrl = `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?` +
      `client_id=${this.config!.clientId}&` +
      `response_type=code&` +
      `redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `response_mode=query`;

    console.log('\n🌐 Manual Authentication Required:');
    console.log('1. Open this URL in your browser:');
    console.log(authUrl);
    console.log('\n2. After signing in, you\'ll be redirected to a page that shows an error');
    console.log('3. Copy the ENTIRE URL from your browser address bar');
    console.log('4. The URL will contain a "code=" parameter');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve, reject) => {
      rl.question('\nPaste the full redirect URL here: ', async (redirectUrl: string) => {
        rl.close();
        
        try {
          const urlParams = new URL(redirectUrl).searchParams;
          const code = urlParams.get('code');
          
          if (!code) {
            throw new Error('No authorization code found in URL');
          }
          
          console.log('✅ Authorization code received, exchanging for token...');
          
          // Exchange code for token using direct HTTP request
          const tokenResponse = await this.exchangeCodeForToken(code);
          
          // Save token
          const tokenData = {
            accessToken: tokenResponse.access_token,
            expiresOn: Date.now() + (tokenResponse.expires_in * 1000),
            refreshToken: tokenResponse.refresh_token
          };
          
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
          console.log('✅ Token saved to', TOKEN_PATH);
          
          resolve(tokenResponse.access_token);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async exchangeCodeForToken(code: string): Promise<any> {
    const https = require('https');
    const querystring = require('querystring');
    
    const postData = querystring.stringify({
      client_id: this.config!.clientId,
      scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/MailboxSettings.Read',
      code: code,
      redirect_uri: 'https://login.microsoftonline.com/common/oauth2/nativeclient',
      grant_type: 'authorization_code'
    });

    const options = {
      hostname: 'login.microsoftonline.com',
      port: 443,
      path: '/organizations/oauth2/v2.0/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(`Token exchange failed: ${response.error_description}`));
            } else {
              resolve(response);
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}