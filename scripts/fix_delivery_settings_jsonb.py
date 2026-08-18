import asyncio
import asyncpg
import json

DATABASE_URL = "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres"

DEFAULT_HOURS = {
    "seg": {"open": True, "start": "11:00", "end": "18:00"},
    "ter": {"open": True, "start": "11:00", "end": "18:00"},
    "qua": {"open": True, "start": "11:00", "end": "18:00"},
    "qui": {"open": True, "start": "11:00", "end": "18:00"},
    "sex": {"open": True, "start": "11:00", "end": "18:00"},
    "sab": {"open": False, "start": "11:00", "end": "22:00"},
    "dom": {"open": False, "start": "11:00", "end": "22:00"},
}

DEFAULT_DISTANCE_RATES = [
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
]

async def fix():
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Atualizar com cast explícito ::jsonb
    await conn.execute("""
        UPDATE delivery_settings SET 
            areas = $1::jsonb,
            delivery_fee = $2,
            min_free_delivery = $3,
            active = $4,
            business_hours = $5::jsonb,
            restaurant_address = $6,
            distance_rates = $7::jsonb,
            max_delivery_distance = $8,
            always_open = $9,
            temporarily_closed = $10,
            min_lead_hours = $11,
            max_schedule_days = $12,
            allowed_schedule_days = $13::jsonb,
            accept_online_payment = $14,
            accept_card_machine = $15,
            accept_cash = $16,
            allow_immediate_orders = $17,
            allow_scheduled_orders = $18
        WHERE id = 1;
    """,
        json.dumps([]),
        5.0,
        60.0,
        True,
        json.dumps(DEFAULT_HOURS),
        "Balneário Arroio do Silva - SC",
        json.dumps(DEFAULT_DISTANCE_RATES),
        10.5,
        False,
        True, # Temporarily closed ativo
        1,
        7,
        json.dumps(["seg","ter","qua","qui","sex","sab","dom"]),
        True,
        True,
        True,
        True,
        True
    )
    
    row = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
    print("FIXED DELIVERY SETTINGS:")
    for k, v in dict(row).items():
        print(f"  {k}: {v}")
        
    await conn.close()

if __name__ == '__main__':
    asyncio.run(fix())
