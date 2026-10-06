import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Attachment, Button, Dialog, DropZone, Progress, Sortable, SwapText, Table, formatBytes, type TableColumn } from '@unlocalhosted/metalui';
import { AttachIcon, ImageIcon, RetryIcon, TrashIcon, UploadIcon } from '@unlocalhosted/metalui/icons';
import { type SpringName } from '../../../../../packages/metalui/src/motion/springs.generated';
import { SPRING_NAMES, springVars } from '../../ui/springTuning';
import reactSource from '../../../../../packages/metalui/src/components/attachment/attachment.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import agentSource from '../../../../../packages/metalui/src/components/attachment/attachment.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';
import { SwiftCapture } from '../../ui/SwiftCapture';

/* ─────────────────────────────────────────────────────────
 * LAND TUNER: the page's DialKit panel
 *
 *   land     the spring a new file lands on
 *   leave    the spring a removed file leaves on
 *   drop     how far above it lands from
 * ───────────────────────────────────────────────────────── */

interface Item { id: number; name: string; size: number; progress?: number; error?: string }
const NAMES = ['Tram map of Lisbon, annotated for the second day of the trip.pdf', 'Receipt.png', 'Itinerary.docx', 'Photos.zip'];

function Tray({ label }: { label: string }) {
  const [items, setItems] = React.useState<Item[]>([
    { id: 1, name: NAMES[0], size: 2_480_000 },
    { id: 2, name: 'Hotel booking.pdf', size: 31_000_000, error: 'Too large, 25 MB at most' },
  ]);
  const next = React.useRef(3);
  React.useEffect(() => {
    const t = setInterval(() => setItems((all) => all.map((f) => (f.progress == null || f.progress >= 100 ? { ...f, progress: undefined } : { ...f, progress: Math.min(100, f.progress + 20) }))), 400);
    return () => clearInterval(t);
  }, []);
  const add = () => {
    const id = next.current++;
    setItems((all) => [...all, { id, name: NAMES[id % NAMES.length], size: 400_000 + id * 180_000, progress: 0 }]);
  };
  return (
    <div className="grid w-full max-w-[360px] gap-12" aria-label={label} role="region">
      {items.map((f) => (
        <Attachment
          key={f.id}
          name={f.name}
          size={f.size}
          progress={f.progress}
          error={f.error}
          onRetry={() => setItems((all) => all.map((x) => (x.id === f.id ? { ...x, error: undefined, size: 18_000_000, progress: 0 } : x)))}
          onRemove={() => setItems((all) => all.filter((x) => x.id !== f.id))}
        />
      ))}
      <Button className="justify-self-start" onClick={add}>Attach a file</Button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * LAYOUTS: file upload, composed from DropZone and Attachment
 *
 * Every layout is a drop zone (the place that takes files) beside the files it took, arranged by the
 * host: a grid of tiles, a row of thumbnails, a table. useUploads stands in for a real upload: it
 * ticks only while something uploads, so nothing runs at rest.
 * ───────────────────────────────────────────────────────── */

const photo = (a: string, b: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/><circle cx="118" cy="44" r="16" fill="rgba(255,255,255,.6)"/><path d="M0 128 52 82l34 26 30-20 44 40v52H0z" fill="rgba(255,255,255,.32)"/></svg>`)}`;
const PHOTOS = [photo('#E8C9A0', '#C27D5F'), photo('#A9C6D9', '#55708A'), photo('#B8D1A6', '#5D7F52'), photo('#D9B8D0', '#7D5A86'), photo('#F1DFA8', '#C9963E'), photo('#9FB5B0', '#3E5A57')];

interface Upload { id: string; name: string; size: number; src?: string; progress?: number | null; error?: string; fails?: boolean }

const STEP = 12;
const tick = (f: Upload): Upload => {
  if (f.progress === undefined || f.error) return f;
  if (f.progress === null) return { ...f, progress: 0 };
  const next = f.progress + STEP;
  if (f.fails && next >= 48) return { ...f, progress: undefined, error: 'Connection lost' };
  return next >= 100 ? { ...f, progress: undefined } : { ...f, progress: next };
};

let made = 0;
/** Files as a page's uploads: added ones start unknown, then count up; a file marked `fails` drops half way. */
function useUploads(initial: Upload[]) {
  const [items, setItems] = React.useState(initial);
  const busy = items.some((f) => f.progress !== undefined && !f.error);
  React.useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setItems((all) => all.map(tick)), 300);
    return () => clearInterval(t);
  }, [busy]);
  const add = (files: File[]) => setItems((all) => [...all, ...files.map((f) => ({ id: `new-${made++}`, name: f.name, size: f.size, src: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined, progress: null }))]);
  const retry = (id: string) => setItems((all) => all.map((f) => (f.id === id ? { ...f, error: undefined, fails: false, progress: 0 } : f)));
  const remove = (id: string) => setItems((all) => {
    const gone = all.find((f) => f.id === id);
    if (gone?.src?.startsWith('blob:')) URL.revokeObjectURL(gone.src);
    return all.filter((f) => f.id !== id);
  });
  return { items, setItems, add, retry, remove };
}

