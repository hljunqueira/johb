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

/**
 * Retorna a lista de datas elegíveis para agendamento respeitando os dias em que o restaurante abre.
 */
export function getAvailableScheduleDates(deliverySettings) {
    const dates = [];
    const maxDays = Number(deliverySettings?.max_schedule_days) || 7;
    const businessHours = deliverySettings?.business_hours || {};
    const alwaysOpen = Boolean(deliverySettings?.always_open);

    const now = new Date();

    for (let i = 0; i < maxDays; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);

        const dayKey = DAY_KEYS[d.getDay()];
        const dayConfig = businessHours[dayKey];
        const isOpen = alwaysOpen || (dayConfig && dayConfig.open !== false);

        // Se o dia não estiver aberto no expediente, pula para o próximo
        if (!isOpen) continue;

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let label = "";
        if (i === 0) {
            label = "Hoje";
        } else if (i === 1) {
            label = "Amanhã";
        } else {
            label = d.toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit', month: '2-digit' });
        }

        dates.push({
            value: dateStr,
            label,
            displayDate: d.toLocaleDateString("pt-BR"),
            dayKey,
            dayName: DAY_LABELS[dayKey],
            isToday: i === 0,
            isTomorrow: i === 1
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

    const businessHours = deliverySettings?.business_hours || {};
    const alwaysOpen = Boolean(deliverySettings?.always_open);
    const minLeadHours = Number(deliverySettings?.min_lead_hours ?? 4);

    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayKey = DAY_KEYS[targetDate.getDay()];
    const dayConfig = businessHours[dayKey] || { open: true, start: "11:00", end: "21:30" };

    if (!alwaysOpen && dayConfig.open === false) {
        return [];
    }

    const startStr = dayConfig.start || "11:00";
    const endStr = dayConfig.end || "21:30";

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startTotalMins = (isNaN(startH) ? 11 : startH) * 60 + (isNaN(startM) ? 0 : startM);
    const endTotalMins = (isNaN(endH) ? 21 : endH) * 60 + (isNaN(endM) ? 30 : endM);

    const now = new Date();
    const isToday = (
        now.getFullYear() === year &&
        now.getMonth() === (month - 1) &&
        now.getDate() === day
    );

    // Se for hoje, calcula a restrição de horário mínimo
    const currentMinsNow = now.getHours() * 60 + now.getMinutes();
    const minEarliestMins = isToday ? (currentMinsNow + (minLeadHours * 60)) : 0;

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

    // Se não tiver nenhum slot disponível hoje porque passou do horário de atendimento
    if (slots.length === 0 && isToday) {
        return [];
    }

    return slots;
}
