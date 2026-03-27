// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================

const SUPABASE_URL = 'https://kqqjlkpwctaekyzuzdqm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VhDAjJwgcqqiEw08i4g6CA__Y5aPGbp';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Exportar para uso en otros archivos
window.supabaseClient = supabase;
