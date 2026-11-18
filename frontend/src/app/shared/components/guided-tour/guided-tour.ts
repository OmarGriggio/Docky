import { Component, DestroyRef, ElementRef, computed, effect, inject, input, model, signal, viewChild } from '@angular/core';
import { Button } from 'primeng/button';
import { TranslocoPipe } from '@jsverse/transloco';

// One step of a guided tour: the element it lights up (a CSS selector, the
// first match on the page, or several tried in order - an element that may
// not be there yet, then one that always is; none, or nothing matching,
// shows the step in the middle of the screen) and the translation keys of
// what it says.
export interface TourStep {
  target?: string | string[];
  titleKey: string;
  textKey: string;
  icon: string;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 6;
const CARD_WIDTH = 340;
const GAP = 14;
const MARGIN = 16;

// A guided tour over the real page: everything dimmed but the step's element,
// a card next to it - Previous/Next, Escape or "Passer" to leave. The page
// underneath can't be clicked while it runs (a click there would move things
// out from under the spotlight). Its own, no library: a few positions to
// compute, not worth a dependency.
@Component({
  selector: 'app-guided-tour',
  standalone: true,
  imports: [Button, TranslocoPipe],
  templateUrl: './guided-tour.html',
  host: {
    '(window:resize)': 'measure()',
    '(window:scroll)': 'measure()',
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class GuidedTour {

  visible = model(false);
  steps = input.required<TourStep[]>();

  index = signal(0);
  step = computed(() => this.steps()[this.index()]);
  isLast = computed(() => this.index() === this.steps().length - 1);

  // The lit element's box (viewport coordinates), null for a step in the middle.
  spotlight = signal<Box | null>(null);
  private cardHeight = signal(220);
  private viewport = signal({ width: window.innerWidth, height: window.innerHeight });

  private card = viewChild<ElementRef<HTMLElement>>('card');
  private frame = 0;

  constructor() {
    // Every new step (or the tour opening): bring its element into view,
    // then measure it once it's there.
    effect(onCleanup => {
      if (!this.visible()) {
        return;
      }
      const step = this.step();
      const element = this.targetOf(step);
      // Centered: a sticky bar at the top of the page would hide it otherwise.
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      this.measure();
      // A smooth scroll and a calendar still laying itself out: measured
      // again once they've settled.
      const timers = [
        setTimeout(() => this.measure(), 350),
        setTimeout(() => this.measure(), 700),
        setTimeout(() => this.card()?.nativeElement.focus(), 0),
      ];
      // The next step (or closing) drops this one's pending measures.
      onCleanup(() => timers.forEach(clearTimeout));
    });

    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  open(): void {
    this.index.set(0);
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
    this.index.set(0);
  }

  next(): void {
    if (this.isLast()) {
      this.close();
    } else {
      this.index.update(i => i + 1);
    }
  }

  previous(): void {
    this.index.update(i => Math.max(0, i - 1));
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.visible()) {
      return;
    }
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    // The arrows move the caret in a field, not the tour.
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) {
      return;
    }
    if (event.key === 'ArrowRight') {
      this.next();
    } else if (event.key === 'ArrowLeft') {
      this.previous();
    }
  }

  measure(): void {
    if (!this.visible()) {
      return;
    }
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.viewport.set({ width: window.innerWidth, height: window.innerHeight });
      const card = this.card()?.nativeElement;
      if (card) {
        this.cardHeight.set(card.offsetHeight);
      }
      const element = this.targetOf(this.step());
      if (!element) {
        this.spotlight.set(null);
        return;
      }
      const rect = element.getBoundingClientRect();
      this.spotlight.set({
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      });
    });
  }

  // Beside the element where there's room - right, left, below, above, in
  // that order - kept inside the screen; in the middle without one.
  cardPosition = computed(() => {
    const { width, height } = this.viewport();
    const cardWidth = Math.min(CARD_WIDTH, width - MARGIN * 2);
    const cardHeight = this.cardHeight();
    const box = this.spotlight();

    if (!box) {
      return { top: Math.max(MARGIN, (height - cardHeight) / 2), left: (width - cardWidth) / 2, width: cardWidth };
    }

    const clampTop = (top: number) => Math.min(Math.max(MARGIN, top), height - cardHeight - MARGIN);
    const clampLeft = (left: number) => Math.min(Math.max(MARGIN, left), width - cardWidth - MARGIN);
    const middleTop = box.top + box.height / 2 - cardHeight / 2;

    if (box.left + box.width + GAP + cardWidth + MARGIN <= width) {
      return { top: clampTop(middleTop), left: box.left + box.width + GAP, width: cardWidth };
    }
    if (box.left - GAP - cardWidth - MARGIN >= 0) {
      return { top: clampTop(middleTop), left: box.left - GAP - cardWidth, width: cardWidth };
    }
    if (box.top + box.height + GAP + cardHeight + MARGIN <= height) {
      return { top: box.top + box.height + GAP, left: clampLeft(box.left), width: cardWidth };
    }
    if (box.top - GAP - cardHeight - MARGIN >= 0) {
      return { top: box.top - GAP - cardHeight, left: clampLeft(box.left), width: cardWidth };
    }
    // Bigger than the screen itself (a whole calendar): over it, at the bottom.
    return { top: height - cardHeight - MARGIN, left: clampLeft(box.left + box.width - cardWidth - MARGIN), width: cardWidth };
  });

  private targetOf(step: TourStep | undefined): HTMLElement | null {
    const selectors = step?.target === undefined ? [] : Array.isArray(step.target) ? step.target : [step.target];
    for (const selector of selectors) {
      const element = document.querySelector<HTMLElement>(selector);
      // A hidden element (display: none) has nothing to light up.
      if (element && element.getClientRects().length > 0) {
        return element;
      }
    }
    return null;
  }

}
