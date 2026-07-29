import re
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_docker_requirements_match_project_runtime_dependencies():
    project = tomllib.loads(read("pyproject.toml"))
    declared = set(project["project"]["dependencies"])
    docker_requirements = {
        line.strip()
        for line in read("requirements.txt").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    }

    assert docker_requirements == declared


def test_frontend_shell_has_no_external_runtime_assets():
    for path in ("app/web/index.html", "app/web/mobile.html", "app/web/login.html"):
        html = read(path)
        external_assets = re.findall(r"""(?:src|href)=["']https?://""", html, flags=re.IGNORECASE)
        assert external_assets == [], f"{path} loads external runtime assets"


def test_docker_context_excludes_private_and_generated_data():
    ignored = {
        line.strip()
        for line in read(".dockerignore").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    }

    assert {".git", ".venv", ".env", "data/", "vault/", "images/", "tests/", "*.tar"} <= ignored
