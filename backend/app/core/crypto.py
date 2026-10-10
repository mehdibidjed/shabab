"""Field-level encryption for confidential Module 2 fields (Fernet, AES-128-CBC + HMAC).

The key comes from env `CASE_KEY`. For the zero-setup demo, if it is missing we
generate a development key in `backend/.case_key` (gitignored) and warn loudly:
never do this in production, where the key belongs in a secrets manager.
"""
import logging
import os
from pathlib import Path

from cryptography.fernet import Fernet
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

log = logging.getLogger(__name__)
DEV_KEY_FILE = Path(__file__).resolve().parents[2] / ".case_key"


def _load_key() -> bytes:
    key = os.getenv("CASE_KEY")
    if key:
        return key.encode()
    if not DEV_KEY_FILE.exists():
        DEV_KEY_FILE.write_bytes(Fernet.generate_key())
        DEV_KEY_FILE.chmod(0o600)
    log.warning("CASE_KEY not set: using the development key in %s (demo only)", DEV_KEY_FILE)
    return DEV_KEY_FILE.read_bytes().strip()


_fernet: Fernet | None = None


def fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(_load_key())
    return _fernet


class EncryptedText(TypeDecorator):
    """Stores Fernet ciphertext; Python code sees plaintext. Privacy is enforced
    by never loading these columns for anyone but the owning psychologist."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return None if value is None else fernet().encrypt(value.encode()).decode()

    def process_result_value(self, value, dialect):
        return None if value is None else fernet().decrypt(value.encode()).decode()
