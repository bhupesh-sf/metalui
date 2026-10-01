# Releasing MetalUI

MetalUI is an alpha package. React, icons and CSS publish to npm as `@unlocalhosted/metalui`; SwiftUI comes from the same public GitHub repository through Swift Package Manager. A `vX.Y.Z` tag triggers `.github/workflows/publish.yml` and must match the npm workspace version. The tag must point to a commit on `main`.

## First release

The first npm version cannot use trusted publishing: npm needs an existing package before its trusted publisher can be configured. An `@unlocalhosted` organization maintainer must sign in locally and publish the built package once.

```sh
npm ci
npm run build
npm run typecheck
npm run verify:package
npm whoami
npm publish --workspace @unlocalhosted/metalui --access public
```

Check the registry before tagging:

```sh
npm view @unlocalhosted/metalui@0.1.0 version
npm run verify:registry
```

Then connect the npm package to GitHub Actions as a trusted publisher. In npm package settings, choose GitHub Actions, owner `vijayksingh`, repository `metalui`, workflow filename `publish.yml`, no environment, and allow `npm publish`. Alternatively, with npm CLI 11.15.0 or newer and an authenticated maintainer account:

```sh
npm trust github @unlocalhosted/metalui --repo vijayksingh/metalui --file publish.yml --allow-publish
```

After trusted publishing is active, restrict token-based publishing in npm package settings. A public GitHub repository is required for npm provenance. Tag the release commit and push the tag after the npm package is visible; the workflow verifies the release and skips a version already published by the first-release command.

## Later releases

Change only the npm workspace version, move the **Unreleased** notes in `packages/metalui/CHANGELOG.md` under a heading for the new version, update `package-lock.json`, run the four checks above, and commit the release. Every change a user can notice gets a line under Unreleased as it lands (Added, Changed, Fixed, Removed). Create and push an annotated `vX.Y.Z` tag from `main`. GitHub Actions builds, checks the tarball in a fresh consumer, and publishes through npm OIDC with provenance. Verify the version and provenance on npm before announcing the release. Do not reuse a published version number.

The browser feature suite remains a separate local check (`npm run test:e2e -- --workers=1`). It is not a release gate while existing docs fixtures are in progress. Known visual literal and recipe gaps are listed exactly in `scripts/lint-literals.allow.json` and `scripts/recipe-parity.allow.json`; the checks still reject new gaps.

## When something goes wrong

Never unpublish and never reuse a version number. Move forward with a patch, and use these to limit the damage in the meantime. Each has been checked to exist; the first time you need one, read it against the live system before running it.

**A bad npm version.** Publish a fixed patch the normal way (changelog, version, tag). Meanwhile warn people on the bad one, which needs `npm login` as a maintainer (trusted publishing covers publishing only, not this):

```sh
npm deprecate @unlocalhosted/metalui@0.3.0 "Importing theme.css changed the host app's spacing; use 0.3.1 or later"
npm deprecate @unlocalhosted/metalui@0.3.0 ""   # lifts the warning
```

**A bad site or registry deploy.** The docs, `/r/*.json`, `AI.md` and `llms.txt` ship in one Cloudflare Pages deploy. In the Cloudflare dashboard, Workers & Pages, `metalui`, Deployments, pick the last good production deployment and choose Rollback; or redeploy the last good commit from the command line (see DEPLOYMENT.md, "manual recovery"). Check `/`, `/r/button.json` and `/r/tokens.json` afterwards.

**A registry item that must stop being served now.** Remove its `meta.json` (or the block's), run `npm run generate` (the generator deletes the served files of anything no longer in the source) and push; the deploy takes about two minutes.

**A release workflow that failed after publishing.** The npm publish and the GitHub Release are separate jobs, so a failed `release` job leaves the package published. Create the release by hand: `node scripts/changelog-section.mjs 0.3.2 > notes.md && gh release create v0.3.2 --title "MetalUI 0.3.2" --notes-file notes.md --verify-tag`.

**A wrong tag.** Release tags are protected against deletion and moving (a repository ruleset). Don't fight it: ship the next patch version.

**Knowing early.** `.github/workflows/health.yml` checks the site, the registry, the agent files and the latest npm install every 30 minutes; a failing run emails the owner. Trigger it by hand from the Actions tab after any deploy.

