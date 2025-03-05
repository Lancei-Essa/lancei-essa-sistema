/**
 * Script para testar a geração de URLs de autenticação OAuth
 * 
 * Como usar:
 * node test-oauth.js youtube
 * 
 * Suporta: youtube, instagram, twitter, linkedin, spotify, tiktok
 */

require('dotenv').config();
const { google } = require('googleapis');

// Cores para saída no console
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

// Testar credenciais do YouTube
const testYouTube = () => {
  console.log(colors.cyan('\n=== Testando credenciais do YouTube ==='));
  
  // Verificar variáveis de ambiente
  const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
  
  console.log(colors.cyan('Credenciais:'));
  console.log('Client ID:', clientId ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Client Secret:', clientSecret ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Redirect URI:', redirectUri ? colors.green('Configurado') : colors.red('Não configurado'));
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.log(colors.red('\nERRO: Credenciais do YouTube não estão completamente configuradas.'));
    console.log(colors.yellow('Configure as variáveis de ambiente:'));
    console.log('- YOUTUBE_CLIENT_ID / GOOGLE_CLIENT_ID');
    console.log('- YOUTUBE_CLIENT_SECRET / GOOGLE_CLIENT_SECRET');
    console.log('- YOUTUBE_REDIRECT_URI / GOOGLE_REDIRECT_URI');
    return false;
  }
  
  try {
    // Criar cliente OAuth
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    
    // Definir escopos
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];
    
    // Gerar URL de autorização
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true
    });
    
    console.log(colors.green('\nURL de autorização gerada com sucesso:'));
    console.log(colors.cyan(authUrl));
    
    console.log(colors.yellow('\nInstruções:'));
    console.log('1. Acesse a URL acima em um navegador');
    console.log('2. Faça login em sua conta do Google');
    console.log('3. Autorize o acesso ao YouTube');
    console.log('4. Você será redirecionado para sua URI de redirecionamento');
    return true;
  } catch (error) {
    console.log(colors.red('\nERRO ao gerar URL de autorização:'));
    console.log(colors.red(error.message));
    return false;
  }
};

// Testar credenciais do Instagram
const testInstagram = () => {
  console.log(colors.cyan('\n=== Testando credenciais do Instagram ==='));
  
  // Verificar variáveis de ambiente
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  
  console.log(colors.cyan('Credenciais:'));
  console.log('Client ID:', clientId ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Client Secret:', clientSecret ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Redirect URI:', redirectUri ? colors.green('Configurado') : colors.red('Não configurado'));
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.log(colors.red('\nERRO: Credenciais do Instagram não estão completamente configuradas.'));
    console.log(colors.yellow('Configure as variáveis de ambiente:'));
    console.log('- INSTAGRAM_CLIENT_ID');
    console.log('- INSTAGRAM_CLIENT_SECRET');
    console.log('- INSTAGRAM_REDIRECT_URI');
    return false;
  }
  
  try {
    // Construir URL de autorização
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code`;
    
    console.log(colors.green('\nURL de autorização gerada com sucesso:'));
    console.log(colors.cyan(authUrl));
    
    console.log(colors.yellow('\nInstruções:'));
    console.log('1. Acesse a URL acima em um navegador');
    console.log('2. Faça login em sua conta do Instagram');
    console.log('3. Autorize o acesso');
    console.log('4. Você será redirecionado para sua URI de redirecionamento');
    return true;
  } catch (error) {
    console.log(colors.red('\nERRO ao gerar URL de autorização:'));
    console.log(colors.red(error.message));
    return false;
  }
};

// Testar credenciais do Twitter
const testTwitter = () => {
  console.log(colors.cyan('\n=== Testando credenciais do Twitter ==='));
  
  // Verificar variáveis de ambiente
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const redirectUri = process.env.TWITTER_REDIRECT_URI;
  
  console.log(colors.cyan('Credenciais:'));
  console.log('API Key:', apiKey ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('API Secret:', apiSecret ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Redirect URI:', redirectUri ? colors.green('Configurado') : colors.red('Não configurado'));
  
  if (!apiKey || !apiSecret || !redirectUri) {
    console.log(colors.red('\nERRO: Credenciais do Twitter não estão completamente configuradas.'));
    console.log(colors.yellow('Configure as variáveis de ambiente:'));
    console.log('- TWITTER_API_KEY');
    console.log('- TWITTER_API_SECRET');
    console.log('- TWITTER_REDIRECT_URI');
    return false;
  }
  
  console.log(colors.yellow('\nNota: Para Twitter, você precisa usar a API OAuth 2.0.'));
  console.log(colors.yellow('Este script não pode gerar a URL completa pois requer um fluxo PKCE.'));
  console.log(colors.cyan('\nPassos manuais:'));
  console.log('1. Acesse o Twitter Developer Portal');
  console.log('2. Crie um projeto e um aplicativo OAuth 2.0');
  console.log('3. Configure a URL de callback como:', colors.green(redirectUri));
  console.log('4. Configure os escopos necessários (tweet.read, tweet.write, users.read)');
  
  return true;
};

// Testar credenciais do LinkedIn
const testLinkedIn = () => {
  console.log(colors.cyan('\n=== Testando credenciais do LinkedIn ==='));
  
  // Verificar variáveis de ambiente
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  
  console.log(colors.cyan('Credenciais:'));
  console.log('Client ID:', clientId ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Client Secret:', clientSecret ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Redirect URI:', redirectUri ? colors.green('Configurado') : colors.red('Não configurado'));
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.log(colors.red('\nERRO: Credenciais do LinkedIn não estão completamente configuradas.'));
    console.log(colors.yellow('Configure as variáveis de ambiente:'));
    console.log('- LINKEDIN_CLIENT_ID');
    console.log('- LINKEDIN_CLIENT_SECRET');
    console.log('- LINKEDIN_REDIRECT_URI');
    return false;
  }
  
  try {
    // Escopos necessários para LinkedIn
    const scope = 'r_liteprofile r_emailaddress w_member_social';
    
    // Construir URL de autorização
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=random_state_string`;
    
    console.log(colors.green('\nURL de autorização gerada com sucesso:'));
    console.log(colors.cyan(authUrl));
    
    console.log(colors.yellow('\nInstruções:'));
    console.log('1. Acesse a URL acima em um navegador');
    console.log('2. Faça login em sua conta do LinkedIn');
    console.log('3. Autorize o acesso');
    console.log('4. Você será redirecionado para sua URI de redirecionamento');
    return true;
  } catch (error) {
    console.log(colors.red('\nERRO ao gerar URL de autorização:'));
    console.log(colors.red(error.message));
    return false;
  }
};

