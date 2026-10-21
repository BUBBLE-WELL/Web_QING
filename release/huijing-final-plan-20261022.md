# Huijing final master plan release

The author confirmed the 0704 DXF as the final master plan. Its derived linework is registered using 45 unchanged CAD context segments, with design, survey context and building detail independently switchable. The group is off by default and its 6 MB data loads on demand, with retry support.

The release also carries the frontend building-query panel. Production defaults to static data. PostGIS/GeoServer services, credentials and raw CAD remain local and are excluded from public assets. Model georeferencing and the PR #12 render assets are preserved. The linework omits text, fills and image/OLE content.

Validation: all four release Node suites; static data, real GLBs, selection, clipping, lazy load/retry, portfolio content, transitions and preserved return position. Public manifest: 47 files, including the final-plan GeoJSON.
