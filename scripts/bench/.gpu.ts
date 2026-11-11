import { chromium } from '@playwright/test';
for (const args of [[], ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'], ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']]) {
  try {
    const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args });
    const p = await b.newPage();
    const r = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); const d = gl?.getExtension('WEBGL_debug_renderer_info'); return d ? gl!.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'none'; });
    console.log(args.join(' ') || 'default', '=>', r);
    await b.close();
  } catch (e) { console.log(args.join(' '), 'ERR', String(e).slice(0, 100)); }
}
