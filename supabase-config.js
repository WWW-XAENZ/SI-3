// ============================================
// CONFIGURACIÓN SUPABASE - SISTEMA DE TURNOS SI-3
// ============================================

// ⚠️ REEMPLAZA ESTOS VALORES CON LOS TUYOS DE SUPABASE
const SUPABASE_URL = 'https://phrphswueqytjkmavvnd.supabase.co';  // Tu URL de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBocnBoc3d1ZXF5dGprbWF2dm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTM5NTYsImV4cCI6MjA5MDQ2OTk1Nn0.BHCz8SFMadxkOM1jHJyuADeE02y20xcMCK_khJuuHDw';  // Tu anon key de Supabase

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
