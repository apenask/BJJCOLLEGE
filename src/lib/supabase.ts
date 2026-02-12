import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Tenta ler as variáveis. Se não existirem, usa valores vazios para não quebrar o site imediatamente.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log para Debug (Aperte F12 no site para ver)
console.log('Status da Conexão Supabase:', {
  URL: supabaseUrl ? 'Configurada' : '❌ VAZIA',
  KEY: supabaseKey ? 'Configurada' : '❌ VAZIA'
});

// Cria o cliente de forma segura. Se faltar a chave, ele cria um cliente "falso" que vai retornar erro na hora do uso, 
// em vez de travar o site na hora de carregar.
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key'
);