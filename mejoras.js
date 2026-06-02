// ============================================
// MEJORAS SI-3 — EXTENSIÓN MODULAR
// Agrega funcionalidades sin reemplazar app.js
// ============================================

// ────────────────────────────────────────────
// 1. MÉTRICAS EN TIEMPO REAL
// ────────────────────────────────────────────
const MetricasRT = {
    tiemposAtencion: [],   // últimos N tiempos en ms
    MAX_MUESTRAS: 20,

    registrarInicio(turnoId) {
        try {
            const data = JSON.parse(localStorage.getItem('mt_inicio') || '{}');
            data[turnoId] = Date.now();
            localStorage.setItem('mt_inicio', JSON.stringify(data));
        } catch(e) {}
    },

    registrarFin(turnoId) {
        try {
            const data = JSON.parse(localStorage.getItem('mt_inicio') || '{}');
            if (data[turnoId]) {
                const duracionMin = Math.round((Date.now() - data[turnoId]) / 60000);
                this.tiemposAtencion.push(duracionMin);
                if (this.tiemposAtencion.length > this.MAX_MUESTRAS) this.tiemposAtencion.shift();
                delete data[turnoId];
                localStorage.setItem('mt_inicio', JSON.stringify(data));
                localStorage.setItem('mt_tiempos', JSON.stringify(this.tiemposAtencion));
            }
        } catch(e) {}
    },

    cargar() {
        try {
            this.tiemposAtencion = JSON.parse(localStorage.getItem('mt_tiempos') || '[]');
        } catch(e) {}
    },

    promedioAtencion() {
        if (this.tiemposAtencion.length === 0) return null;
        const sum = this.tiemposAtencion.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.tiemposAtencion.length);
    },

    actualizarUI() {
        const el = document.getElementById('metricaTiempoPromedio');
        if (!el) return;
        const prom = this.promedioAtencion();
        el.textContent = prom !== null ? `${prom} min` : '—';
    }
};

// ────────────────────────────────────────────
// 2. BÚSQUEDA EN HISTORIAL ADMIN
// ────────────────────────────────────────────
const BusquedaHistorial = {
    _historialCompleto: [],

    setHistorial(data) {
        this._historialCompleto = data;
    },

    filtrar(q) {
        if (!q || q.trim() === '') return this._historialCompleto;
        const lower = q.toLowerCase();
        return this._historialCompleto.filter(h =>
            (h.numero && h.numero.toLowerCase().includes(lower)) ||
            (h.nombreEmpresa && h.nombreEmpresa.toLowerCase().includes(lower)) ||
            (h.nit && h.nit.toLowerCase().includes(lower)) ||
            (h.numFactura && h.numFactura.toLowerCase().includes(lower)) ||
            (h.responsable && h.responsable.toLowerCase().includes(lower))
        );
    },

    inicializar() {
        const input = document.getElementById('busquedaHistorial');
        if (!input) return;
        input.addEventListener('input', () => {
            const filtrado = this.filtrar(input.value);
            RenderAdmin._renderHistorialData(filtrado);
        });
    }
};

