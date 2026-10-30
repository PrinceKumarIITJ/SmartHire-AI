import os
import tempfile

# Point the app at a throwaway SQLite file before any backend module reads DATABASE_URL.
_TEST_DB = os.path.join(tempfile.mkdtemp(prefix="smarthire-test-"), "test.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TEST_DB}"
# CPU keeps tests deterministic and avoids contending with a running dev server for GPU memory.
os.environ.setdefault("EMBEDDING_DEVICE", "cpu")
