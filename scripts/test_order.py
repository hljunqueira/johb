import requests
data = {
    "customer_name": "Teste Robo",
    "customer_phone": "11999999999",
    "delivery_type": "delivery",
    "address": "Rua de Teste, 123",
    "neighborhood": "Centro",
    "items": [{
        "product_id": "55555555-0003-0000-0000-000000000001",
        "name": "Sanduiche Alma Verde",
        "price": 28.5,
        "quantity": 1,
        "complements": []
    }],
    "subtotal": 28.5,
    "delivery_fee": 5.0,
    "total": 33.5,
    "payment_method": "pix"
}
try:
    r = requests.post("http://localhost:8001/api/orders", json=data, timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Erro: {e}")