// Testar credenciais do Spotify
const testSpotify = () => {
  console.log(colors.cyan('\n=== Testando credenciais do Spotify ==='));
  
  // Verificar variáveis de ambiente
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  
  console.log(colors.cyan('Credenciais:'));
  console.log('Client ID:', clientId ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Client Secret:', clientSecret ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Redirect URI:', redirectUri ? colors.green('Configurado') : colors.red('Não configurado'));
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.log(colors.red('\nERRO: Credenciais do Spotify não estão completamente configuradas.'));
    console.log(colors.yellow('Configure as variáveis de ambiente:'));
    console.log('- SPOTIFY_CLIENT_ID');
    console.log('- SPOTIFY_CLIENT_SECRET');
    console.log('- SPOTIFY_REDIRECT_URI');
    return false;
  }
  
  try {
    // Escopos necessários para Spotify
    const scope = 'user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private';
    
    // Construir URL de autorização
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log(colors.green('\nURL de autorização gerada com sucesso:'));
    console.log(colors.cyan(authUrl));
    
    console.log(colors.yellow('\nInstruções:'));
    console.log('1. Acesse a URL acima em um navegador');
    console.log('2. Faça login em sua conta do Spotify');
    console.log('3. Autorize o acesso');
    console.log('4. Você será redirecionado para sua URI de redirecionamento');
    return true;
  } catch (error) {
    console.log(colors.red('\nERRO ao gerar URL de autorização:'));
    console.log(colors.red(error.message));
    return false;
  }
};

// Testar credenciais do TikTok
const testTikTok = () => {
  console.log(colors.cyan('\n=== Testando credenciais do TikTok ==='));
  
  // Verificar variáveis de ambiente
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  
  console.log(colors.cyan('Credenciais:'));
  console.log('Client Key:', clientKey ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Client Secret:', clientSecret ? colors.green('Configurado') : colors.red('Não configurado'));
  console.log('Redirect URI:', redirectUri ? colors.green('Configurado') : colors.red('Não configurado'));
  
  if (!clientKey || !clientSecret || !redirectUri) {
    console.log(colors.red('\nERRO: Credenciais do TikTok não estão completamente configuradas.'));
    console.log(colors.yellow('Configure as variáveis de ambiente:'));
    console.log('- TIKTOK_CLIENT_KEY');
    console.log('- TIKTOK_CLIENT_SECRET');
    console.log('- TIKTOK_REDIRECT_URI');
    return false;
  }
  
  try {
    // Construir URL de autorização 
    // Nota: Os escopos podem variar conforme necessário
    const scopes = 'user.info.basic,video.list';
    const authUrl = `https://www.tiktok.com/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log(colors.green('\nURL de autorização gerada com sucesso:'));
    console.log(colors.cyan(authUrl));
    
    console.log(colors.yellow('\nInstruções:'));
    console.log('1. Acesse a URL acima em um navegador');
    console.log('2. Faça login em sua conta do TikTok');
    console.log('3. Autorize o acesso');
    console.log('4. Você será redirecionado para sua URI de redirecionamento');
    return true;
  } catch (error) {
    console.log(colors.red('\nERRO ao gerar URL de autorização:'));
    console.log(colors.red(error.message));
    return false;
  }
};

// Função principal
const main = () => {
  const platform = process.argv[2]?.toLowerCase();
  
  if (!platform) {
    console.log(colors.yellow('Especifique uma plataforma para testar:'));
    console.log('node test-oauth.js [plataforma]');
    console.log('Plataformas suportadas: youtube, instagram, twitter, linkedin, spotify, tiktok');
    return;
  }
  
  switch (platform) {
    case 'youtube':
      testYouTube();
      break;
    case 'instagram':
      testInstagram();
      break;
    case 'twitter':
      testTwitter();
      break;
    case 'linkedin':
      testLinkedIn();
      break;
    case 'spotify':
      testSpotify();
      break;
    case 'tiktok':
      testTikTok();
      break;
    case 'all':
      testYouTube();
      testInstagram();
      testTwitter();
      testLinkedIn();
      testSpotify();
      testTikTok();
      break;
    default:
      console.log(colors.red(`Plataforma '${platform}' não suportada.`));
      console.log(colors.yellow('Plataformas suportadas: youtube, instagram, twitter, linkedin, spotify, tiktok, all'));
  }
};

main();