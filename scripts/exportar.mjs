#!/usr/bin/env node
/**
 * Construye el sitio con la exportacion a Blogger activada.
 *
 * Existe solo para que funcione igual en Windows, macOS y Linux: poner una
 * variable de entorno delante del comando (VAR=1 npm run build) no funciona en
 * PowerShell, y no queria meter una dependencia solo para esto.
 */

import { spawnSync } from 'node:child_process';

const resultado = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EXPORTAR_BLOGGER: '1' },
});

process.exit(resultado.status ?? 1);
