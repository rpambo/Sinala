import { Directive, ElementRef, Input, DestroyRef, afterNextRender, inject } from '@angular/core';

/**
 * Adds an `is-visible` class when the host enters the viewport.
 * With mode="video" it also plays/pauses the host <video> element,
 * so media below the fold is not downloaded or decoded unnecessarily.
 */
@Directive({
  selector: '[appInView]',
  standalone: true,
  host: { class: 'in-view-target' },
})
export class InViewDirective {
  @Input('appInView') mode: 'reveal' | 'video' | '' = 'reveal';

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.observe());
  }

  private observe(): void {
    const element = this.host.nativeElement;
    const play = (visible: boolean): void => {
      if (this.mode !== 'video' || !(element instanceof HTMLVideoElement)) return;
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        element.pause();
        return;
      }
      if (visible) {
        void element.play().catch(() => undefined);
      } else {
        element.pause();
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      element.classList.add('is-visible');
      play(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const visible = entry.isIntersecting;
          element.classList.toggle('is-visible', visible);
          play(visible);
          if (visible && this.mode !== 'video') observer.unobserve(element);
        }
      },
      { threshold: this.mode === 'video' ? 0.12 : 0.1, rootMargin: '0px 0px -6% 0px' },
    );

    observer.observe(element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
