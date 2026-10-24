# Security Policy

## Supported versions

Only the latest 2.3.x release receives security fixes.

| Version | Supported |
| --- | --- |
| 2.3.x | Yes |
| < 2.3 | No |

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Preferred: use GitHub's private vulnerability reporting on this repository
(Security → Advisories → Report a vulnerability).

Alternative: email **cuteomega@foxmail.com**. If you want the report encrypted,
use the PGP key with fingerprint:

```
969C 1313 DDE2 3C98 233A  5D6F 9315 AB57 5F17 E7F8
```

Please include:

- dev-sidecar version and operating system;
- steps to reproduce, or a minimal PoC;
- affected component (proxy engine, TLS/CA, update, Electron IPC, plugins);
- logs if relevant, with tokens and personal data removed;
- impact assessment if you have one.

## Scope

In scope:

- the proxy engine and core (`vendor/ds-core`, `packages/core`, `packages/mitmproxy`);
- TLS interception, certificate generation and CA handling;
- DNS/SNI handling, interception rules and configuration merging;
- plugin shell commands and privilege escalation helpers;
- the auto-update download and extraction path;
- the Electron IPC bridge and locally loaded renderer code.

Out of scope:

- prebuilt binaries under `packages/gui/extra/` (`EnableLoopback.exe`, `sysproxy.exe`);
- vulnerabilities in third-party dependencies (report them upstream, but tell us if dev-sidecar needs a version bump);
- issues that require the user to disable TLS verification (`proxy.verifySsl=false`);
- local privilege escalation unrelated to the proxy logic.

## Response

We aim to acknowledge reports within 7 days and will keep you updated on the
fix and disclosure timeline. There is no bug bounty, but we are happy to credit
reporters in the release notes unless you prefer to stay anonymous.