/**
 * Utilitários para Agendamento Prévio de Pedidos - JOHB Café & Salgados
 * Respeita estritamente o horário oficial de Brasília (America/Sao_Paulo)
 * e as configurações de dias de funcionamento do banco de dados (sem fallbacks artificiais).
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
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            let parsed = JSON.parse(raw);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }
    return {};
}

/**
 * Retorna os componentes da data e hora atual no fuso de Brasília
 */
export function getBrasiliaNow() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
    const parts = formatter.formatToParts(now);
    const getVal = (type) => parts.find(p => p.type === type)?.value;

    const year = parseInt(getVal("year"), 10);
    const month = parseInt(getVal("month"), 10);
    const day = parseInt(getVal("day"), 10);
    const hour = parseInt(getVal("hour"), 10);
    const minute = parseInt(getVal("minute"), 10);

    // Cria objeto Date no fuso de Brasília
    const brasiliaDate = new Date(year, month - 1, day, hour, minute);
    return {
        dateObj: brasiliaDate,
        year,
        month,
        day,
        hour,
        minute,
        currentMinutes: hour * 60 + minute,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    };
}

/**
 * Retorna a lista de datas elegíveis para agendamento respeitando os dias em que o restaurante abre.
 */
export function getAvailableScheduleDates(deliverySettings) {
    if (!deliverySettings) return [];
    if (deliverySettings.temporarily_closed) return [];

    const dates = [];
    const maxDays = Math.min(30, Math.max(1, Number(deliverySettings?.max_schedule_days) || 7));
    const businessHours = parseBusinessHours(deliverySettings?.business_hours);
    const alwaysOpen = Boolean(deliverySettings?.always_open);
    const allowImmediate = deliverySettings?.allow_immediate_orders !== false;
    const allowScheduled = deliverySettings?.allow_scheduled_orders !== false;

    if (!allowScheduled && !allowImmediate) {
        return [];
    }

    const { dateObj: baseDate } = getBrasiliaNow();

    for (let i = 0; i < maxDays; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);

        const dayKey = DAY_KEYS[d.getDay()];
        const dayConfig = businessHours[dayKey];

        // Se não for always_open e o dia não estiver cadastrado como aberto, pula
        const isOpenDay = alwaysOpen || (dayConfig && dayConfig.open === true);
        if (!isOpenDay) continue;

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

        const slots = getAvailableTimeSlots(dateStr, deliverySettings);
        const hasSlots = slots.length > 0;

        const label = `${prefix} (${day}/${month})`;

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
    if (!selectedDateStr || !deliverySettings) return [];
    if (deliverySettings.temporarily_closed) return [];

    const businessHours = parseBusinessHours(deliverySettings?.business_hours);
    const alwaysOpen = Boolean(deliverySettings?.always_open);
    const minLeadHours = Number(deliverySettings?.min_lead_hours ?? 0.5);

    const [year, month, day] = selectedDateStr.split('-').map(Number);
    if (!year || !month || !day) return [];

    const targetDate = new Date(year, month - 1, day);
    const dayKey = DAY_KEYS[targetDate.getDay()];
    const dayConfig = businessHours[dayKey];

    if (!alwaysOpen) {
        if (!dayConfig || dayConfig.open !== true) {
            return [];
        }
    }

    const startStr = (dayConfig?.start || (alwaysOpen ? "00:00" : "")).trim();
    const endStr = (dayConfig?.end || (alwaysOpen ? "23:59" : "")).trim();

    if (!startStr || !endStr) return [];

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
        return [];
    }

    const startTotalMins = startH * 60 + startM;
    const endTotalMins = endH * 60 + endM;

    if (startTotalMins >= endTotalMins) return [];

    const { year: nowYear, month: nowMonth, day: nowDay, currentMinutes: nowMinutes } = getBrasiliaNow();
    const isToday = (nowYear === year && nowMonth === month && nowDay === day);

    // Se for hoje, calcula a restrição de horário mínimo de antecedência
    const minEarliestMins = isToday ? (nowMinutes + Math.round(minLeadHours * 60)) : 0;

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
