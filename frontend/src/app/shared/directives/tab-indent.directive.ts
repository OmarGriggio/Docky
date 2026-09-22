import { Directive, ElementRef, HostListener } from '@angular/core';

const TAB_INDENT = '    ';

// Plain Tab on a textarea just moves focus to the next field by default -
// this makes it insert a fixed-width indent instead, at the cursor position,
// like a code editor. Shift+Tab (and any other modifier) is left alone so
// keyboard users can still tab out backwards. A real \t character is
// deliberately never inserted - it'd render inconsistently (and the PDF
// writer's own text() collapses tabs to a single space, see pdf-writer.ts).
@Directive({
  selector: 'textarea[pTextarea]',
})
export class TabIndentDirective {

  constructor(private readonly el: ElementRef<HTMLTextAreaElement>) { }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    event.preventDefault();

    const textarea = this.el.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    textarea.setRangeText(TAB_INDENT, start, end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

}