const said = (f: Upload) => (f.error ? `Failed: ${f.error}` : f.progress === undefined ? 'Uploaded' : f.progress === null ? 'Uploading' : `Uploading · ${f.progress} %`);

/** Pictures: a thumbnail on the row, and tiles, each with its own progress. */
function Pictures() {
  const { items, setItems, retry, remove } = useUploads([
    { id: 'p1', name: 'Alfama at dusk.png', size: 3_420_000, src: PHOTOS[0] },
    { id: 'p2', name: 'Tram 28.jpg', size: 2_100_000, src: PHOTOS[1], progress: 36 },
    { id: 'p3', name: 'Miradouro.jpg', size: 4_800_000, src: PHOTOS[2], error: 'Connection lost' },
    { id: 'p4', name: 'Tickets.pdf', size: 380_000 },
  ]);
  return (
    <div role="region" aria-label="Pictures" className="grid w-full max-w-[520px] gap-16">
      <Attachment name="Alfama at dusk.png" size={3_420_000} preview={PHOTOS[0]} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-12">
        {items.map((f) => (
          <Attachment key={f.id} kind="tile" name={f.name} size={f.size} preview={f.src} progress={f.progress} error={f.error} onRetry={() => retry(f.id)} onRemove={() => remove(f.id)} />
        ))}
      </div>
      <Button className="justify-self-start" icon={<UploadIcon />} onClick={() => { const n = made++; setItems((all) => [...all, { id: `new-${n}`, name: `Photo ${n + 1}.png`, size: 1_200_000 + n * 310_000, src: PHOTOS[n % PHOTOS.length], progress: null }]); }}>Upload a photo</Button>
    </div>
  );
}

/** A gallery: drop images in, put them in order, open one bigger. */
function Gallery() {
  const { items, setItems, add, retry, remove } = useUploads([
    { id: 'g1', name: 'Living room.jpg', size: 2_900_000, src: PHOTOS[4] },
    { id: 'g2', name: 'Kitchen.jpg', size: 3_100_000, src: PHOTOS[0] },
    { id: 'g3', name: 'Balcony view.jpg', size: 4_200_000, src: PHOTOS[1] },
    { id: 'g4', name: 'Bedroom.jpg', size: 2_600_000, src: PHOTOS[3] },
  ]);
  const [open, setOpen] = React.useState<Upload | null>(null);
  const byId = new Map(items.map((f) => [f.id, f]));
  return (
    <div role="region" aria-label="Listing photos" className="grid w-full max-w-[480px] gap-16">
      <DropZone compact icon={<ImageIcon size={20} />} accept="image/*" title="Add photos" description="JPG or PNG, up to 10 MB" maxSize={10_000_000} onFiles={(took) => add(took)} />
      <Sortable.Root
        aria-label="Photo order"
        orientation="grid"
        className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-12"
        value={items.map((f) => f.id)}
        onValueChange={(next) => setItems(next.flatMap((id) => byId.get(id) ?? []))}
      >
        {items.map((f) => (
          <Sortable.Item key={f.id} value={f.id} label={f.name} className="rounded-attachment-tile-radius">
            <Attachment kind="tile" name={f.name} size={f.size} preview={f.src} progress={f.progress} error={f.error} onRetry={() => retry(f.id)} onRemove={() => remove(f.id)} onOpen={() => setOpen(f)} />
          </Sortable.Item>
        ))}
      </Sortable.Root>
      <p className="m-0 type-meta text-ink3">The first photo is the cover. Drag one to move it, or focus it and press Space, then the arrow keys.</p>
      <Dialog open={open != null} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <Dialog.Popup aria-label={open?.name ?? 'Photo'}>
          <Dialog.Title>{open?.name}</Dialog.Title>
          {open?.src && <img src={open.src} alt={open.name} className="block w-full max-w-[480px] aspect-square rounded-attachment-tile-window-radius object-cover" />}
          <p className="m-0 type-meta tabular-nums text-ink3">{open && formatBytes(open.size)}</p>
          <Dialog.Actions><Button onClick={() => setOpen(null)}>Close</Button></Dialog.Actions>
        </Dialog.Popup>
      </Dialog>
    </div>
  );
}

