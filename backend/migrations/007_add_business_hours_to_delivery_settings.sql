-- Migration: Adicionar coluna business_hours à tabela delivery_settings
-- Permite configurar horários de funcionamento por dia da semana

ALTER TABLE delivery_settings 
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
    "seg": {"open": true, "start": "11:00", "end": "22:00"},
    "ter": {"open": true, "start": "11:00", "end": "22:00"},
    "qua": {"open": true, "start": "11:00", "end": "22:00"},
    "qui": {"open": true, "start": "11:00", "end": "22:00"},
    "sex": {"open": true, "start": "11:00", "end": "22:00"},
    "sab": {"open": false, "start": "11:00", "end": "22:00"},
    "dom": {"open": false, "start": "11:00", "end": "22:00"}
}';

-- Atualizar registro existente se houver
UPDATE delivery_settings 
SET business_hours = '{
    "seg": {"open": true, "start": "11:00", "end": "22:00"},
    "ter": {"open": true, "start": "11:00", "end": "22:00"},
    "qua": {"open": true, "start": "11:00", "end": "22:00"},
    "qui": {"open": true, "start": "11:00", "end": "22:00"},
    "sex": {"open": true, "start": "11:00", "end": "22:00"},
    "sab": {"open": false, "start": "11:00", "end": "22:00"},
    "dom": {"open": false, "start": "11:00", "end": "22:00"}
}'
WHERE business_hours IS NULL OR business_hours = '{}';
