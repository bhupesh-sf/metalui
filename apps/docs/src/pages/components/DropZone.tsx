import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Attachment, Avatar, Button, DropZone, formatBytes, useWait, type DropRefusal, type WaitWork } from '@unlocalhosted/metalui';
import { DocumentIcon, ImageIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/drop-zone/drop-zone.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/drop-zone/drop-zone.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * DROP TUNER: the page's DialKit panel
 *
 *   spring   the spring the tray sinks and the glyph rises on
 *   sink     how far the tray gives under the files
 *   edge     the lit edge's width
 *   slow     stretches time
 * ───────────────────────────────────────────────────────── */

const MAX = 10_000_000;
const WHY: Record<DropRefusal['reason'], string> = { type: 'not a PDF or an image', size: `larger than ${formatBytes(MAX)}`, count: 'one at a time' };

function Region({ label }: { label: string }) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [refused, setRefused] = React.useState<DropRefusal[]>([]);
  return (
    <div role="region" aria-label={label} className="grid w-full max-w-[400px] gap-12">
      <DropZone
        icon={<DocumentIcon size={20} />}
        accept="application/pdf,image/*"
        maxSize={MAX}
        description={`PDFs and images, up to ${formatBytes(MAX)}`}
        onFiles={(took, no) => { setFiles((all) => [...all, ...took]); setRefused(no); }}
      />
      {refused.length > 0 && (
        <p role="alert" className="m-0 type-meta text-form-field-error-ink">
          {refused.map((r) => `${r.file.name} is ${WHY[r.reason]}`).join('; ')}.
        </p>
      )}
      {files.map((f, i) => <Attachment key={`${f.name}-${i}`} name={f.name} size={f.size} onRemove={() => setFiles((all) => all.filter((x) => x !== f))} />)}
    </div>
  );
}

const PHOTO_MAX = 2_000_000;

/** One image with a preview: the avatar shows the picked photo at once and waits while it uploads. */
function AvatarUpload() {
  const [src, setSrc] = React.useState<string>();
  const [work, setWork] = React.useState<WaitWork>('idle');
  const [refused, setRefused] = React.useState<DropRefusal[]>([]);
  const wait = useWait(work);
  // Stands in for the upload; a real host sets done when its request ends.
  React.useEffect(() => {
    if (work !== 'working') return;
    const t = window.setTimeout(() => setWork('done'), 1600);
    return () => window.clearTimeout(t);
  }, [work, src]);
  const show = (next?: string) => setSrc((was) => { if (was) URL.revokeObjectURL(was); return next; });
  return (
    <div role="region" aria-label="Profile photo" className="flex w-full max-w-[400px] items-center gap-16">
      <Avatar name="Ana Rocha" src={src} size="large" waiting={wait.busy} />
      <div className="grid min-w-0 flex-1 gap-8">
        <DropZone
          compact
          multiple={false}
          accept="image/*"
          maxSize={PHOTO_MAX}
          icon={<ImageIcon size={20} />}
          title={src ? 'Replace your photo' : 'Add a photo'}
          description={`PNG or JPG, up to ${formatBytes(PHOTO_MAX)}`}
          onFiles={(took, no) => {
            setRefused(no);
            if (took[0]) { show(URL.createObjectURL(took[0])); setWork('working'); }
          }}
        />
        {refused.length > 0 && (
          <p role="alert" className="m-0 type-meta text-form-field-error-ink">
            {refused[0].reason === 'size' ? `${refused[0].file.name} is larger than ${formatBytes(PHOTO_MAX)}` : refused[0].reason === 'count' ? 'One photo at a time' : `${refused[0].file.name} isn’t an image`}.
          </p>
        )}
        {src && <Button size="compact" className="justify-self-start" disabled={wait.busy} onClick={() => { show(undefined); setWork('idle'); }}>Remove photo</Button>}
      </div>
    </div>
  );
}

function DropTuner() {
  const d = useDialKit('Drop', {
    spring: { type: 'select', options: SPRING_NAMES, default: 'part' },
    sink: [0.985, 0.95, 1],
    edge: [1.5, 1, 3],
    slow: [1, 1, 10],
  });
  const vars = { ...springVars('part', d.spring as SpringName, d.slow), '--mu-r-drop-zone-self-sink': d.sink, '--mu-r-drop-zone-self-edge': `${d.edge}px` } as React.CSSProperties;
  return <div data-testid="drop-tuner" className="flex w-full justify-center" style={vars}><Region label="Tuned region" /></div>;
}

export default function DropZonePage() {
  return (
    <ComponentPage
      title="Drop zone"
      lede="A place that receives files. Drag files into the window and its edge lights so you can find it; over it, the tray gives a little and says to let go. It refuses a file it won't take, and a click or Space opens the picker, so dragging is never the only way in."
      play={{ lede: 'Drag a PDF or an image from your desktop onto the tray, or click it to choose. Try a file it doesn’t take.', caption: 'a region that takes files · a composer row · disabled', node: (
        <div className="grid w-full justify-items-center gap-32">
          <Region label="Region files" />
          <div className="w-full max-w-[400px]">
            <DropZone compact icon={<ImageIcon size={20} />} accept="image/*" title="Add images" description="or drop them here" onFiles={() => {}} />
          </div>
          <div className="w-full max-w-[400px]">
            <DropZone disabled icon={<DocumentIcon size={20} />} title="Uploads are paused" description="Reconnect to attach files" onFiles={() => {}} />
          </div>
        </div>
      ) }}
      more={[
        { id: 'avatar', title: 'One image: an avatar upload', lede: 'A large avatar beside a compact drop zone that takes one image. The avatar shows the photo the moment it is picked or dropped, and waits on its rim while it uploads. Remove puts the initials back.', node: <div className="flex w-full justify-center"><AvatarUpload /></div> },
        { id: 'tune', title: 'Tune the drop', lede: 'The Drop panel swaps the spring the tray sinks and the glyph rises on, sets how far the tray gives and how wide the edge lights, and stretches time.', node: <DropTuner /> },
      ]}
      usage={`const [files, setFiles] = React.useState<File[]>([]);

<DropZone
  icon={<DocumentIcon size={20} />}
  accept="application/pdf,image/*"
  maxSize={10_000_000}
  description="PDFs and images, up to 10 MB"
  onFiles={(took, refused) => {
    setFiles((all) => [...all, ...took]);
    if (refused.length) say(\`\${refused.length} not attached\`);
  }}
/>
{files.map((f) => <Attachment key={f.name} name={f.name} size={f.size} />)}`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'DZ1', title: 'Findable while dragging', body: 'Files anywhere in the window light its edge, so the eye goes to it before the hand does.', origin: 'Ours' },
        { id: 'DZ2', title: 'Never drag-only', body: 'The tray is a file input’s label: a click, Space or Enter opens the picker.', origin: 'WCAG 2.5.7' },
        { id: 'DZ3', title: 'Refuse in words too', body: 'The shake says no; a line near the zone says which file and why.', origin: 'Transitions T10' },
        { id: 'DZ4', title: 'Name what it takes', body: 'Types and the largest size, in the description, before anyone tries.', origin: 'Ours' },
      ]}
    />
  );
}
