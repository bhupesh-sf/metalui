import * as React from 'react';
import { useDialKit } from 'dialkit';
import { Attachment, Card, Carousel } from '@unlocalhosted/metalui';
import reactSource from '../../../../../packages/metalui/src/components/carousel/carousel.tsx?raw';
import cssSource from '../../../../../packages/metalui/src/components/theme.css?raw';
import swiftSource from '../../../../../swift/Sources/MetalUI/Components/MetalCarousel.swift?raw';
import agentSource from '../../../../../packages/metalui/src/components/carousel/carousel.agent.md?raw';
import { ComponentPage } from '../../ui/ComponentPage';

/* ─────────────────────────────────────────────────────────
 * CAROUSEL PAGE · a few peers in a box narrower than all of them
 *
 *   gallery    a listing's photos as Attachment tiles, a shelf of six with the next one peeking
 *   shelf      trip Cards on a phone-width column, where a grid of three won't fit
 *   onboarding three cards, one per view (the default width: the box minus the peek)
 *   tune       DialKit: the slide width, the peek and the gap, on the gallery
 * Nothing on this page moves on its own.
 * ───────────────────────────────────────────────────────── */

const photo = (a: string, b: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/><circle cx="118" cy="44" r="16" fill="rgba(255,255,255,.6)"/><path d="M0 128 52 82l34 26 30-20 44 40v52H0z" fill="rgba(255,255,255,.32)"/></svg>`)}`;

const PHOTOS = [
  { name: 'Living room.jpg', size: 3_420_000, src: photo('#E8C9A0', '#C27D5F') },
  { name: 'Kitchen.jpg', size: 2_100_000, src: photo('#A9C6D9', '#55708A') },
  { name: 'Terrace.jpg', size: 4_800_000, src: photo('#B8D1A6', '#5D7F52') },
  { name: 'Bedroom.jpg', size: 2_900_000, src: photo('#D9B8D0', '#7D5A86') },
  { name: 'View from the window.jpg', size: 3_700_000, src: photo('#F1DFA8', '#C9963E') },
  { name: 'Street at night.jpg', size: 5_100_000, src: photo('#9FB5B0', '#3E5A57') },
];

const TRIPS = [
  { id: 'lisbon', title: 'Trip to Lisbon', line: '14 notes, 3 photos, a tram map.', a: '#E8C9A0', b: '#C27D5F' },
  { id: 'porto', title: 'Weekend in Porto', line: 'A list of cafés and a train time.', a: '#A7C6E8', b: '#5F84B6' },
  { id: 'sintra', title: 'A day in Sintra', line: 'Two palaces and the walk between.', a: '#B8D1A6', b: '#5D7F52' },
  { id: 'evora', title: 'Évora by bus', line: 'The chapel, the temple, lunch.', a: '#F1DFA8', b: '#C9963E' },
  { id: 'algarve', title: 'The Algarve coast', line: 'Beaches west of Lagos, tide times.', a: '#D9B8D0', b: '#7D5A86' },
];

const STEPS = [
  { title: 'Collect anything', body: 'Drop notes, photos and links into a trip. Each one keeps where it came from.' },
  { title: 'Lay it out', body: 'Arrange the trip on its canvas: days in columns, places on the map, the rest in a pile.' },
  { title: 'Take it with you', body: 'Open the trip offline on the day. Changes travel back when you are online again.' },
];

function Gallery({ label, slideWidth = '140px' }: { label: string; slideWidth?: string }) {
  return (
    <div className="w-full max-w-[520px]">
      <Carousel aria-label={label} slideWidth={slideWidth}>
        {PHOTOS.map((p) => (
          <Carousel.Slide key={p.name}>
            <Attachment kind="tile" name={p.name} size={p.size} preview={p.src} />
          </Carousel.Slide>
        ))}
      </Carousel>
    </div>
  );
}

function Shelf() {
  return (
    <div className="w-full max-w-[360px]">
      <Carousel aria-label="Your trips" slideWidth="72%">
        {TRIPS.map((t) => (
          <Carousel.Slide key={t.id}>
            <Card>
              <Card.Media src={photo(t.a, t.b)} />
              <Card.Title href={`#${t.id}`}>{t.title}</Card.Title>
              <Card.Description>{t.line}</Card.Description>
            </Card>
          </Carousel.Slide>
        ))}
      </Carousel>
    </div>
  );
}

function Onboarding({ label = 'Getting started' }: { label?: string }) {
  return (
    <div className="w-full max-w-[400px]">
      <Carousel aria-label={label}>
        {STEPS.map((s, i) => (
          <Carousel.Slide key={s.title}>
            <Card className="h-full">
              <Card.Title>{`${i + 1}. ${s.title}`}</Card.Title>
              <Card.Description>{s.body}</Card.Description>
            </Card>
          </Carousel.Slide>
        ))}
      </Carousel>
    </div>
  );
}

function CarouselTuner() {
  const d = useDialKit('Carousel', {
    width: [140, 96, 400],
    peek: [40, 0, 120],
    gap: [12, 0, 32],
  });
  const vars = { '--mu-r-carousel-slide-peek': `${d.peek}px`, '--mu-r-carousel-slide-gap': `${d.gap}px` } as React.CSSProperties;
  return (
    <div data-testid="carousel-tuner" className="grid w-full justify-items-center gap-24" style={vars}>
      <Gallery label="Tuned gallery" slideWidth={`${d.width}px`} />
      <Onboarding label="Tuned getting started" />
    </div>
  );
}

export default function CarouselPage() {
  return (
    <ComponentPage
      title="Carousel"
      capture="carousel"
      lede="A few peers looked at one or a few at a time, in a box narrower than all of them: a gallery of photos, onboarding cards, a shelf of cards on a phone. Swipe, scroll or step; the next one always peeks at the edge, and the readout says where you are. It never moves on its own. When everything fits, use a grid; when the peers have names, use Tabs."
      play={{ lede: 'Swipe or scroll the photos, or step with Previous and Next. Focus the row and use ← → Home End. At either end the key goes quiet but stays where it is.', caption: 'a listing’s photos as Attachment tiles', node: <div className="flex w-full justify-center"><Gallery label="Listing photos" /></div> }}
      more={[
        { id: 'shelf', title: 'A shelf of cards', lede: 'On a phone-width column, where three cards side by side won’t fit, the trips sit in a row with the next one cut at the edge. Each card is still its own link; Tab walks into them and the row scrolls to the one in focus.', node: <div className="flex w-full justify-center"><Shelf /></div> },
        { id: 'onboarding', title: 'One at a time', lede: 'Without a width, a slide is the box minus the peek: one card in view, the edge of the next beside it. The readout counts 1 / 3; there are no dots to aim at.', node: <div className="flex w-full justify-center"><Onboarding /></div> },
        { id: 'tune', title: 'Tune the row', lede: 'The Carousel panel sets the gallery’s slide width, and the peek and the gap for both: the peek is what a slide leaves of the box when it has no width of its own.', node: <CarouselTuner /> },
      ]}
      usage={`<Carousel aria-label="Listing photos" slideWidth="160px">
  {photos.map((p) => (
    <Carousel.Slide key={p.id}>
      <Attachment kind="tile" name={p.name} size={p.size} preview={p.url} />
    </Carousel.Slide>
  ))}
</Carousel>`}
      sources={[
        { id: 'react', label: 'React', code: reactSource },
        { id: 'css', label: 'CSS', code: cssSource },
        { id: 'swift', label: 'SwiftUI', code: swiftSource },
        { id: 'agent', label: 'Agent guide', code: agentSource },
      ]}
      rules={[
        { id: 'CA1', title: 'Never on its own', body: 'Nothing advances without a hand: no autoplay, no loop, nothing running at rest.', origin: 'WCAG 2.2.2' },
        { id: 'CA2', title: 'Show there is more', body: 'The next slide peeks past the edge; no fade, no swipe hint.', origin: 'Ours' },
        { id: 'CA3', title: 'Say where you are in words', body: 'The readout says 3 / 8, or the range in view; a reader hears it once the row settles.', origin: 'WAI-ARIA APG' },
        { id: 'CA4', title: 'Ends go quiet, not away', body: 'At an end the key dims and stays, so the row never jumps and focus stays put.', origin: 'Ours' },
        { id: 'CA5', title: 'Often a grid', body: 'If everything fits, show everything. If the peers have names, they are tabs.', origin: 'Nielsen Norman' },
      ]}
    />
  );
}
