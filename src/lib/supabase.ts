import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Tenta ler as variáveis de ambiente com fallback para string vazia
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Log de diagnóstico (aparece no Console do navegador F12)
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase Keys não encontradas! Verifique o .env ou as configurações do Netlify.');
}

// Inicialização segura: Se as chaves faltarem, cria um cliente "dummy" para não crashar o import
// Isso evita a tela branca imediata, permitindo que a UI mostre uma mensagem de erro amigável depois.
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);