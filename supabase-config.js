// ============================================
// CONFIGURACIÓN SUPABASE - SISTEMA DE TURNOS SI-3
// ============================================

const SUPABASE_URL = 'https://oninxypovzhtlxlzincn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaW54eXBvdnpodGx4bHppbmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MDg1OTUsImV4cCI6MjA5MjM4NDU5NX0.cRWhCUO-bRVyDSJ8cIRZzO3B4e3u4vS-hehshYmXEZQ';

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
