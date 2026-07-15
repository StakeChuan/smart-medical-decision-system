import os
import subprocess
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


BACKEND_ROOT = Path(__file__).resolve().parents[1]
os.environ["ENVIRONMENT"] = "production"
os.environ["APP_TOKEN_SECRET"] = "test-only-token-secret-with-at-least-32-characters"

from app import models  # noqa: E402
from app import main as main_module  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.security import password as password_security  # noqa: E402
from app.security.config import DEVELOPMENT_TOKEN_SECRET, get_token_expire_seconds, get_token_secret  # noqa: E402
from app.security.password import hash_password, is_password_hash, verify_password  # noqa: E402


class SecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        password_security.BCRYPT_ROUNDS = 4
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.session_factory = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

        def override_get_db():
            db = cls.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()
        cls.engine.dispose()

    def setUp(self) -> None:
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        with self.session_factory() as db:
            db.add_all([
                models.User(username="admin", password=hash_password("admin-old"), real_name="Admin", role="admin", is_active=1),
                models.User(username="legacy-doctor", password="legacy-old", real_name="Legacy Doctor", role="doctor", is_active=1),
            ])
            db.commit()

    def login(self, username: str, password: str):
        return self.client.post("/auth/login", json={"用户名": username, "密码": password})

    def test_password_hash_and_legacy_login_migration(self) -> None:
        password_hash = hash_password("correct-password")
        self.assertTrue(is_password_hash(password_hash))
        self.assertTrue(verify_password("correct-password", password_hash))
        self.assertFalse(verify_password("wrong-password", password_hash))

        response = self.login("legacy-doctor", "legacy-old")
        self.assertEqual(response.status_code, 200)
        with self.session_factory() as db:
            user = db.query(models.User).filter_by(username="legacy-doctor").one()
            self.assertTrue(is_password_hash(user.password))
            self.assertTrue(verify_password("legacy-old", user.password))
        self.assertEqual(self.login("legacy-doctor", "wrong").status_code, 401)

    def test_create_reset_and_change_password_keep_api_compatible(self) -> None:
        admin_token = self.login("admin", "admin-old").json()["访问令牌"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = self.client.post(
            "/admin/doctors",
            headers=admin_headers,
            json={"用户名": "new-doctor", "初始密码": "initial-pass", "医生姓名": "New Doctor"},
        )
        self.assertEqual(create_response.status_code, 200)
        doctor_id = create_response.json()["用户ID"]
        with self.session_factory() as db:
            doctor = db.get(models.User, doctor_id)
            self.assertTrue(is_password_hash(doctor.password))
            self.assertTrue(verify_password("initial-pass", doctor.password))

        reset_response = self.client.put(
            f"/admin/doctors/{doctor_id}/password",
            headers=admin_headers,
            json={"新密码": "reset-pass"},
        )
        self.assertEqual(reset_response.status_code, 200)
        self.assertEqual(self.login("new-doctor", "initial-pass").status_code, 401)
        reset_login = self.login("new-doctor", "reset-pass")
        self.assertEqual(reset_login.status_code, 200)
        old_token = reset_login.json()["访问令牌"]

        change_response = self.client.put(
            "/auth/password",
            headers={"Authorization": f"Bearer {old_token}"},
            json={"原密码": "reset-pass", "新密码": "final-pass"},
        )
        self.assertEqual(change_response.status_code, 200)
        self.assertEqual(self.login("new-doctor", "reset-pass").status_code, 401)
        self.assertEqual(self.login("new-doctor", "final-pass").status_code, 200)
        self.assertEqual(self.client.get("/auth/me", headers={"Authorization": f"Bearer {old_token}"}).status_code, 200)

        with self.session_factory() as db:
            doctor = db.get(models.User, doctor_id)
            self.assertTrue(is_password_hash(doctor.password))
            details = " ".join(log.detail or "" for log in db.query(models.OperationLog).all())
            self.assertNotIn("initial-pass", details)
            self.assertNotIn("reset-pass", details)
            self.assertNotIn("final-pass", details)
            self.assertNotIn(old_token, details)
            self.assertIsNotNone(db.query(models.OperationLog).filter_by(action="修改密码").first())

    def test_production_secret_and_expiry_validation(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "APP_TOKEN_SECRET is required in production"):
            get_token_secret({"ENVIRONMENT": "production"})
        with self.assertRaisesRegex(RuntimeError, "demo value"):
            get_token_secret({"ENVIRONMENT": "production", "APP_TOKEN_SECRET": "smart-medical-demo-secret"})
        self.assertEqual(get_token_secret({"ENVIRONMENT": "development"}), DEVELOPMENT_TOKEN_SECRET)
        self.assertEqual(get_token_expire_seconds({"TOKEN_EXPIRE_SECONDS": "3600"}), 3600)
        with self.assertRaisesRegex(RuntimeError, "greater than zero"):
            get_token_expire_seconds({"TOKEN_EXPIRE_SECONDS": "0"})

        environment = os.environ.copy()
        environment["ENVIRONMENT"] = "production"
        environment.pop("APP_TOKEN_SECRET", None)
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                "import dotenv; dotenv.load_dotenv = lambda *args, **kwargs: False; import app.main",
            ],
            cwd=BACKEND_ROOT,
            env=environment,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("APP_TOKEN_SECRET is required in production", result.stderr)

    def test_token_signature_algorithm_and_expiry_remain_enforced(self) -> None:
        with self.session_factory() as db:
            user = db.query(models.User).filter_by(username="admin").one()
            token = main_module.create_access_token(user)
        payload = main_module.decode_access_token(token)
        self.assertEqual(payload["alg"], "HS256")
        with self.assertRaisesRegex(Exception, "登录凭证无效"):
            main_module.decode_access_token(f"{token}tampered")

        original_expiry = main_module.TOKEN_EXPIRE_SECONDS
        try:
            main_module.TOKEN_EXPIRE_SECONDS = -1
            with self.session_factory() as db:
                user = db.query(models.User).filter_by(username="admin").one()
                expired_token = main_module.create_access_token(user)
            with self.assertRaisesRegex(Exception, "登录已过期"):
                main_module.decode_access_token(expired_token)
        finally:
            main_module.TOKEN_EXPIRE_SECONDS = original_expiry


if __name__ == "__main__":
    unittest.main()
