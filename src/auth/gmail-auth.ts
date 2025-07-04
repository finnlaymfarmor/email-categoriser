import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.modify'
];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

export class GmailAuth {
  private oAuth2Client: OAuth2Client | null = null;

  async authenticate(): Promise<OAuth2Client> {
    if (this.oAuth2Client) {
      return this.oAuth2Client;
    }

    const credentials = await this.loadCredentials();
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    this.oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    const token = await this.getAccessToken();
    this.oAuth2Client.setCredentials(token);
    
    return this.oAuth2Client;
  }

  private async loadCredentials(): Promise<any> {
    try {
      const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error('Unable to load credentials file. Please ensure credentials.json exists.');
    }
  }

  private async getAccessToken(): Promise<any> {
    try {
      const token = fs.readFileSync(TOKEN_PATH, 'utf8');
      return JSON.parse(token);
    } catch (error) {
      return await this.getNewToken();
    }
  }

  private async getNewToken(): Promise<any> {
    if (!this.oAuth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('Authorize this app by visiting this url:', authUrl);
    console.log('Enter the code from that page here:');

    return new Promise((resolve, reject) => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('Enter authorization code: ', (code: string) => {
        rl.close();
        this.oAuth2Client!.getToken(code, (err, token) => {
          if (err) {
            reject(err);
            return;
          }
          
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
          console.log('Token stored to', TOKEN_PATH);
          resolve(token);
        });
      });
    });
  }
}