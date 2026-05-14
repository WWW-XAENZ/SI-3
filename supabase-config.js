// ============================================
// CONFIGURACIÓN SUPABASE - SISTEMA DE TURNOS SI-3
// ============================================

const SUPABASE_URL = 'https://fqhxitaiaojevernmatx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxaHhpdGFpYW9qZXZlcm5tYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MDYwODIsImV4cCI6MjA5MjM4MjA4Mn0.Da5REUnwD4d-CNjtBQ9gqC94pwUqPny4I_83lPbPIek';

// Inicializar cliente de Supabase
let supabaseClient = null;

try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
                // CORRECCIÓN: timeout y heartbeat van DENTRO de realtime
                timeout: 20000,
                heartbeatIntervalMs: 15000,
            },
            db: {
                schema: 'public'
            }
        });

        // Hacer disponible globalmente
        window.supabaseClient = supabaseClient;

        console.log('✅ Cliente Supabase inicializado correctamente');
        console.log('🔗 URL:', SUPABASE_URL);

        // Verificar conexión al inicializar
        supabaseClient.from('configuracion').select('*').limit(1)
            .then(({ error }) => {
                if (error) {
                    console.warn('⚠️ Advertencia al verificar conexion inicial:', error.message);
                } else {
                    console.log('✅ Conexion con Supabase verificada correctamente');
                }
            })
            .catch(err => console.warn('⚠️ No se pudo verificar conexion inicial:', err.message));

        // Reconexion automatica al recuperar red
        window.addEventListener('online', () => {
            console.log('🌐 Red recuperada - reconectando Supabase...');
            if (typeof Turnos !== 'undefined') {
                Turnos.cargarTurnos().catch(e => console.warn('Error al recargar tras reconexion:', e));
            }
        });

        window.addEventListener('offline', () => {
            console.warn('📵 Sin conexion a internet - operando en modo local');
        });

    } else {
        console.error('❌ Libreria de Supabase no cargada. Verifica que el script CDN este incluido.');
    }
} catch (error) {
    console.error('❌ Error al inicializar Supabase:', error);
}