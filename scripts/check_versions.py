from pathlib import Path
import re
import tomllib


ROOT = Path(__file__).resolve().parents[1]


def read_pyproject_version() -> str:
    data = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    return data["project"]["version"]


def expect(pattern: str, text: str, path: str) -> str:
    match = re.search(pattern, text)
    if not match:
        raise SystemExit(f"Could not find version in {path}")
    return match.group(1)


def main() -> None:
    version = read_pyproject_version()
    checks = {
        "README.md": expect(r"\*\*Current version\*\*: v([^\s)]+)", (ROOT / "README.md").read_text(encoding="utf-8"), "README.md"),
        "README.zh.md": expect(r"\*\*当前版本\*\*：v([^\s)]+)", (ROOT / "README.zh.md").read_text(encoding="utf-8"), "README.zh.md"),
        "app/web/core.js": expect(
            r"var VERSION = '([^']+)'",
            (ROOT / "app" / "web" / "core.js").read_text(encoding="utf-8"),
            "app/web/core.js",
        ),
    }
    mismatches = {path: found for path, found in checks.items() if found != version}
    if mismatches:
        details = ", ".join(f"{path}={found}" for path, found in mismatches.items())
        raise SystemExit(f"Version mismatch: pyproject.toml={version}; {details}")
    print(f"Version check ok: {version}")


if __name__ == "__main__":
    main()
