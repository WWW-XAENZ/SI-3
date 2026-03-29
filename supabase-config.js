// ============================================
// CONFIGURACIÓN DE SUPABASE - VERSIÓN MEJORADA
// ============================================

const SUPABASE_URL = 'https://mfgxfplxwpnfwguvtfxw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZ3hmcGx4d3BuZndndXZ0Znh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDI5OTcsImV4cCI6MjA5MDM3ODk5N30.vxPihLYL_miLDgCFdTMGr2Ndf04lBxSWV92hcqAvusw';

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
        console.log('💡 El sistema funcionará en modo local (solo este navegador)');
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

        if (!window.supabase) {
            console.warn('⚠️ Librería Supabase no cargada. Asegúrate de incluir:');
            console.log('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
            return null;
        }

        if (!verificarConfiguracion()) {
            console.log('💡 Usando modo local (sin sincronización en la nube)');
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

// Inicializar inmediatamente
supabase = inicializarSupabase();

// Exportar para uso en otros archivos
window.supabaseClient = supabase;

// Función para verificar la conexión con reintentos
async function verificarConexion() {
    if (!supabase) {
        console.log('💡 Supabase no configurado - funcionando en modo local');
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

// Verificar conexión automáticamente después de 1 segundo
setTimeout(async () => {
    if (supabase) {
        const conectado = await verificarConexion();
        if (!conectado) {
            console.log('💡 El sistema funcionará en modo local (datos solo en este navegador)');
        }
    } else {
        console.log('💡 El sistema funcionará en modo local (datos solo en este navegador)');
    }
}, 1000);

// Verificar conexión periódicamente cada 30 segundos
setInterval(async () => {
    if (supabase && connectionStatus !== ConnectionState.CONNECTED) {
        await verificarConexion();
    }
}, 30000);
