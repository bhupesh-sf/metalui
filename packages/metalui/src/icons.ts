// @unlocalhosted/metalui/icons: Soft Hardware icons with authored hover and press motion.
// Import '@unlocalhosted/metalui/icons.css' once (styles.css does not include it).
export { Icon, createIcon, type IconProps } from './icons/Icon';
export { ICON_CATALOG, ICON_NAMES, type IconName, type IconRecord } from './icons/catalog.generated';
export * from './icons/components.generated';
// Each glyph's record (`tagGlyph`) and morph parts (`tagMorph`), one export each, for components that take a glyph (GlyphParts).
export * from './icons/glyphs.generated';
export * from './icons/morph.generated';
export { MorphIcon, MorphPair, MorphGlyph, type MorphIconProps, type MorphGlyphs, type GlyphParts } from './icons/MorphIcon';
export { morphParts, partsFrom, planMorph, planFrames, morphAt, morphPath, morphOutline, morphStrain, type MorphFrame, type MorphPart, type MorphPlan, type MorphRelation, type MorphStrain, type MorphMove, type MorphTrack, type MorphTurn } from './icons/morph';
