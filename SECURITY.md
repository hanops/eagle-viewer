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
- Keep `VIEWER_API_TOKEN` only in a password manager, automation secret store, or server-side secret store; rotate it if credentials are exposed.
- Do not run the Docker container with write access to the Eagle library unless you intentionally accept that risk.
- Eagle password-protected folders and their descendants are excluded before the remote index is built. The Viewer never accepts or stores Eagle folder passwords; unlock those folders only in the local Eagle app.
- Document Quick Look applies archive, entry, XML/JSON, node, and depth limits to OOXML and XMind files. It reads document text or XMind `content.xml` / `content.json` only; macros, external links, and attachments are never executed or extracted.
- Legacy `.doc` Quick Look invokes `textutil` on macOS or `antiword` in Docker without a shell, with file-size, timeout, and output limits. It returns extracted text only and never writes the converted result into the Vault.
- Proprietary-format Quick Look serves Eagle's existing cached thumbnail through the read-only thumbnail endpoint. The UI labels it as a cached preview, while downloads continue to resolve to the original asset path; the Viewer never generates or writes replacement previews into the Vault.
