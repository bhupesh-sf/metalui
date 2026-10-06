'use client';

import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { ChevronIcon } from '../../icons/components.generated';

/* ─────────────────────────────────────────────────────────
 * ACCORDION, sections that open in place, on Base UI Accordion
 *
 *   rest      a row per section (the row's panel hover), a chevron at the end, engraved rules between
 *   open      the panel grows to its content on the settle spring (no overshoot) as the content
 *             fades in; the set's chevron turns a quarter on the part spring (it may overshoot its stop),
 *             the same chevron and turn as Collapsible
 *   close     height and content leave on the release spring; the chevron turns back
 *   focus     the green ring on the header; Tab moves between headers, Enter or Space opens
 *   disabled  40 %
 * Reduce Motion: the height snaps, the content crossfades, the chevron snaps.
 * Slots: Accordion.Root, Accordion.Item, Accordion.Trigger, Accordion.Panel.
 * ───────────────────────────────────────────────────────── */

const ROOT = 'mu-accordion grid';
const ITEM = 'mu-accordion-item relative [&+&]:before:absolute [&+&]:before:inset-x-accordion-trigger-pad-x [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:recipe-rule';
const HEADER = 'mu-accordion-header m-0';
const TRIGGER = 'mu-accordion-trigger group/acc flex w-full items-center gap-accordion-trigger-gap h-accordion-trigger-height px-accordion-trigger-pad-x rounded-accordion-trigger-radius border-0 bg-transparent type-ui text-ink text-left cursor-pointer outline-none transition-row hover:recipe-row-panel-hover focus-visible:focus-ring data-disabled:opacity-accordion-trigger-disabled data-disabled:cursor-default';
const CHEVRON = 'mu-accordion-chevron ml-auto flex-none size-accordion-chevron-size text-ink2 collapsible-chevron reduced-motion:transition-none';
const PANEL = 'mu-accordion-panel accordion-panel';
const BODY = 'mu-accordion-body px-accordion-panel-pad-x pb-accordion-panel-pad-bottom type-body text-ink2';

function Root({ className, ...props }: BaseAccordion.Root.Props & { className?: string }) {
  return <BaseAccordion.Root className={className ? `${ROOT} ${className}` : ROOT} {...props} />;
}

function Item({ className, ...props }: BaseAccordion.Item.Props & { className?: string }) {
  return <BaseAccordion.Item className={className ? `${ITEM} ${className}` : ITEM} {...props} />;
}

/** The section's header row; its children are the title. */
function Trigger({ className, children, ...props }: BaseAccordion.Trigger.Props & { className?: string }) {
  return (
    <BaseAccordion.Header className={HEADER}>
      <BaseAccordion.Trigger className={className ? `${TRIGGER} ${className}` : TRIGGER} {...props}>
        {children}
        <ChevronIcon animate={false} className={CHEVRON} />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

/** The section's content, revealed by the panel. */
function Panel({ className, children, ...props }: BaseAccordion.Panel.Props & { className?: string }) {
  return (
    <BaseAccordion.Panel className={PANEL} {...props}>
      <div className={className ? `${BODY} ${className}` : BODY}>{children}</div>
    </BaseAccordion.Panel>
  );
}

export const Accordion = Object.assign(Root, { Item, Trigger, Panel, Root });
