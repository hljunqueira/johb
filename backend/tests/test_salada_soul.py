"""
Salada Soul - Food Ordering Application Tests
Tests for public menu, cart, checkout, and admin functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestPublicEndpoints:
    """Public API endpoints - Categories, Products, Menu"""
    
    def test_get_categories(self):
        """Should return 4 categories: Monte sua Salada, Saladas Prontas, Lanches Frios, Bebidas"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert len(categories) == 4
        
        cat_names = [c["name"] for c in categories]
        assert "Monte sua Salada" in cat_names
        assert "Saladas Prontas" in cat_names
        assert "Lanches Frios" in cat_names
        assert "Bebidas" in cat_names
        
    def test_categories_have_required_fields(self):
        """Categories should have id, name, description, order fields"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        for cat in categories:
            assert "id" in cat
            assert "name" in cat
            assert "description" in cat
            assert "order" in cat
            assert "active" in cat and cat["active"] == True
            
    def test_get_all_products(self):
        """Should return all active products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) >= 13  # Based on seeded data
        
    def test_monte_sua_salada_has_additionals(self):
        """Monte sua Salada product should have 35 add-ons grouped by category"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        monte_salada = next((p for p in products if p["name"] == "Monte sua Salada"), None)
        
        assert monte_salada is not None
        assert len(monte_salada.get("additionals", [])) == 35
        assert monte_salada["price"] == 28.5
        assert "personalizavel" in monte_salada.get("tags", [])
        
    def test_monte_sua_salada_additionals_grouped_by_category(self):
        """Monte sua Salada add-ons should be grouped by: base_folhas, proteina, legumes, frutas, extras, molhos, temperos"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        monte_salada = next((p for p in products if p["name"] == "Monte sua Salada"), None)
        
        # Check that additionals have category field
        additionals = monte_salada.get("additionals", [])
        categories = set(a.get("category") for a in additionals)
        
        expected_categories = {"base_folhas", "proteina", "legumes", "frutas", "extras", "molhos", "temperos"}
        assert categories.issubset(expected_categories) or expected_categories.issubset(categories)
        
    def test_filter_products_by_category(self):
        """Should filter products by category_id"""
        # First get categories
        cat_response = requests.get(f"{BASE_URL}/api/categories")
        categories = cat_response.json()
        bebidas_cat = next((c for c in categories if c["name"] == "Bebidas"), None)
        
        assert bebidas_cat is not None
        
        # Filter products
        response = requests.get(f"{BASE_URL}/api/products?category_id={bebidas_cat['id']}")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) >= 5  # 5 drinks based on description
        for p in products:
            assert p["category_id"] == bebidas_cat["id"]
            
    def test_get_single_product(self):
        """Should return single product with all fields"""
        # Get products first
        response = requests.get(f"{BASE_URL}/api/products")
        products = response.json()
        product_id = products[0]["id"]
        
        # Get single product
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        
        product = response.json()
        assert product["id"] == product_id
        assert "name" in product
        assert "price" in product
        assert "description" in product


