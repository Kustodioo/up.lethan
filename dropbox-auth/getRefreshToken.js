import fetch from 'node-fetch';

const clientId = 'f5zlq1fqztm4sa4';
const clientSecret = 'ixzzebjn9hjexgv';
const code = 'm1yTOeViADMAAAAAAAAATZ6fDOIlyK0d5Htr-OCKxl4'; // Substitua pelo novo código de autorização obtido
const redirectUri = 'http://localhost/';

async function getRefreshToken() {
  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const responseBody = await response.text();
    console.log('Resposta da API do Dropbox:', responseBody);

    if (!response.ok) {
      console.error('Erro da API do Dropbox:', responseBody);
      throw new Error(`Falha ao obter o refresh token. Status: ${response.status}`);
    }

    const data = JSON.parse(responseBody);
    if (data.refresh_token) {
      console.log('Refresh Token:', data.refresh_token);
    } else {
      console.log('A resposta não contém um refresh token. Verifique a configuração do aplicativo no Dropbox.');
    }
  } catch (error) {
    console.error('Erro ao obter o refresh token:', error.message);
  }
}

getRefreshToken().catch(console.error);
