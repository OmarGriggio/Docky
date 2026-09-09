import { Pipe, PipeTransform } from '@angular/core';

// Single point for the project's date display format (dd.mm.yyyy, European
// convention) - use `| appDate` instead of Angular's own `| date:'...'`
// directly, so every date on screen stays in sync if this format ever needs
// to change. The backend keeps sending ISO 8601 (e.g. from `documents.date`)
// - formatting for display is a frontend-only concern, done here rather
// than baked into the API response.
//
// Deliberately not using Angular's own DatePipe/formatDate: this format is
// fixed and purely numeric (no month/day names, no locale-dependent
// ordering), so it needs none of the ~75kB locale/i18n machinery those pull
// in - which, once shared across more than one lazy route, esbuild hoisted
// straight into the *eager* initial bundle and pushed it over budget (see
// the "Initial bundle too big" entry in zz_docs/Decisions.md for why that
// budget isn't just raised instead). Plain Date getters cost nothing.
//
// UTC getters, not local ones: these are calendar dates (Postgres DATE
// columns, midnight UTC, no time-of-day meaning) - reading them through the
// viewer's local timezone could roll a date back a day for anyone west of
// UTC. A calendar date shouldn't be timezone-sensitive in the first place.
@Pipe({
  name: 'appDate',
  standalone: true,
})
export class AppDatePipe implements PipeTransform {

  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      return '';
    }

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();

    return `${day}.${month}.${year}`;
  }

}
