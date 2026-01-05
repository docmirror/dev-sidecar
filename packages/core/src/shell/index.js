import enableLoopback from './scripts/enable-loopback.js';
import extraPath from './scripts/extra-path/index.js';
import getNpmEnv from './scripts/get-npm-env.js';
import getSystemEnv from './scripts/get-system-env.js';
import killByPort from './scripts/kill-by-port.js';
import setNpmEnv from './scripts/set-npm-env.js';
import setSystemEnv from './scripts/set-system-env.js';
import setSystemProxy from './scripts/set-system-proxy.js';
import setupCa from './scripts/setup-ca.js';
import shell from './shell.js';
import sudo from './sudo.js';

export default {
  killByPort,
  setupCa,
  getSystemEnv,
  setSystemEnv,
  getNpmEnv,
  setNpmEnv,
  setSystemProxy,
  enableLoopback,
  extraPath,
  sudo,
  async exec (cmds, args) {
    return shell.getSystemShell().exec(cmds, args)
  },
  getSystemPlatform: shell.getSystemPlatform,
};
