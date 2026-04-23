from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

admins = [
    {"name": "Lara", "email": "lara@saladasoul.com", "password": "Lara@Salada2026!"},
    {"name": "Henrique", "email": "henrique@saladasoul.com", "password": "Henrique@Salada2026!"}
]

print("-- Inserir Super Admins")
for admin in admins:
    user_id = str(uuid.uuid4())
    pw_hash = pwd_context.hash(admin["password"])
    print(f"INSERT INTO admin_users (id, email, name, role, password_hash) VALUES ('{user_id}', '{admin['email']}', '{admin['name']}', 'super_admin', '{pw_hash}') ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'super_admin';")
