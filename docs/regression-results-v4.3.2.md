# Regression Results — v4.3.2

Date: 2026-08-07

## Automated checks

- `make check` passed: 41 Python tests, 8 JavaScript tests, Ruff, version check, deploy check, Python compilation, and JavaScript behavior tests.
- `git diff --check` passed.
- FastAPI runtime smoke passed with the sample Eagle library.

## Media runtime checks

- MP4 file response returns `206 Partial Content` with `Accept-Ranges`, `Content-Range`, and the requested byte count.
- PDF file response remains inline and uses `X-Frame-Options: SAMEORIGIN` plus `frame-ancestors 'self'`.
- Locked Eagle folders remain inaccessible through folder and item endpoints.

## Mobile regression scope

- Request-generation guards cover rapid Library / Folders / Search switching and out-of-order search responses.
- Unsupported formats show an explicit download-only state instead of an empty preview.
- Video playback failures show a localized download fallback; previous/next controls remain available for video and PDF items.
- iPad-width gallery uses row-ordered CSS Grid; phone-width gallery retains the denser two-column layout.
- Service Worker installation no longer activates or removes the previous shell when precaching fails.

## Browser smoke

- Playwright iPhone 15 Pro Max emulation loaded `mobile.html` successfully.
- Confirmed the Library, Folders, and Search bottom tabs render and switch correctly.
- Confirmed the Eagle brand button opens the connection-status page and returns to Library.
- Confirmed PDF opens an iframe preview with previous/next controls and download action.
- Confirmed unsupported TXT/WAV/DOC/XMIND cards are download-only and do not open a blank preview.
- No blocking browser error occurred during the smoke path; one expected Node localStorage warning appeared in the test runner.

## Release note

The final visual pass should still be rechecked in physical Safari on iPhone 15 Pro Max and iPad after deployment, including browser-toolbar expanded/collapsed states and real-world video codecs.
