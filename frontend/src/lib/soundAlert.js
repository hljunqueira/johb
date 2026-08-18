/**
 * Web Audio API Sound Generator para Alerta de Novos Pedidos - JOHB Admin
 * Não depende de arquivos de áudio externos (.mp3) e funciona diretamente no navegador.
 */

let audioCtx = null;
let alertInterval = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/**
 * Toca um "Ding-Dong" suave e elegante estilo campainha de cafeteria
 */
export function playOrderAlertChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Primeiro tom (Frequência 587.33 Hz - Re)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Segundo tom mais agudo (Frequência 880 Hz - La)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.25);
        gain2.gain.setValueAtTime(0, now + 0.25);
        gain2.gain.linearRampToValueAtTime(0.35, now + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.25);
        osc2.stop(now + 1.2);

    } catch (err) {
        console.warn("Não foi possível reproduzir som de alerta de pedido:", err);
    }
}

/**
 * Inicia o loop do alerta sonoro a cada 5 segundos até ser parado
 */
export function startOrderAlertLoop() {
    if (alertInterval) return;
    playOrderAlertChime();
    alertInterval = setInterval(() => {
        playOrderAlertChime();
    }, 5000);
}

/**
 * Para o loop do alerta sonoro
 */
export function stopOrderAlertLoop() {
    if (alertInterval) {
        clearInterval(alertInterval);
        alertInterval = null;
    }
}
