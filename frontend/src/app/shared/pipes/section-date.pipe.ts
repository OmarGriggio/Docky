import { Pipe, PipeTransform } from '@angular/core';
import { formatSectionDate } from '../utils/display';

// document_sections.date_start/date_end only - a real local instant now
// (see formatSectionDate's own comment in display.ts for why, and how it
// differs from app-date.pipe.ts's UTC-only calendar-date semantics), shown
// with its time only when one was actually set.
@Pipe({
  name: 'sectionDate',
  standalone: true,
})
export class SectionDatePipe implements PipeTransform {

  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      return '';
    }

    return formatSectionDate(date);
  }

}
