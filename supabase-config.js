// ============================================
// CONFIGURACIÓN SUPABASE - SISTEMA DE TURNOS SI-3
// ============================================

const SUPABASE_URL = 'https://cdohcrjqjziajkedshuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkb2hjcmpxanppYWprZWRzaHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MjA3MDEsImV4cCI6MjA5NTk5NjcwMX0.Cf4EqEN5BxSNiArdEWdxPCKzVKDy92t4PAi_Eg3MUi0';

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

        // Reintento de conexion si falla la inicializacion
        let intentosReconexion = 0;
        const MAX_INTENTOS = 10;
        
        async function reintentarConexion() {
            if (intentosReconexion >= MAX_INTENTOS) {
                console.warn('⚠️ Se agotaron los intentos de reconexion con Supabase');
                return;
            }
            
            intentosReconexion++;
            console.log(`🔄 Reintentando conexion con Supabase... (${intentosReconexion}/${MAX_INTENTOS})`);
            
            try {
                const { error } = await supabaseClient
                    .from('configuracion')
                    .select('*')
                    .limit(1);
                
                if (!error) {
                    console.log('✅ Conexion con Supabase restablecida');
                    intentosReconexion = 0;
                    if (typeof Turnos !== 'undefined') {
                        Turnos.cargarTurnos().catch(e => console.warn('Error al recargar tras reconexion:', e));
                    }
                } else {
                    console.warn('⚠️ Error en reconexion:', error.message);
                    setTimeout(reintentarConexion, 3000);
                }
            } catch (e) {
                console.warn('⚠️ Error en reconexion:', e.message);
                setTimeout(reintentarConexion, 3000);
            }
        }

        // Verificar conexion periodicamente
        setInterval(async () => {
            if (!window.supabaseClient) return;
            try {
                const { error } = await window.supabaseClient
                    .from('configuracion')
                    .select('*')
                    .limit(1);
                
                if (error) {
                    console.warn('⚠️ Conexion perdida, reintentando...');
                    reintentarConexion();
                }
            } catch (e) {
                console.warn('⚠️ Error verificando conexion:', e.message);
                reintentarConexion();
            }
        }, 30000);

    } else {
        console.error('❌ Libreria de Supabase no cargada. Verifica que el script CDN este incluido.');
    }
} catch (error) {
    console.error('❌ Error al inicializar Supabase:', error);
}