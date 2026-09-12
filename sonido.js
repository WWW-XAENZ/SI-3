// ============================================
// UTILIDAD DE SONIDO PARA NOTIFICACIONES - SI-3
// Reproductor confiable con recuperación de AudioContext
// ============================================

const SonidoSI3 = {
    contexto: null,
    _ultimoBeep: 0,
    _minIntervalo: 300,

    inicializar() {
        try {
            if (!this.contexto) {
                this.contexto = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.contexto && this.contexto.state === 'suspended') {
                this.contexto.resume();
            }
        } catch (e) {
            console.warn('⚠️ No se pudo inicializar AudioContext:', e);
        }
    },

    asegurarContexto() {
        if (!this.contexto) {
            this.inicializar();
            return false;
        }
        if (this.contexto.state === 'suspended') {
            this.contexto.resume().catch(() => {});
            return false;
        }
        if (this.contexto.state === 'closed') {
            this.contexto = null;
            this.inicializar();
            return false;
        }
        return true;
    },

    _beep(frecuencia, duracion, tipo, volumen, startTime) {
        if (!this.asegurarContexto()) return;
        try {
            const oscilador = this.contexto.createOscillator();
            const ganancia = this.contexto.createGain();
            oscilador.connect(ganancia);
            ganancia.connect(this.contexto.destination);
            oscilador.frequency.value = frecuencia;
            oscilador.type = tipo || 'sine';
            const t = startTime || this.contexto.currentTime;
            ganancia.gain.setValueAtTime(volumen || 0.3, t);
            ganancia.gain.exponentialRampToValueAtTime(0.001, t + (duracion || 0.3));
            oscilador.start(t);
            oscilador.stop(t + (duracion || 0.3));
        } catch (e) {}
    },

    tocar(veces, patrón) {
        this.inicializar();
        const ahora = Date.now();
        if (ahora - this._ultimoBeep < this._minIntervalo) return;
        this._ultimoBeep = ahora;

        if (!this.asegurarContexto()) return;

        const config = patrón || { frecuencia: 880, duracion: 0.3, tipo: 'sine', volumen: 0.25, intervalo: 500 };
        for (let i = 0; i < (veces || 1); i++) {
            setTimeout(() => {
                this._beep(config.frecuencia, config.duracion, config.tipo, config.volumen);
            }, i * config.intervalo || 400);
        }
    },

    tocarAlerta() {
        const patrón = { frecuencia: 1046, duracion: 0.15, tipo: 'square', volumen: 0.15, intervalo: 250 };
        this.tocar(4, patrón);
    },

    tocarConfirmacion() {
        this._beep(660, 0.2, 'sine', 0.2);
        setTimeout(() => this._beep(880, 0.3, 'sine', 0.25), 200);
    },

    tocarTurnoCompletado() {
        this._beep(523, 0.15, 'sine', 0.2);
        setTimeout(() => this._beep(659, 0.15, 'sine', 0.2), 150);
        setTimeout(() => this._beep(784, 0.25, 'sine', 0.25), 300);
    }
};

window.SonidoSI3 = SonidoSI3;

window.addEventListener('click', () => SonidoSI3.inicializar(), { once: true });
window.addEventListener('keydown', () => SonidoSI3.inicializar(), { once: true });
window.addEventListener('touchstart', () => SonidoSI3.inicializar(), { once: true });

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && SonidoSI3.contexto && SonidoSI3.contexto.state === 'suspended') {
        SonidoSI3.contexto.resume().catch(() => {});
    }
});

window.addEventListener('notificacion-sonido', (e) => {
    const tipo = e.detail?.tipo || 'default';
    SonidoSI3.inicializar();
    switch (tipo) {
        case 'turno_llamado':
            SonidoSI3.tocar(3, { frecuencia: 1046, duracion: 0.15, tipo: 'square', volumen: 0.15, intervalo: 200 });
            break;
        case 'proveedor_listo':
            SonidoSI3.tocarAlerta();
            break;
        case 'turno_completado':
            SonidoSI3.tocarTurnoCompletado();
            break;
        case 'inspeccion':
            SonidoSI3.tocar(2, { frecuencia: 880, duracion: 0.2, tipo: 'triangle', volumen: 0.2, intervalo: 300 });
            break;
        case 'nuevo_turno':
            SonidoSI3._beep(660, 0.2, 'sine', 0.2);
            break;
        default:
            SonidoSI3.tocar(2, { frecuencia: 880, duracion: 0.15, tipo: 'sine', volumen: 0.2, intervalo: 300 });
    }
});
