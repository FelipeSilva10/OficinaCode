import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltam as variáveis de ambiente do Supabase no arquivo .env");
}

// Conexão principal (usada pelo app inteiro)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Conexão secundária (usada APENAS pelo professor para cadastrar alunos sem ser deslogado)
export const supabaseHelper = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});