const SHOWN = 4;

/** A composer's row: the attach row, then thumbnails, the rest counted. */
function Composer() {
  const { items, add, retry, remove } = useUploads([
    { id: 'c1', name: 'Alfama at dusk.png', size: 3_420_000, src: PHOTOS[0] },
    { id: 'c2', name: 'Tram 28.jpg', size: 2_100_000, src: PHOTOS[1] },
    { id: 'c3', name: 'Itinerary.pdf', size: 240_000 },
    { id: 'c4', name: 'Miradouro.jpg', size: 4_800_000, src: PHOTOS[2] },
    { id: 'c5', name: 'Pastéis.jpg', size: 1_900_000, src: PHOTOS[4] },
    { id: 'c6', name: 'Receipt.png', size: 520_000, src: PHOTOS[5] },
  ]);
  const rest = items.length - SHOWN;
  const total = items.reduce((n, f) => n + f.size, 0);
  return (
    <div role="region" aria-label="Message attachments" className="grid w-full max-w-[400px] gap-12">
      <DropZone compact icon={<AttachIcon size={20} />} title="Attach files" description="or drop them here" onFiles={(took) => add(took)} />
      {items.length > 0 && (
        <div className="flex items-center gap-8">
          {items.slice(0, SHOWN).map((f) => (
            <Attachment key={f.id} kind="tile" compact name={f.name} size={f.size} preview={f.src} progress={f.progress} error={f.error} onRetry={() => retry(f.id)} onRemove={() => remove(f.id)} />
          ))}
          {rest > 0 && (
            <span role="img" aria-label={`${rest} more`} className="mu-attachment-more grid flex-none place-items-center size-attachment-compact-size rounded-attachment-tile-radius recipe-well-field type-ui tabular-nums text-ink2">
              <SwapText value={`+${rest}`} />
            </span>
          )}
        </div>
      )}
      <p className="mu-attachment-count m-0 type-meta tabular-nums text-ink3"><SwapText value={items.length === 0 ? 'Nothing attached' : `${items.length} ${items.length === 1 ? 'file' : 'files'} · ${formatBytes(total)}`} /></p>
    </div>
  );
}

