import * as pc from 'picocolors';

export function printBanner(port: number, env: string) {
  const banner = [
    '',
    `${pc.cyan('┌─────────────────────────────────────────┐')}`,
    `${pc.cyan('│')}        ${pc.bold('Qing Nest API Server')}         ${pc.cyan('│')}`,
    `${pc.cyan('├─────────────────────────────────────────┤')}`,
    `${pc.cyan('│')}  ${pc.gray('Environment:')} ${pc.green(env.padEnd(26))} ${pc.cyan('│')}`,
    `${pc.cyan('│')}  ${pc.gray('Port:        ')} ${pc.yellow(String(port).padEnd(26))} ${pc.cyan('│')}`,
    `${pc.cyan('│')}  ${pc.gray('API:         ')} ${pc.blue(`http://localhost:${port}/api`.padEnd(26))} ${pc.cyan('│')}`,
    `${pc.cyan('│')}  ${pc.gray('Swagger:     ')} ${pc.magenta(`http://localhost:${port}/docs`.padEnd(26))} ${pc.cyan('│')}`,
    `${pc.cyan('│')}  ${pc.gray('Static:      ')} ${pc.blue(`http://localhost:${port}/`.padEnd(26))} ${pc.cyan('│')}`,
    `${pc.cyan('└─────────────────────────────────────────┘')}`,
    '',
  ].join('\n');

  console.log(banner);
}
