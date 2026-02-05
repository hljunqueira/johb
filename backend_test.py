#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class SaladaSoulAPITester:
    def __init__(self, base_url="https://soul-delivery.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            self.failed_tests.append({"test": name, "details": details})
            print(f"❌ {name} - {details}")

    def test_categories(self):
        """Test GET /api/categories - should return 4 categories"""
        try:
            response = requests.get(f"{self.base_url}/categories")
            if response.status_code == 200:
                categories = response.json()
                if len(categories) == 4:
                    expected_names = {"Saladas", "Bowls", "Sucos", "Sobremesas"}
                    actual_names = {cat["name"] for cat in categories}
                    if expected_names == actual_names:
                        self.log_test("GET /api/categories (4 categories with correct names)", True)
                        return True
                    else:
                        self.log_test("GET /api/categories", False, f"Wrong category names: {actual_names}")
                else:
                    self.log_test("GET /api/categories", False, f"Expected 4 categories, got {len(categories)}")
            else:
                self.log_test("GET /api/categories", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/categories", False, f"Exception: {str(e)}")
        return False

    def test_products(self):
        """Test GET /api/products - should return 9 products"""
        try:
            response = requests.get(f"{self.base_url}/products")
            if response.status_code == 200:
                products = response.json()
                if len(products) == 9:
                    # Check required fields exist
                    required_fields = {"name", "price", "tags", "image_url", "id", "category_id"}
                    all_have_fields = all(required_fields.issubset(product.keys()) for product in products)
                    if all_have_fields:
                        self.log_test("GET /api/products (9 products with correct fields)", True)
                        return products
                    else:
                        self.log_test("GET /api/products", False, "Missing required fields in some products")
                else:
                    self.log_test("GET /api/products", False, f"Expected 9 products, got {len(products)}")
            else:
                self.log_test("GET /api/products", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/products", False, f"Exception: {str(e)}")
        return []

    def test_products_by_category(self, products):
        """Test GET /api/products?category_id=X - filters products by category"""
        if not products:
            self.log_test("GET /api/products?category_id=X", False, "No products to test filtering")
            return
        
        category_ids = list(set(p["category_id"] for p in products))
        for category_id in category_ids[:2]:  # Test first 2 categories
            try:
                response = requests.get(f"{self.base_url}/products?category_id={category_id}")
                if response.status_code == 200:
                    filtered_products = response.json()
                    all_same_category = all(p["category_id"] == category_id for p in filtered_products)
                    if all_same_category and len(filtered_products) > 0:
                        self.log_test(f"GET /api/products?category_id={category_id}", True)
                    else:
                        self.log_test(f"GET /api/products?category_id={category_id}", False, "Filter not working correctly")
                else:
                    self.log_test(f"GET /api/products?category_id={category_id}", False, f"Status {response.status_code}")
            except Exception as e:
                self.log_test(f"GET /api/products?category_id={category_id}", False, f"Exception: {str(e)}")

    def test_create_order(self, products):
        """Test POST /api/orders - creates order with items"""
        if not products:
            self.log_test("POST /api/orders", False, "No products available for order")
            return None
        
        try:
            # Create order with first product
            product = products[0]
            order_data = {
                "customer_name": "Test Customer",
                "customer_phone": "11999999999",
                "delivery_type": "retirada",
                "address": "",
                "neighborhood": "",
                "items": [{
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity": 2,
                    "price": product["price"],
                    "observation": ""
                }],
                "observation": "Test order"
            }
            
            response = requests.post(f"{self.base_url}/orders", json=order_data)
            if response.status_code == 200:
                order = response.json()
                if "id" in order and "order_number" in order:
                    self.log_test("POST /api/orders (creates order with id and order_number)", True)
                    return order
                else:
                    self.log_test("POST /api/orders", False, "Missing id or order_number in response")
            else:
                self.log_test("POST /api/orders", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/orders", False, f"Exception: {str(e)}")
        return None

    def test_get_order(self, order):
        """Test GET /api/orders/{id} - returns order details"""
        if not order:
            self.log_test("GET /api/orders/{id}", False, "No order to test")
            return
        
        try:
            response = requests.get(f"{self.base_url}/orders/{order['id']}")
            if response.status_code == 200:
                order_details = response.json()
                if order_details["id"] == order["id"]:
                    self.log_test("GET /api/orders/{id} (returns order details)", True)
                else:
                    self.log_test("GET /api/orders/{id}", False, "Order ID mismatch")
            else:
                self.log_test("GET /api/orders/{id}", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/orders/{id}", False, f"Exception: {str(e)}")

    def test_orders_by_phone(self):
        """Test GET /api/orders/phone/{phone} - returns order history by phone"""
        try:
            response = requests.get(f"{self.base_url}/orders/phone/11999999999")
            if response.status_code == 200:
                orders = response.json()
                # Should have at least the order we created
                self.log_test("GET /api/orders/phone/{phone} (returns order history)", True)
            else:
                self.log_test("GET /api/orders/phone/{phone}", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/orders/phone/{phone}", False, f"Exception: {str(e)}")

    def test_rate_order(self, order):
        """Test POST /api/orders/{id}/rate - submits rating"""
        if not order:
            self.log_test("POST /api/orders/{id}/rate", False, "No order to rate")
            return
        
        try:
            rating_data = {"rating": 5, "comment": "Excellent!"}
            response = requests.post(f"{self.base_url}/orders/{order['id']}/rate", json=rating_data)
            if response.status_code == 200:
                self.log_test("POST /api/orders/{id}/rate (submits rating)", True)
            else:
                self.log_test("POST /api/orders/{id}/rate", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/orders/{id}/rate", False, f"Exception: {str(e)}")

    def test_admin_login(self):
        """Test POST /api/auth/login with admin credentials"""
        try:
            login_data = {
                "email": "admin@saladasoul.com",
                "password": "admin123"
            }
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    self.token = data["token"]
                    self.log_test("POST /api/auth/login (admin login returns token)", True)
                    return True
                else:
                    self.log_test("POST /api/auth/login", False, "No token in response")
            else:
                self.log_test("POST /api/auth/login", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/auth/login", False, f"Exception: {str(e)}")
        return False

    def test_admin_orders(self):
        """Test GET /api/admin/orders - returns orders list (requires auth)"""
        if not self.token:
            self.log_test("GET /api/admin/orders", False, "No admin token available")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.base_url}/admin/orders", headers=headers)
            if response.status_code == 200:
                orders = response.json()
                self.log_test("GET /api/admin/orders (returns orders list with auth)", True)
            else:
                self.log_test("GET /api/admin/orders", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/admin/orders", False, f"Exception: {str(e)}")

    def test_admin_order_status_update(self, order):
        """Test PUT /api/admin/orders/{id}/status - updates order status"""
        if not self.token or not order:
            self.log_test("PUT /api/admin/orders/{id}/status", False, "No admin token or order available")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            status_data = {"status": "preparando"}
            response = requests.put(f"{self.base_url}/admin/orders/{order['id']}/status", 
                                  json=status_data, headers=headers)
            if response.status_code == 200:
                self.log_test("PUT /api/admin/orders/{id}/status (updates order status)", True)
            else:
                self.log_test("PUT /api/admin/orders/{id}/status", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("PUT /api/admin/orders/{id}/status", False, f"Exception: {str(e)}")

    def test_admin_order_payment(self, order):
        """Test PUT /api/admin/orders/{id}/payment - marks as paid"""
        if not self.token or not order:
            self.log_test("PUT /api/admin/orders/{id}/payment", False, "No admin token or order available")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.put(f"{self.base_url}/admin/orders/{order['id']}/payment", headers=headers)
            if response.status_code == 200:
                self.log_test("PUT /api/admin/orders/{id}/payment (marks as paid)", True)
            else:
                self.log_test("PUT /api/admin/orders/{id}/payment", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("PUT /api/admin/orders/{id}/payment", False, f"Exception: {str(e)}")

    def test_admin_products_get(self):
        """Test GET /api/admin/products - returns all products"""
        if not self.token:
            self.log_test("GET /api/admin/products", False, "No admin token available")
            return []
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.base_url}/admin/products", headers=headers)
            if response.status_code == 200:
                products = response.json()
                self.log_test("GET /api/admin/products (returns all products)", True)
                return products
            else:
                self.log_test("GET /api/admin/products", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/admin/products", False, f"Exception: {str(e)}")
        return []

    def test_admin_product_create(self):
        """Test POST /api/admin/products - creates new product"""
        if not self.token:
            self.log_test("POST /api/admin/products", False, "No admin token available")
            return None
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            # First get categories to use a valid category_id
            categories_response = requests.get(f"{self.base_url}/categories")
            if categories_response.status_code != 200:
                self.log_test("POST /api/admin/products", False, "Could not fetch categories")
                return None
            
            categories = categories_response.json()
            if not categories:
                self.log_test("POST /api/admin/products", False, "No categories available")
                return None
            
            product_data = {
                "name": "Test Product",
                "description": "Test description",
                "price": 19.90,
                "category_id": categories[0]["id"],
                "image_url": "",
                "stock": -1,
                "tags": ["test"],
                "additionals": [],
                "active": True
            }
            
            response = requests.post(f"{self.base_url}/admin/products", json=product_data, headers=headers)
            if response.status_code == 200:
                product = response.json()
                self.log_test("POST /api/admin/products (creates new product)", True)
                return product
            else:
                self.log_test("POST /api/admin/products", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("POST /api/admin/products", False, f"Exception: {str(e)}")
        return None

    def test_admin_product_update(self, product):
        """Test PUT /api/admin/products/{id} - updates product"""
        if not self.token or not product:
            self.log_test("PUT /api/admin/products/{id}", False, "No admin token or product available")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            update_data = {"name": "Updated Test Product", "price": 25.90}
            response = requests.put(f"{self.base_url}/admin/products/{product['id']}", 
                                  json=update_data, headers=headers)
            if response.status_code == 200:
                self.log_test("PUT /api/admin/products/{id} (updates product)", True)
            else:
                self.log_test("PUT /api/admin/products/{id}", False, f"Status {response.status_code}")
        except Exception as e:
            self.log_test("PUT /api/admin/products/{id}", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Salada Soul API Tests...")
        print(f"🔗 Base URL: {self.base_url}")
        print("-" * 60)
        
        # Public API Tests
        print("\n📍 Testing Public APIs...")
        categories_ok = self.test_categories()
        products = self.test_products()
        self.test_products_by_category(products)
        
        # Order Tests
        print("\n📝 Testing Order APIs...")
        order = self.test_create_order(products)
        self.test_get_order(order)
        self.test_orders_by_phone()
        self.test_rate_order(order)
        
        # Admin Auth Tests
        print("\n🔐 Testing Admin Authentication...")
        admin_login_ok = self.test_admin_login()
        
        if admin_login_ok:
            # Admin API Tests
            print("\n👑 Testing Admin APIs...")
            self.test_admin_orders()
            self.test_admin_order_status_update(order)
            self.test_admin_order_payment(order)
            
            admin_products = self.test_admin_products_get()
            test_product = self.test_admin_product_create()
            self.test_admin_product_update(test_product)
        
        print("\n" + "=" * 60)
        print(f"📊 RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"  - {failure['test']}: {failure['details']}")
        else:
            print("\n🎉 ALL TESTS PASSED!")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SaladaSoulAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())