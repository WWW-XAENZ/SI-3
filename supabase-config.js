// ============================================
// CONFIGURACIÓN DE SUPABASE - VERSIÓN MEJORADA
// ============================================

const SUPABASE_URL = 'https://msgrypuvobpemieckghb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3J5cHV2b2JwZW1pZWNrZ2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjQzNzksImV4cCI6MjA5MDQwMDM3OX0.wLUQnslW4UigRyNi1yWduoGabAm7pGV9TuFAkrtW09s';

// Estado de la conexión
const ConnectionState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error'
};

let connectionStatus = ConnectionState.DISCONNECTED;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Verificar configuración
function verificarConfiguracion() {
    const urlValida = SUPABASE_URL && SUPABASE_URL.includes('supabase.co') && !SUPABASE_URL.includes('TU_URL');
    const keyValida = SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ') && SUPABASE_KEY.length > 100 && !SUPABASE_KEY.includes('TU_ANON_KEY');
    
    if (!urlValida || !keyValida) {
        console.warn('⚠️ ADVERTENCIA: Configura tus credenciales reales de Supabase');
        console.log('📖 Ve a: https://app.supabase.com → Tu Proyecto → Settings → API → anon public');
        console.log('⚠️ El sistema no funcionará hasta que configures tus credenciales');
        return false;
    }
    return true;
}

// Inicializar cliente de Supabase
let supabase = null;

function inicializarSupabase() {
    try {
        if (typeof window === 'undefined') {
            console.warn('⚠️ No estamos en un navegador');
            return null;
        }

        // Verificar si la librería de Supabase está cargada
        if (!window.supabase) {
            console.warn('⚠️ Librería Supabase no cargada aún. Reintentando en 1 segundo...');
            // Reintentar después de 1 segundo
            setTimeout(() => {
                supabase = inicializarSupabase();
                window.supabaseClient = supabase;
            }, 1000);
            return null;
        }

        if (!verificarConfiguracion()) {
            console.warn('⚠️ Configuración de Supabase incompleta. Verifica tus credenciales.');
            console.log('📖 Ve a: https://app.supabase.com → Tu Proyecto → Settings → API → anon public');
            // Intentar de nuevo en 2 segundos
            setTimeout(() => {
                supabase = inicializarSupabase();
                window.supabaseClient = supabase;
            }, 2000);
            return null;
        }

        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        connectionStatus = ConnectionState.CONNECTED;
        console.log('✅ Cliente de Supabase inicializado correctamente');
        return supabase;
        
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        connectionStatus = ConnectionState.ERROR;
        return null;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        supabase = inicializarSupabase();
        window.supabaseClient = supabase;
    });
} else {
    // Si el DOM ya está listo, esperar un momento para que Supabase se cargue
    setTimeout(() => {
        supabase = inicializarSupabase();
        window.supabaseClient = supabase;
    }, 500);
}

// Función para verificar la conexión con reintentos
async function verificarConexion() {
    if (!supabase) {
        console.warn('⚠️ Supabase no configurado. Verifica tus credenciales.');
        return false;
    }
    
    connectionStatus = ConnectionState.CONNECTING;
    
    try {
        const { data, error } = await supabase
            .from('configuracion')
            .select('*')
            .limit(1);
            
        if (error) {
            console.error('❌ Error al conectar con Supabase:', error.message);
            connectionStatus = ConnectionState.ERROR;
            
            // Intentar reconectar si hay error
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`🔄 Intentando reconectar (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                setTimeout(verificarConexion, RECONNECT_DELAY);
            } else {
                console.log('💡 Máximo de intentos de reconexión alcanzado');
            }
            
            return false;
        }
        
        connectionStatus = ConnectionState.CONNECTED;
        reconnectAttempts = 0; // Resetear intentos si la conexión es exitosa
        console.log('✅ Conexión con Supabase exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        connectionStatus = ConnectionState.ERROR;
        return false;
    }
}

// Función para obtener estado de conexión
function obtenerEstadoConexion() {
    return {
        status: connectionStatus,
        isConnected: connectionStatus === ConnectionState.CONNECTED,
        isConnecting: connectionStatus === ConnectionState.CONNECTING,
        hasError: connectionStatus === ConnectionState.ERROR,
        reconnectAttempts: reconnectAttempts
    };
}

// Función para forzar reconexión
async function forzarReconexion() {
    reconnectAttempts = 0;
    return await verificarConexion();
}

// Exportar funciones
window.verificarConexionSupabase = verificarConexion;
window.obtenerEstadoConexion = obtenerEstadoConexion;
window.forzarReconexion = forzarReconexion;

// Verificar conexión automáticamente después de 2 segundos
setTimeout(async () => {
    if (supabase) {
        const conectado = await verificarConexion();
        if (!conectado) {
            console.warn('⚠️ No se pudo conectar a Supabase. Verifica tu conexión y credenciales.');
        }
    } else {
        console.warn('⚠️ Supabase no inicializado. Verifica tus credenciales.');
    }
}, 2000);

// Verificar conexión periódicamente cada 30 segundos
setInterval(async () => {
    if (supabase && connectionStatus !== ConnectionState.CONNECTED) {
        await verificarConexion();
    }
}, 30000);

// Forzar reconexión si no hay conexión después de 5 segundos
setTimeout(async () => {
    if (!supabase || connectionStatus !== ConnectionState.CONNECTED) {
        console.log('🔄 Intentando reconectar a Supabase...');
        supabase = inicializarSupabase();
        window.supabaseClient = supabase;
        if (supabase) {
            await verificarConexion();
        }
    }
}, 5000);
