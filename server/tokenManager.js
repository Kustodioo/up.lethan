// tokenManager.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const clientId = process.env.DROPBOX_CLIENT_ID;
const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

export async function renewAccessToken() {
  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Erro da API do Dropbox:', errorBody);
      throw new Error(`Falha ao renovar o token de acesso. Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Novo Access Token:', data.access_token);

    // Retorne o novo token para uso imediato
    return data.access_token;
  } catch (error) {
    console.error('Erro ao renovar o token de acesso:', error.message);
    throw error;
  }
}
