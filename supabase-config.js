// ============================================
// CONFIGURACIÓN SUPABASE - SISTEMA DE TURNOS SI-3
// ============================================

// ⚠️ REEMPLAZA ESTOS VALORES CON LOS TUYOS DE SUPABASE
const SUPABASE_URL = 'https://mybeuidevotlhqgmswaw.supabase.co';  // Tu URL de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YmV1aWRldm90bGhxZ21zd2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzI2OTksImV4cCI6MjA5MDQwODY5OX0.d0zrhvnD_wj9bn08FbsbPm0BPBh14grsPdK062K6OlY';  // Tu anon key de Supabase

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