/** Many files to watch: a table, with Progress's ring in the status cell. */
function FileTable() {
  const { items, add, retry, remove } = useUploads([
    { id: 't1', name: 'Q3 report.pdf', size: 2_480_000 },
    { id: 't2', name: 'Revenue by region.xlsx', size: 860_000 },
    { id: 't3', name: 'Board deck.key', size: 48_000_000, progress: 24 },
    { id: 't4', name: 'Recording.mov', size: 310_000_000, progress: 12, fails: true },
    { id: 't5', name: 'Notes.md', size: 12_000 },
  ]);
  const columns: TableColumn<Upload>[] = [
    { key: 'name', header: 'Name', value: (f) => f.name, primary: true },
    { key: 'size', header: 'Size', value: (f) => f.size, cell: (f) => formatBytes(f.size), align: 'end', priority: 2 },
    {
      key: 'status',
      header: 'Status',
      value: said,
      cell: (f) => (
        <span className="inline-flex min-w-0 items-center gap-8">
          <Progress shape="ring" size="compact" label={`${f.name}: ${said(f)}`} value={f.error ? 50 : f.progress === undefined ? 100 : f.progress} state={f.error ? 'failed' : f.progress === undefined ? 'complete' : 'running'} />
          <span className={f.error ? 'truncate text-form-field-error-ink' : 'truncate'}>{said(f)}</span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      kind: 'actions',
      actions: (f) => [
        ...(f.error ? [{ label: 'Try again', icon: <RetryIcon />, primary: true, onSelect: () => retry(f.id) }] : []),
        { label: 'Remove', icon: <TrashIcon />, danger: true, onSelect: () => remove(f.id) },
      ],
    },
  ];
  return (
    <div role="region" aria-label="Uploads" className="grid w-full gap-12">
      <DropZone compact icon={<UploadIcon size={20} />} title="Upload files" description="Anything, up to 500 MB" maxSize={500_000_000} onFiles={(took) => add(took)} />
      <Table caption="Uploads" captionHidden columns={columns} rows={items} rowKey={(f) => f.id} density="regular" />
    </div>
  );
}

function LandTuner() {
  const d = useDialKit('Attachment land', {
    land: { type: 'select', options: SPRING_NAMES, default: 'object' },
    leave: { type: 'select', options: SPRING_NAMES, default: 'release' },
    drop: [6, 0, 24],
    slow: [1, 1, 10],
  });
  const vars = { ...springVars('object', d.land as SpringName, d.slow), ...springVars('release', d.leave as SpringName, d.slow), '--mu-motion-nest': `${d.drop}px` } as React.CSSProperties;
  return <div data-testid="attachment-land-tuner" className="flex justify-center" style={vars}><Tray label="Tuned attachments" /></div>;
}

export default function AttachmentPage() {
  return (
    <ComponentPage
      title="Attachment"
      lede="A file someone attached, as a small raised plate. A new one lands into place, its track fills while it uploads, a failed one says why and offers to try again, and a removed one steps down and fades before it goes."
      play={{ lede: 'Attach a file, try the failed one again, or remove one.', caption: 'a long name · a failed upload · new ones uploading', node: <div className="flex w-full justify-center"><Tray label="Attachments" /></div> }}
      more={[
        { id: 'pictures', title: 'Pictures and tiles', lede: 'Give an image file its picture with preview: on the row it fills the type well, fading in over the extension once it loads. As a tile it sits in a sunk window cut in the plate. A tile that uploads dims and holds Progress’s ring on a raised disc; a failed one says why under it, and the disc becomes Try again.', node: <div className="grid w-full justify-items-center gap-24"><Pictures /><SwiftCapture name="attachment-tiles" maxWidth={520} /></div> },
        { id: 'gallery', title: 'A gallery to put in order', lede: 'A drop zone over a grid of tiles in a Sortable. Drag a picture to move it (a click without moving opens it); the open key, and Space then the arrows, do the same from the keyboard. The picture opens bigger in a Dialog.', node: <div className="flex w-full justify-center"><Gallery /></div> },
        { id: 'composer', title: 'A composer’s row', lede: 'The compact drop zone with compact tiles under it: the first four, the rest counted in a readout well, and the count and total size on one line. Each tile keeps its own progress.', node: <div className="flex w-full justify-center"><Composer /></div> },
        { id: 'table', title: 'A table of files', lede: 'Many uploads to watch: a Table whose status cell holds Progress’s compact ring beside the words. Try again and Remove are the row’s actions. The ring fills, turns red on a failure, and draws its tick when the file is in.', node: <FileTable /> },
        { id: 'land', title: 'Tune the land', lede: 'The Attachment land panel swaps the springs a file lands and leaves on, sets how far above it lands from, and stretches time.', node: <LandTuner /> },
      ]}
      usage={`// A row
{files.map((f) => (
  <Attachment
    key={f.id}
    name={f.name}
    size={f.size}
    progress={f.uploading ? f.progress : undefined}
    error={f.error}
    onRetry={() => retry(f)}
    onRemove={() => remove(f)}
  />
))}

// Tiles in a grid you can put in order; a click or the open key shows one bigger
<Sortable.Root aria-label="Photo order" orientation="grid" value={order} onValueChange={setOrder}>
  {order.map((id) => (
    <Sortable.Item key={id} value={id} label={byId[id].name}>
      <Attachment kind="tile" name={byId[id].name} size={byId[id].size} preview={byId[id].url}
        progress={byId[id].progress} onOpen={() => setOpen(id)} onRemove={() => remove(id)} />
    </Sortable.Item>
  ))}
</Sortable.Root>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'AT1', title: 'It lands', body: 'A new file drops into place on the object spring: it was put there.', origin: 'Transitions T5b' },
        { id: 'AT2', title: 'Say why it failed', body: 'A few words and Try again, never just a red mark.', origin: 'Ours' },
        { id: 'AT3', title: 'Keep the extension', body: 'Long names cut in the middle so the type stays readable.', origin: 'Ours' },
      ]}
    />
  );
}
