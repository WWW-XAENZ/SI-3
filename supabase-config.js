// ============================================
// CONFIGURACIÓN DE SUPABASE - NUEVO PROYECTO
// ============================================

// IMPORTANTE: Reemplaza estos valores con los de tu nuevo proyecto de Supabase
const SUPABASE_URL = 'https://tu-proyecto-id.supabase.co';
const SUPABASE_KEY = 'tu-api-key-aqui';

// Verificar que las credenciales estén configuradas
if (SUPABASE_URL === 'https://tu-proyecto-id.supabase.co' || SUPABASE_KEY === 'tu-api-key-aqui') {
    console.warn('⚠️ ADVERTENCIA: Debes configurar tus credenciales de Supabase en supabase-config.js');
    console.warn('📖 Consulta README-SUPABASE.md para instrucciones');
}

// Inicializar cliente de Supabase
let supabase = null;

try {
    if (typeof window !== 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Cliente de Supabase inicializado correctamente');
    } else {
        console.error('❌ Error: La librería de Supabase no está cargada');
    }
} catch (error) {
    console.error('❌ Error al inicializar Supabase:', error);
}

// Exportar para uso en otros archivos
window.supabaseClient = supabase;

// Función para verificar la conexión
async function verificarConexion() {
    if (!supabase) {
        console.error('❌ Supabase no está inicializado');
        return false;
    }
    
    try {
        const { data, error } = await supabase.from('configuracion').select('*').limit(1);
        if (error) {
            console.error('❌ Error al conectar con Supabase:', error.message);
            return false;
        }
        console.log('✅ Conexión con Supabase exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        return false;
    }
}

// Exportar función de verificación
window.verificarConexionSupabase = verificarConexion;
