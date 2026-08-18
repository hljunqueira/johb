/**
 * Utilitários para Agendamento Prévio de Pedidos - JOHB Café & Salgados
 */

const DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const DAY_LABELS = {
    dom: "Domingo",
    seg: "Segunda-feira",
    ter: "Terça-feira",
    qua: "Quarta-feira",
    qui: "Quinta-feira",
    sex: "Sexta-feira",
    sab: "Sábado"
};

export function parseBusinessHours(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }
    return {};
}

/**
 * Retorna a lista de datas elegíveis para agendamento respeitando os dias em que o restaurante abre.
 */
export function getAvailableScheduleDates(deliverySettings) {
    const dates = [];
    const maxDays = Number(deliverySettings?.max_schedule_days) || 7;
    const businessHours = parseBusinessHours(deliverySettings?.business_hours);
    const alwaysOpen = Boolean(deliverySettings?.always_open);

    const now = new Date();

    for (let i = 0; i < maxDays; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);

        const dayKey = DAY_KEYS[d.getDay()];
        const dayConfig = businessHours[dayKey];
        const isOpen = alwaysOpen || !dayConfig || dayConfig.open !== false;

        // Se o restaurante estiver fechado neste dia da semana, pula
        if (!isOpen) continue;

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let prefix = "";
        if (i === 0) prefix = "Hoje";
        else if (i === 1) prefix = "Amanhã";
        else {
            const w = DAY_LABELS[dayKey].split("-")[0];
            prefix = w;
        }

        const label = `${prefix} (${day}/${month})`;
        const slots = getAvailableTimeSlots(dateStr, deliverySettings);
        const hasSlots = slots.length > 0;

        dates.push({
            value: dateStr,
            label: hasSlots ? label : `${label} (Esgotado)`,
            displayDate: `${day}/${month}/${year}`,
            dayKey,
            dayName: DAY_LABELS[dayKey],
            isToday: i === 0,
            isTomorrow: i === 1,
            hasSlots,
            slotsCount: slots.length,
            firstSlot: slots[0] || ""
        });
    }

    return dates;
}

/**
 * Retorna os slots de horário (a cada 30 min) para a data selecionada.
 * Se for hoje, filtra respeitando a antecedência mínima (min_lead_hours).
 */
export function getAvailableTimeSlots(selectedDateStr, deliverySettings) {
    if (!selectedDateStr) return [];

    const businessHours = parseBusinessHours(deliverySettings?.business_hours);
    const alwaysOpen = Boolean(deliverySettings?.always_open);
    const minLeadHours = Number(deliverySettings?.min_lead_hours ?? 0.5);

    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayKey = DAY_KEYS[targetDate.getDay()];
    const dayConfig = businessHours[dayKey] || { open: true, start: "11:00", end: "22:00" };

    if (!alwaysOpen && dayConfig.open === false) {
        return [];
    }

    const startStr = dayConfig.start || "11:00";
    const endStr = dayConfig.end || "22:00";

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startTotalMins = (isNaN(startH) ? 11 : startH) * 60 + (isNaN(startM) ? 0 : startM);
    const endTotalMins = (isNaN(endH) ? 22 : endH) * 60 + (isNaN(endM) ? 0 : endM);

    const now = new Date();
    const isToday = (
        now.getFullYear() === year &&
        now.getMonth() === (month - 1) &&
        now.getDate() === day
    );

    // Se for hoje, calcula a restrição de horário mínimo
    const currentMinsNow = now.getHours() * 60 + now.getMinutes();
    const minEarliestMins = isToday ? (currentMinsNow + Math.round(minLeadHours * 60)) : 0;

    const slots = [];
    for (let m = startTotalMins; m <= endTotalMins; m += 30) {
        if (isToday && m < minEarliestMins) {
            continue; // Horário antes da antecedência mínima exigida
        }

        const h = Math.floor(m / 60);
        const mins = m % 60;
        const timeFormatted = `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        slots.push(timeFormatted);
    }

    return slots;
}
