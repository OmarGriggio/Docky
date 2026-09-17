import { Component } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';

// Smallest possible FullCalendar preview - a bare month view, no events,
// no interaction plugin yet. Just proving the library is wired in
// correctly before building the real feature on top of it.
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './calendar.html',
})
export class CalendarPage {

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    locale: 'fr',
    height: 'auto',
  };

}
