// @unlocalhosted/metalui/widget: render model JSON with MetalUI's components. Its own entry, because it loads
// each component on demand with import(): kept out of index.js, no other import's bundle meets those imports.
export { Widget, parseWidget, type WidgetProps, type WidgetAction, type WidgetActionContext, type WidgetNode, type WidgetNodeOf, type WidgetType, type WidgetOption, type WidgetPair, type WidgetParsedNode, type WidgetIssue, type ParsedWidget } from './components/widget/widget';
