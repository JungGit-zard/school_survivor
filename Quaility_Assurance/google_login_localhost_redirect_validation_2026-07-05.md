# Google login localhost redirect validation - 2026-07-05

## Result

Removed the local dev redirect that could move Firebase Google login from `localhost` to `127.0.0.1`.

## Passed

- App/studio/auth targeted tests: 23 passed.
- Production build passed.

