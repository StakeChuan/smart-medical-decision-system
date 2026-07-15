import argparse
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import models  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.security.password import hash_password, password_needs_rehash  # noqa: E402


def migrate_passwords(apply_changes: bool) -> tuple[int, int]:
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        legacy_users = [user for user in users if password_needs_rehash(user.password)]
        if apply_changes:
            for user in legacy_users:
                user.password = hash_password(user.password)
            db.commit()
        return len(users), len(legacy_users)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate legacy user passwords to bcrypt hashes.")
    parser.add_argument("--apply", action="store_true", help="Commit the migration. Without this flag only counts are reported.")
    args = parser.parse_args()
    total, legacy = migrate_passwords(args.apply)
    mode = "applied" if args.apply else "dry-run"
    print(f"Password migration {mode}: users={total}, legacy_passwords={legacy}")


if __name__ == "__main__":
    main()
