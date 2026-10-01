# Security policy

## Reporting a vulnerability

Please report it privately through GitHub: [Report a vulnerability](https://github.com/vijayksingh/metalui/security/advisories/new) (the Security tab of this repository). Don't open a public issue or discussion for it.

Include what you found, how to reproduce it, and the version (`@unlocalhosted/metalui` version or commit). You can expect an acknowledgement within 5 working days and a fix or a plan within 30 days for anything confirmed.

## Supported versions

MetalUI is an alpha (`0.x`). Only the latest published version of `@unlocalhosted/metalui` receives fixes.

## Scope

In scope: the npm package, the shadcn registry served from `https://metalui.dev/r/`, the SwiftUI package, and the docs site. The package has one runtime dependency, [Base UI](https://base-ui.com); report problems in Base UI to its maintainers.

Releases are published from GitHub Actions with npm provenance, so the published tarball can be traced to a commit.