class TestOrderFlow:
    """Order creation and management"""
    
    def test_create_order(self):
        """Should create order with items and return order details"""
        # Get a product first
        products_res = requests.get(f"{BASE_URL}/api/products")
        product = products_res.json()[0]
        
        order_data = {
            "customer_name": "TEST_Customer",
            "customer_phone": "11999999999",
            "delivery_type": "retirada",
            "address": "",
            "neighborhood": "",
            "items": [
                {
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": 1,
                    "price": product["price"],
                    "observation": "Test order"
                }
            ],
            "observation": "Test observation"
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 200
        
        order = response.json()
        assert "id" in order
        assert "order_number" in order
        assert order["customer_name"] == "TEST_Customer"
        assert order["status"] == "aguardando"
        assert order["payment_status"] == "pendente"
        
        return order
        
    def test_get_order_by_id(self):
        """Should retrieve order by ID"""
        # Create order first
        order = self.test_create_order()
        
        response = requests.get(f"{BASE_URL}/api/orders/{order['id']}")
        assert response.status_code == 200
        
        fetched_order = response.json()
        assert fetched_order["id"] == order["id"]
        assert fetched_order["order_number"] == order["order_number"]
        
    def test_get_orders_by_phone(self):
        """Should retrieve orders by phone number"""
        # Create order first
        order = self.test_create_order()
        
        response = requests.get(f"{BASE_URL}/api/orders/phone/11999999999")
        assert response.status_code == 200
        
        orders = response.json()
        assert len(orders) >= 1
        assert any(o["customer_phone"] == "11999999999" for o in orders)
        
    def test_rate_order(self):
        """Should rate an order"""
        order = self.test_create_order()
        
        rating_data = {
            "rating": 5,
            "comment": "Excellent food!"
        }
        
        response = requests.post(f"{BASE_URL}/api/orders/{order['id']}/rate", json=rating_data)
        assert response.status_code == 200
        
        # Verify rating was saved
        verify_response = requests.get(f"{BASE_URL}/api/orders/{order['id']}")
        assert verify_response.status_code == 200
        assert verify_response.json()["rating"] == 5


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Should login admin with correct credentials"""
        login_data = {
            "email": "admin@saladasoul.com",
            "password": "admin123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@saladasoul.com"
        assert data["user"]["role"] == "admin"
        
        return data["token"]
        
    def test_admin_login_invalid_credentials(self):
        """Should reject invalid credentials"""
        login_data = {
            "email": "admin@saladasoul.com",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 401
        
    def test_get_current_user(self):
        """Should return current user with valid token"""
        token = self.test_admin_login_success()
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        user = response.json()
        assert user["email"] == "admin@saladasoul.com"


class TestAdminOrderManagement:
    """Admin order management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        login_data = {
            "email": "admin@saladasoul.com",
            "password": "admin123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
        
    def test_get_admin_orders(self, admin_token):
        """Should return all orders for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
        assert response.status_code == 200
        
        orders = response.json()
        assert isinstance(orders, list)
        
    def test_update_order_status(self, admin_token):
        """Should update order status"""
        # Create order first
        products_res = requests.get(f"{BASE_URL}/api/products")
        product = products_res.json()[0]
        
        order_data = {
            "customer_name": "TEST_StatusUpdate",
            "customer_phone": "11888888888",
            "delivery_type": "retirada",
            "address": "",
            "neighborhood": "",
            "items": [
                {"product_id": product["id"], "product_name": product["name"], "quantity": 1, "price": product["price"], "observation": ""}
            ],
            "observation": ""
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        order_id = order_response.json()["id"]
        
        # Update status
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status",
            headers=headers,
            json={"status": "preparando"}
        )
        assert response.status_code == 200
        
        # Verify status updated
        verify_response = requests.get(f"{BASE_URL}/api/orders/{order_id}")
        assert verify_response.json()["status"] == "preparando"
        
    def test_mark_order_paid(self, admin_token):
        """Should mark order as paid"""
        # Create order
        products_res = requests.get(f"{BASE_URL}/api/products")
        product = products_res.json()[0]
        
        order_data = {
            "customer_name": "TEST_Payment",
            "customer_phone": "11777777777",
            "delivery_type": "retirada",
            "address": "",
            "neighborhood": "",
            "items": [
                {"product_id": product["id"], "product_name": product["name"], "quantity": 1, "price": product["price"], "observation": ""}
            ],
            "observation": ""
        }
        
        order_response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        order_id = order_response.json()["id"]
        
        # Mark as paid
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/admin/orders/{order_id}/payment", headers=headers)
        assert response.status_code == 200
        
        # Verify payment status
        verify_response = requests.get(f"{BASE_URL}/api/orders/{order_id}")
        assert verify_response.json()["payment_status"] == "pago"


class TestAdminProductsCategories:
    """Admin products and categories management"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        login_data = {
            "email": "admin@saladasoul.com",
            "password": "admin123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
        
    def test_get_admin_products(self, admin_token):
        """Should return all products for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=headers)
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) >= 13
        
    def test_get_admin_categories(self, admin_token):
        """Should return all categories for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/categories", headers=headers)
        assert response.status_code == 200
        
        categories = response.json()
        assert len(categories) >= 4
        
    def test_create_and_delete_product(self, admin_token):
        """Should create and delete a product"""
        # Get category
        cat_response = requests.get(f"{BASE_URL}/api/categories")
        category = cat_response.json()[0]
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create product
        product_data = {
            "name": "TEST_TempProduct",
            "description": "Temporary product for testing",
            "price": 10.0,
            "category_id": category["id"],
            "image_url": "",
            "stock": -1,
            "tags": [],
            "additionals": [],
            "complement_ids": [],
            "active": True
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/products", headers=headers, json=product_data)
        assert create_response.status_code == 200
        
        product = create_response.json()
        assert product["name"] == "TEST_TempProduct"
        
        # Delete product
        delete_response = requests.delete(f"{BASE_URL}/api/admin/products/{product['id']}", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify deleted
        verify_response = requests.get(f"{BASE_URL}/api/products/{product['id']}")
        assert verify_response.status_code == 404


class TestDeliverySettings:
    """Delivery and PIX settings"""
    
    def test_get_delivery_settings(self):
        """Should return delivery settings"""
        response = requests.get(f"{BASE_URL}/api/delivery-settings")
        assert response.status_code == 200
        
        settings = response.json()
        assert "areas" in settings
        assert "delivery_fee" in settings
        assert "min_free_delivery" in settings
        
    def test_get_pix_settings(self):
        """Should return PIX settings"""
        response = requests.get(f"{BASE_URL}/api/pix-settings")
        assert response.status_code == 200
        
        settings = response.json()
        assert "pix_key" in settings
        assert "pix_name" in settings


class TestComplements:
    """Complements/Add-ons management"""
    
    def test_get_complements(self):
        """Should return all active complements"""
        response = requests.get(f"{BASE_URL}/api/complements")
        assert response.status_code == 200
        
        complements = response.json()
        assert isinstance(complements, list)
        assert len(complements) >= 35  # Based on Monte sua Salada add-ons