// ────────────────────────────────────────────
// 3. EXPORTAR HISTORIAL DE HOY A CSV
// ────────────────────────────────────────────
const ExportarHoy = {
    async exportar() {
        if (!window.supabaseClient) {
            Utils.mostrarNotificacion('Se necesita conexión a Supabase', 'error');
            return;
        }
        try {
            const hoy = window.getLocalDate ? window.getLocalDate() : new Date().toISOString().split('T')[0];
            const historial = await SupabaseDB.cargarHistorial(500, hoy);
            if (!historial.length) {
                Utils.mostrarNotificacion('No hay turnos completados hoy', 'warning');
                return;
            }
            const cols = ['Turno','Empresa','Placa','Factura','Tipo Vehículo','Bultos','Peso','Responsable','Destino','Hora Solicitud','Hora Llamada','Hora Fin','Salida OK'];
            const rows = historial.map(h => [
                h.numero, h.nombreEmpresa, h.nit || '', h.numFactura || '',
                h.tipoVehiculo || '', h.bultos || '', h.peso || '',
                h.responsable || '', h.destino || '',
                h.horaSolicitud || '', h.horaLlamada || '', h.horaFinalizacion || '',
                h.autorizadoSalida ? 'Sí' : 'No'
            ]);
            const csv = [cols, ...rows]
                .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
                .join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `turnos_${hoy}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            Utils.mostrarNotificacion(`${historial.length} registros exportados`, 'success');
        } catch(e) {
            Utils.mostrarNotificacion('Error al exportar: ' + e.message, 'error');
        }
    }
};

// ────────────────────────────────────────────
// 4. CONTADOR EN VIVO (reloj y tiempo transcurrido)
// ────────────────────────────────────────────
const RelojVivo = {
    _interval: null,

    iniciar() {
        this._interval = setInterval(() => {
            // Hora actual
            const relojes = document.querySelectorAll('.reloj-vivo');
            const ahora = new Date();
            const hora = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            relojes.forEach(el => el.textContent = hora);

            // Tiempo transcurrido turno actual
            const elTiempo = document.getElementById('tiempoTranscurrido');
            if (elTiempo && window.AppState && window.AppState.turnoActual) {
                const inicio = localStorage.getItem('mt_inicio') ?
                    JSON.parse(localStorage.getItem('mt_inicio'))[window.AppState.turnoActual.id] : null;
                if (inicio) {
                    const diff = Math.floor((Date.now() - inicio) / 1000);
                    const min = Math.floor(diff / 60);
                    const seg = diff % 60;
                    elTiempo.textContent = `${String(min).padStart(2,'0')}:${String(seg).padStart(2,'0')}`;
                    // Alerta visual si supera 30 min
                    if (min >= 30) elTiempo.style.color = '#dc2626';
                    else if (min >= 15) elTiempo.style.color = '#f59e0b';
                    else elTiempo.style.color = '';
                } else {
                    elTiempo.textContent = '—';
                }
            }
        }, 1000);
    },

    detener() {
        if (this._interval) clearInterval(this._interval);
    }
};

// ────────────────────────────────────────────
// 5. CONFIRMACIÓN MEJORADA (en lugar de confirm())
// ────────────────────────────────────────────
const ConfirmDialog = {
    mostrar(mensaje, titulo = 'Confirmar', onConfirm) {
        let modal = document.getElementById('confirmDialogModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirmDialogModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:420px;text-align:center;">
                    <h3 id="confirmDialogTitulo" style="margin-bottom:12px;font-size:18px;color:#1e293b;"></h3>
                    <p id="confirmDialogMensaje" style="color:#475569;margin-bottom:24px;font-size:14px;"></p>
                    <div style="display:flex;gap:12px;justify-content:center;">
                        <button id="confirmDialogNo" class="btn" style="flex:1;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;">
                            Cancelar
                        </button>
                        <button id="confirmDialogSi" class="btn btn-danger" style="flex:1;">
                            Confirmar
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#confirmDialogNo').onclick = () => modal.style.display = 'none';
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        }
        modal.querySelector('#confirmDialogTitulo').textContent = titulo;
        modal.querySelector('#confirmDialogMensaje').textContent = mensaje;
        const btnSi = modal.querySelector('#confirmDialogSi');
        btnSi.onclick = () => { modal.style.display = 'none'; if (onConfirm) onConfirm(); };
        modal.style.display = 'flex';
    }
};

// ────────────────────────────────────────────
// 6. INDICADOR DE POSICIÓN ANIMADO (usuario)
// ────────────────────────────────────────────
const IndicadorPosicion = {
    actualizar(posicion, total) {
        const barra = document.getElementById('barraProgreso');
        const texto = document.getElementById('textoPosicion');
        if (!barra) return;
        const pct = total > 0 ? Math.max(5, Math.round(((total - posicion + 1) / total) * 100)) : 5;
        barra.style.width = pct + '%';
        if (texto) texto.textContent = posicion > 0 ? `Posición ${posicion} de ${total}` : '¡Es tu turno!';
    }
};

// ────────────────────────────────────────────
// 7. SONIDOS MEJORADOS
// ────────────────────────────────────────────
const SonidoMejorado = {
    ctx: null,
    _init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
    reproducirTono(freq, duracion, tipo = 'sine', volumen = 0.4) {
        this._init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.frequency.value = freq; osc.type = tipo;
        gain.gain.setValueAtTime(volumen, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duracion);
        osc.start(this.ctx.currentTime); osc.stop(this.ctx.currentTime + duracion);
    },
    turnoLlamado() {
        // Melodía corta ascendente
        [523, 659, 784].forEach((f, i) => {
            setTimeout(() => this.reproducirTono(f, 0.4, 'sine', 0.5), i * 250);
        });
    },
    turnoCompletado() {
        [784, 523].forEach((f, i) => setTimeout(() => this.reproducirTono(f, 0.3, 'sine', 0.3), i * 200));
    },
    nuevaTurno() {
        this.reproducirTono(440, 0.2, 'sine', 0.3);
    }
};

// ────────────────────────────────────────────
// 8. PANEL DE RENDIMIENTO DEL DÍA
// ────────────────────────────────────────────
const PanelRendimiento = {
    async cargar() {
        const panel = document.getElementById('panelRendimientoDia');
        if (!panel || !window.supabaseClient) return;
        try {
            const hoy = window.getLocalDate ? window.getLocalDate() : new Date().toISOString().split('T')[0];
            const historialHoy = await SupabaseDB.cargarHistorial(500, hoy);
            const conSalida = historialHoy.filter(h => h.autorizadoSalida).length;
            const sinSalida = historialHoy.filter(h => !h.autorizadoSalida).length;
            const empresasUnicas = new Set(historialHoy.map(h => h.nombreEmpresa)).size;
            const pesoTotal = historialHoy.reduce((s, h) => s + (parseFloat(h.peso) || 0), 0);
            const bultosTotal = historialHoy.reduce((s, h) => s + (parseInt(h.bultos) || 0), 0);

            panel.innerHTML = `
                <div class="rendimiento-grid">
                    <div class="rendimiento-item">
                        <span class="rendimiento-val">${historialHoy.length}</span>
                        <span class="rendimiento-lbl">Completados hoy</span>
                    </div>
                    <div class="rendimiento-item verde">
                        <span class="rendimiento-val">${conSalida}</span>
                        <span class="rendimiento-lbl">Salidas OK</span>
                    </div>
                    <div class="rendimiento-item naranja">
                        <span class="rendimiento-val">${sinSalida}</span>
                        <span class="rendimiento-lbl">Sin autorizar</span>
                    </div>
                    <div class="rendimiento-item azul">
                        <span class="rendimiento-val">${empresasUnicas}</span>
                        <span class="rendimiento-lbl">Empresas</span>
                    </div>
                    <div class="rendimiento-item">
                        <span class="rendimiento-val">${pesoTotal > 0 ? pesoTotal.toLocaleString('es-CO') + ' kg' : '—'}</span>
                        <span class="rendimiento-lbl">Peso total</span>
                    </div>
                    <div class="rendimiento-item">
                        <span class="rendimiento-val">${bultosTotal > 0 ? bultosTotal : '—'}</span>
                        <span class="rendimiento-lbl">Bultos totales</span>
                    </div>
                </div>
            `;
        } catch(e) {
            console.warn('Error cargando rendimiento:', e);
        }
    }
};



// ────────────────────────────────────────────
// 10. ESTILOS DE LAS MEJORAS
// ────────────────────────────────────────────
(function inyectarEstilos() {
    const style = document.createElement('style');
    style.textContent = `
        /* ── Panel rendimiento del día ── */
        .rendimiento-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 10px;
        }
        .rendimiento-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
        }
        .rendimiento-item.verde { background: #f0fdf4; border-color: #86efac; }
        .rendimiento-item.naranja { background: #fff7ed; border-color: #fed7aa; }
        .rendimiento-item.azul { background: #eff6ff; border-color: #bfdbfe; }
        .rendimiento-val {
            display: block;
            font-size: 22px;
            font-weight: 700;
            color: #1e293b;
        }
        .rendimiento-lbl {
            display: block;
            font-size: 11px;
            color: #64748b;
            margin-top: 3px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        /* ── Barra de progreso usuario ── */
        .barra-progreso-wrap {
            background: #e2e8f0;
            border-radius: 20px;
            height: 8px;
            overflow: hidden;
            margin: 8px 0;
        }
        #barraProgreso {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #22c55e);
            border-radius: 20px;
            transition: width 0.6s ease;
            width: 5%;
        }

        /* ── Tiempo transcurrido ── */
        #tiempoTranscurrido {
            font-size: 28px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            color: #2563eb;
            letter-spacing: 2px;
        }

        /* ── Búsqueda historial ── */
        .historial-toolbar {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
            align-items: center;
            flex-wrap: wrap;
        }
        #busquedaHistorial {
            flex: 1;
            min-width: 180px;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13px;
            background: #f8fafc;
        }
        #busquedaHistorial:focus {
            outline: none;
            border-color: #3b82f6;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }

        /* ── Reloj vivo ── */
        .reloj-vivo {
            font-variant-numeric: tabular-nums;
            font-weight: 600;
            letter-spacing: 1px;
        }

        /* ── Modal confirmación ── */
        #confirmDialogModal .modal-content {
            border-radius: 16px;
            padding: 32px 28px;
        }

        /* ── Métrica tiempo promedio ── */
        .metrica-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: #475569;
            padding: 8px 12px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .metrica-val {
            font-weight: 700;
            color: #2563eb;
            font-size: 15px;
        }

        @media (max-width: 600px) {
            .rendimiento-grid { grid-template-columns: repeat(2, 1fr); }
        }
    `;
    document.head.appendChild(style);
})();

// Exportar
window.MetricasRT = MetricasRT;
window.BusquedaHistorial = BusquedaHistorial;
window.ExportarHoy = ExportarHoy;
window.RelojVivo = RelojVivo;
window.ConfirmDialog = ConfirmDialog;
window.IndicadorPosicion = IndicadorPosicion;
window.SonidoMejorado = SonidoMejorado;
window.PanelRendimiento = PanelRendimiento;

// ────────────────────────────────────────────
// 11. PARCHE MODOESPERA — actualizar barra de progreso mejorada
// ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Esperamos a que ModoEspera esté disponible
    const patchModoEspera = () => {
        if (!window.ModoEspera) { setTimeout(patchModoEspera, 200); return; }
        const _origActualizar = window.ModoEspera.actualizar.bind(window.ModoEspera);
        window.ModoEspera.actualizar = function() {
            _origActualizar();
            // Actualizar barra de progreso mejorada
            if (this.activo && this.miTurno && window.AppState) {
                const turnosEspera = window.AppState.turnos || [];
                const posicion = turnosEspera.findIndex(t => t.numero === this.miTurno.numero) + 1;
                IndicadorPosicion.actualizar(posicion, turnosEspera.length);
                // Actualizar tiempo estimado
                const el = document.getElementById('waitingTime');
                if (el && posicion > 0) {
                    const min = posicion * (window.CONFIG?.TURN_TIME_ESTIMATE || 5);
                    el.textContent = `~${min} min`;
                }
            }
        };
    };
    setTimeout(patchModoEspera, 500);
});
