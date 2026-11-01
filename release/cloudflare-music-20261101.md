# Cloudflare music release — 2026-11-01

Publishes the nine reviewed music landing files from merged release 3330abd7aaa0d5a5d9ec59640c62765270f656d5. Retains existing portfolio allowlist. Excludes backend and media from static uploads.

Only /music/band-with and children and /music/media/* redirect to existing HTTPS jiyiji.cn/webqing endpoints. Query parameters are preserved for private review access; no credentials embedded. Other paths use the static asset binding. Temporary HTTP 302 permits future hosting changes.

Routing tests cover eight cases. Previous production version: 3a2911ed-0e34-4a12-8fb0-7fada599e4e0. China deployment unchanged.
