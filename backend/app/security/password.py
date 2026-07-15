import hmac
import re

import bcrypt


BCRYPT_ROUNDS = 12
_BCRYPT_HASH_PATTERN = re.compile(r"^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$")
_BCRYPT_PREFIXES = ("$2a$", "$2b$", "$2y$")


def hash_password(password: str) -> str:
    """Hash a password with bcrypt without retaining the plain text."""
    if not isinstance(password, str) or not password:
        raise ValueError("password must not be empty")
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("password exceeds bcrypt's 72-byte limit")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("ascii")


def is_password_hash(stored_password: str) -> bool:
    return bool(_BCRYPT_HASH_PATTERN.fullmatch(stored_password or ""))


def password_needs_rehash(stored_password: str) -> bool:
    # A bcrypt-looking but malformed value must not be treated as legacy plain text.
    return not (stored_password or "").startswith(_BCRYPT_PREFIXES)


def verify_password(password: str, stored_password: str) -> bool:
    """Verify bcrypt hashes and temporarily support legacy plain-text rows."""
    if not isinstance(password, str) or not isinstance(stored_password, str):
        return False
    if is_password_hash(stored_password):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), stored_password.encode("ascii"))
        except (ValueError, UnicodeError):
            return False
    if not password_needs_rehash(stored_password):
        return False
    return hmac.compare_digest(password, stored_password)
