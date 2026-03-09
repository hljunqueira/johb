-- Migration: Adicionar configurações de distância e endereço do restaurante
ALTER TABLE delivery_settings 
ADD COLUMN IF NOT EXISTS restaurant_address TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS restaurant_lat NUMERIC(10,8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS restaurant_lng NUMERIC(11,8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS distance_rates JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS max_delivery_distance NUMERIC(10,2) DEFAULT 10.0;

-- Configurar endereço do restaurante (Salada Soul - Rondonopolis)
-- Taxas padrão baseadas na tabela do iFood (até 10km)
UPDATE delivery_settings 
SET restaurant_address = 'Rua Euclides Jose Da Silva, 190 - Jardim Santa Clara I, Rondonopolis - MT, 78730-172',
    distance_rates = '[
        {"max_distance": 2.4, "fee": 8.0},
        {"max_distance": 2.5, "fee": 9.0},
        {"max_distance": 3.4, "fee": 9.0},
        {"max_distance": 3.5, "fee": 10.0},
        {"max_distance": 4.4, "fee": 10.0},
        {"max_distance": 4.5, "fee": 11.0},
        {"max_distance": 5.4, "fee": 11.0},
        {"max_distance": 5.5, "fee": 12.0},
        {"max_distance": 6.4, "fee": 12.0},
        {"max_distance": 6.5, "fee": 13.0},
        {"max_distance": 7.4, "fee": 13.0},
        {"max_distance": 7.5, "fee": 14.0},
        {"max_distance": 8.4, "fee": 14.0},
        {"max_distance": 8.5, "fee": 15.0},
        {"max_distance": 9.4, "fee": 15.0},
        {"max_distance": 9.5, "fee": 16.0},
        {"max_distance": 10.4, "fee": 16.0},
        {"max_distance": 10.5, "fee": 17.0}
    ]'::jsonb,
    max_delivery_distance = 10.5
WHERE id = 1;
