import reactSource from '../../../../../packages/metalui/src/components/snap-guides/snap-guides.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/snap-guides/snap-guides.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';
import { Code } from '../../ui/doc';
import { SnapCanvas } from '../../ui/SnapCanvas';
import { SnapGuidesXray } from '../../ui/xray/SnapGuidesXray';

// The page's end and the WKWebView's end of the haptic bridge (snap-guides.agent.md, "A web view in a Mac app").
const BRIDGE_TS = `import { setHapticBridge } from '@unlocalhosted/metalui';

// once, at start-up: every haptic() now goes to the host and returns 'bridge'
setHapticBridge((kind) => window.webkit.messageHandlers.haptic.postMessage(kind));`;
const BRIDGE_SWIFT = `import MetalUI

// alignment → .alignment, detent → .levelChange, refusal → .generic, performed at once
MetalHapticBridge.install(in: webView.configuration.userContentController)`;

export default function SnapGuidesPage() {
  return (
    <ComponentPage
      title="Snap guides"
      lede="The thin green lines that appear while you drag something into line with its neighbours. They show you what it snapped to, and they disappear when you let go."
      play={{ lede: 'Drag the note near the others. Hold ⌘ to drag without snapping. Change the zoom: the lines stay the same thickness.', caption: 'solid for edges · dashed for centres', node: <SnapCanvas /> }}
      xray={<SnapGuidesXray />}
      more={[{
        id: 'mac-app',
        title: 'In a Mac app',
        lede: 'A browser cannot reach the trackpad, so on a Mac the web is silent. A Mac app that shows MetalUI in a web view can: the page hands haptic() to the host, and the host plays the native tap. Electron and Tauri do the native half in their own main process.',
        node: (
          <div className="grid w-full gap-12">
            <Code label="page.ts" code={BRIDGE_TS} />
            <Code label="WebView.swift" code={BRIDGE_SWIFT} />
          </div>
        ),
      }]}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'SN1', title: 'A guide explains a snap', body: 'Only draw the lines the snap actually used. Never a grid, never a ruler.', origin: 'Ours' },
        { id: 'SN2', title: 'With the snap, never after', body: 'Guides move in the same frame as the snap. They fade only when you let go.', origin: 'Native reference' },
        { id: 'SN3', title: 'The same on screen at every zoom', body: 'One point wide, a 3 / 3 dash, 8 pt past both ends, at 25 % and at 300 %.', origin: 'Native reference' },
        { id: 'SN4', title: '⌘ turns it off', body: 'Holding ⌘ drags freely: no snap, no guides.', origin: 'Native reference' },
      ]}
    />
  );
}
