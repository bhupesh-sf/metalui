# Third-party notices

MetalUI itself is MIT licensed ([LICENSE](LICENSE)). It includes or depends on the following.

## Fonts (SIL Open Font License 1.1)

The SwiftUI package bundles these fonts, and the documentation site loads them. Each licence text is kept next to the font files in [`swift/Sources/MetalUI/Resources/Fonts/`](swift/Sources/MetalUI/Resources/Fonts).

| Font | Copyright |
| --- | --- |
| Geist | Copyright 2024 The Geist Project Authors, <https://github.com/vercel/geist-font> |
| Martian Mono | Copyright 2021 The Martian Mono Project Authors, <https://github.com/evilmartians/mono> |
| Doto | Copyright 2024 The Doto Project Authors, <https://github.com/oliverlalan/Doto> |

The npm package `@unlocalhosted/metalui` does not ship font files; its CSS names system fonts, and Geist, Martian Mono and Doto are used by the documentation site.

## npm dependencies

The one runtime dependency of `@unlocalhosted/metalui` is [Base UI](https://base-ui.com) (MIT) and its own dependencies (MIT): `@floating-ui/*`, `@babel/runtime`, `reselect`, `use-sync-external-store`. React and React DOM (MIT) are peer dependencies. Their licence texts ship inside their packages.
