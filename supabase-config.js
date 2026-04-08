// ============================================
// CONFIGURACIÓN SUPABASE - SISTEMA DE TURNOS SI-3
// ============================================

// ⚠️ REEMPLAZA ESTOS VALORES CON LOS TUYOS DE SUPABASE
const SUPABASE_URL = 'https://antxwdmecfxhpyjtbbxl.supabase.co';  // Tu URL de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudHh3ZG1lY2Z4aHB5anRiYnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MDUxNDUsImV4cCI6MjA5MTE4MTE0NX0.DjIccxaUx0hJUaV2h62RSB_O2W0T0dj98hS8I70eDj8';  // Tu anon key de Supabase

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
