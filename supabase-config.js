// ============================================
// CONFIGURACIÓN SUPABASE - SISTEMA DE TURNOS SI-3
// ============================================

const SUPABASE_URL = 'https://xddvqwpjrfkquudljmrc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZHZxd3BqcmZrcXV1ZGxqbXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTI5OTAsImV4cCI6MjA5MjM4ODk5MH0.EfRrka_qcOIXc2XEb_1TbSLlllW9QKlMqKtxaCdg3eA';

// Inicializar cliente de Supabase
let supabaseClient = null;

try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
                // Configuración para reconexión automática
                timeout: 20000,
                heartbeatIntervalMs: 15000,
            },
            db: {
                schema: 'public'
            }
        });
        
        console.log('✅ Cliente Supabase inicializado correctamente');
        
        // Hacer disponible globalmente
        window.supabaseClient = supabaseClient;
    } else {
        console.error('❌ Librería de Supabase no cargada. Verifica que el script CDN esté incluido.');
    }
} catch (error) {
    console.error('❌ Error al inicializar Supabase:', error);
}
