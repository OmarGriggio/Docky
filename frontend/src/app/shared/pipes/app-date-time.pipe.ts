import { Pipe, PipeTransform } from '@angular/core';

// Same idea as app-date.pipe.ts (plain Date getters, no Angular DatePipe/
// locale machinery - see that file's own comment for the bundle-size reason
// why), but for an actual timestamp (a moment something happened, e.g.
// login_history.created_at) rather than a timezone-less calendar date -
// local getters here, not UTC: a login time should read in the viewer's own
// timezone, unlike a Postgres DATE column with no time-of-day meaning.
@Pipe({
  name: 'appDateTime',
  standalone: true,
})
export class AppDateTimePipe implements PipeTransform {

  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

}
