# Vespara Windows installer assets

The active Windows application icon is derived from the approved production
doorway/beacon geometry in
`renderer/src/assets/brand/vespara-icon-dark-field.svg`. The installer header
and sidebar use the same geometry in compositions sized for NSIS:

- `vespara-installer-header.bmp`: 150×57, 24-bit BMP
- `vespara-installer-sidebar.bmp`: 164×314, 24-bit BMP

All generated platform assets are deterministic and local. Regenerate them
from the repository root with:

```text
node scripts/generateInstallerBrandAssets.js
```

The script uses the repository's existing `svg2img`, `png2icons`, and `pngjs`
packages. It performs no download and embeds no font, remote resource, base64
payload, or version number.
