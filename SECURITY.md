# Security Policy

## Supported Versions

Security fixes target the latest released version.

## Reporting a Vulnerability

Please do not open a public issue for a sensitive vulnerability.

Report security concerns by emailing the maintainer at `opsnote@gmail.com`.
Include a short description, impact, reproduction steps, and affected version
when possible.

## Security Notes

- Eagle Vault Viewer is intended to be read-only against Eagle libraries.
- Use `VIEWER_PASSWORD` and a strong `VIEWER_SECRET_KEY` when exposing the app beyond a trusted local network.
- Do not run the Docker container with write access to the Eagle library unless you intentionally accept that risk.
