import importlib
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture()
def sample_library(monkeypatch):
    root = Path(__file__).parent / "fixtures" / "sample.library"
    monkeypatch.setenv("EAGLE_VAULT_ROOT", str(root))

    import app.config
    import app.vault.parser
    import app.vault
    import app.api.folders
    import app.api.items

    importlib.reload(app.config)
    importlib.reload(app.vault.parser)
    importlib.reload(app.vault)
    importlib.reload(app.api.folders)
    importlib.reload(app.api.items)

    app.vault.parser.load_vault()
    return root
