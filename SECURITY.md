# Security Policy

## Supported versions

Only the latest stable release is supported. Once the latest stable version
is published, all older builds are no longer supported immediately.
Pre-release, beta, local and unofficial development builds are unsupported.

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Two channels are accepted:

1. **GitHub private vulnerability reporting** on this repository
   (Security -> Advisories -> Report a vulnerability). This is preferred.
2. **PGP-encrypted email** to **cuteomega@foxmail.com**. Plain-text email
   reports are not accepted; encrypt the report with the public key below.

The public key fingerprint is:

```
6C04 3D82 B6A3 5CC8 9C79  7773 47E3 F360 491D F7F9
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
- the Electron IPC bridge and locally loaded renderer code;
- vulnerabilities in bundled binaries under `packages/gui/extra/`
  (`EnableLoopback.exe`, `sysproxy.exe`) — report them like any other finding.

Out of scope:

- vulnerabilities in third-party dependencies (report them upstream, but tell us
  if dev-sidecar needs a version bump);
- issues that require the user to disable TLS verification (`proxy.verifySsl=false`);
- local privilege escalation unrelated to the proxy logic.

## Response

There is no fixed SLA and no guaranteed fix deadline. We will acknowledge a
report as soon as we can, share our assessment, and schedule a fix based on
severity and the release plan. There is no bug bounty, but we are happy to
credit reporters in the release notes unless you prefer to stay anonymous.

## PGP public key

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

  mDMEatv48xYJKwYBBAHaRw8BAQdAc1VD4WyhnlKwgvzVsghPZfvs/NVOZfJtLiSy
  So9CN1a0ImN1dGUtb21lZ2EgPGN1dGVvbWVnYUBmb3htYWlsLmNvbT6IrwQTFgoA
  VxYhBGwEPYK2o1zInHl3c0fj82BJHff5BQJq2/jzGxSAAAAAAAQADm1hbnUyLDIu
  NSsxLjEyLDIsMQIbAwULCQgHAgIiAgYVCgkICwIEFgIDAQIeBwIXgAAKCRBH4/Ng
  SR33+e4DAQCU4sdbhcbbHpkIqze9PhvJvaIxiUB+T/3+SuyRcYEFsQEApH3YKJim
  1QFoTv34JrLEMHSMKnFZz0epnxUy3TGxMAS4OARq2/jzEgorBgEEAZdVAQUBAQdA
  J46Jku2z1LSeI73O7PG/7gPe5TLHKDTovjL7+AJXyEkDAQgHiJQEGBYKADwWIQRs
  BD2CtqNcyJx5d3NH4/NgSR33+QUCatv48xsUgAAAAAAEAA5tYW51MiwyLjUrMS4x
  MiwyLDECGwwACgkQR+PzYEkd9/lktwEAj/i1e0MAMiQ/3Xjq1cy2RhBdZ7Dzugr7
  GTzMPxwmh3sBAKjgCrQC3tel8wP1hmiheioGoX/Lv55hD2+khk1ET/YP
  =utib
  -----END PGP PUBLIC KEY BLOCK-----
```
