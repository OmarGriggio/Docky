import { AfterViewInit, Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventDropArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable, EventReceiveArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import { DocumentSectionService } from '../documents/document-section.service';
import { SectionWithProject } from '../../shared/models/document-section';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarPage implements OnInit, AfterViewInit {

  private documentSectionService = inject(DocumentSectionService);

  @ViewChild('fullCalendar') fullCalendar!: FullCalendarComponent;
  @ViewChild('unscheduledList') unscheduledListRef!: ElementRef<HTMLElement>;

  // The sidebar's own draggable source (see ngAfterViewInit/onEventReceive
  // below) - every section still with no schedule, across every
  // IN_PROGRESS chantier (a COMPLETED one's quantities are locked, nothing
  // left to plan).
  unscheduledSections = signal<SectionWithProject[]>([]);

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'fr',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    buttonText: {
      today: "Aujourd'hui",
      month: 'Mois',
      week: 'Semaine',
      day: 'Jour',
    },
    // timeGridWeek/timeGridDay only - dayGridMonth ignores these.
    slotMinTime: '06:00:00',
    slotMaxTime: '20:00:00',
    editable: true,
    eventReceive: info => this.onEventReceive(info),
    eventDrop: info => this.onEventDropOrResize(info),
    eventResize: info => this.onEventDropOrResize(info),
  };

  ngOnInit(): void {
    this.loadUnscheduledSections();
  }

  // The Draggable registration only needs to happen once - it delegates to
  // whatever matches itemSelector inside the container at drag time, so it
  // doesn't need to be redone when unscheduledSections() itself changes
  // and the list re-renders. loadScheduledSections needs the calendar's
  // own API though, only ready once this component's view (the child
  // <full-calendar>'s own AfterViewInit already ran by then) is up.
  ngAfterViewInit(): void {
    new Draggable(this.unscheduledListRef.nativeElement, {
      itemSelector: '.fc-event',
      eventData: el => JSON.parse(el.dataset['event'] ?? '{}'),
    });

    this.loadScheduledSections();
  }

  private loadUnscheduledSections(): void {
    this.documentSectionService.getUnscheduledSections().subscribe({
      next: data => this.unscheduledSections.set(data),
      error: err => console.error('calendar : ' + err)
    });
  }

  // Shown on the calendar as soon as the page loads - every section that
  // already has a schedule, whatever chantier status (unlike the sidebar's
  // own unscheduledSections, a COMPLETED chantier's past work still belongs
  // here).
  private loadScheduledSections(): void {
    this.documentSectionService.getScheduledSections().subscribe({
      next: sections => {
        const calendarApi = this.fullCalendar.getApi();
        for (const section of sections) {
          calendarApi.addEvent(this.toEventInput(section));
        }
      },
      error: err => console.error('calendar : ' + err)
    });
  }

  // Both date_start/date_end land exactly on local midnight only when they
  // were written by this same page's own all-day drop (see onEventReceive
  // below) - a real timed section never starts/ends there, so this is a
  // safe way to tell the two apart when redisplaying one without a
  // separate "is this all-day" column to read instead (same heuristic as
  // display.ts's own hasTimeComponent).
  private toEventInput(section: SectionWithProject): EventInput {
    const start = new Date(section.date_start!);
    const end = new Date(section.date_end!);
    const allDay = start.getHours() === 0 && start.getMinutes() === 0
      && end.getHours() === 0 && end.getMinutes() === 0;

    return {
      id: `section-${section.id}`,
      title: `${section.project_name} — ${section.title}`,
      start,
      end,
      allDay,
      extendedProps: { sectionId: section.id },
    };
  }

  // Fed straight into a [attr.data-event] in calendar.html - read back by
  // ngAfterViewInit's own Draggable(eventData) above once dropped.
  eventDataFor(section: SectionWithProject): string {
    return JSON.stringify({
      title: `${section.project_name} — ${section.title}`,
      extendedProps: { sectionId: section.id },
    });
  }

  // Month view drops an all-day event (no time picked) - stored as local
  // midnight for that day, no time-of-day at all, so it stays in the
  // all-day row once redisplayed (see toEventInput above) rather than
  // picking an arbitrary work-hours default that isn't actually true yet.
  // Week/day view drops at the exact time slot let go on instead - end
  // defaults to one hour later. Both are still adjustable afterwards like
  // any other section date (project-list.ts's own date pickers, or
  // project-resources.ts).
  private onEventReceive(info: EventReceiveArg): void {
    const sectionId = info.event.extendedProps['sectionId'] as number;
    const section = this.unscheduledSections().find(s => s.id === sectionId);
    const droppedStart = info.event.start;
    const allDay = info.event.allDay;
    // The ghost FullCalendar auto-added on drop is never the source of
    // truth - removed right away, a proper one is added back below only
    // once the write actually succeeds.
    info.event.remove();

    if (!section || !droppedStart) {
      return;
    }

    let dateStartIso: string;
    let dateEndIso: string;
    if (allDay) {
      const start = new Date(droppedStart);
      start.setHours(0, 0, 0, 0);
      dateStartIso = start.toISOString();
      dateEndIso = dateStartIso;
    } else {
      dateStartIso = droppedStart.toISOString();
      dateEndIso = new Date(droppedStart.getTime() + 60 * 60 * 1000).toISOString();
    }

    this.documentSectionService.updateSection(sectionId, {
      date_start: dateStartIso,
      date_end: dateEndIso,
    }).subscribe({
      next: () => {
        this.unscheduledSections.update(sections => sections.filter(s => s.id !== sectionId));
        this.fullCalendar.getApi().addEvent(this.toEventInput({
          ...section,
          date_start: dateStartIso,
          date_end: dateEndIso,
        }));
      },
      error: err => console.error('calendar : ' + err)
    });
  }

  // Moving or resizing a section already on the calendar (as opposed to a
  // fresh drop from the sidebar - see onEventReceive above) only updates
  // the calendar's own in-memory event by itself; [editable]="true" makes
  // that possible but was never actually wired to persist it, which is
  // exactly why a refresh silently undid it. sectionId comes from
  // toEventInput's own extendedProps - every event on this calendar was
  // put there by this page in the first place, so it's always present.
  private onEventDropOrResize(info: EventDropArg | EventResizeDoneArg): void {
    const sectionId = info.event.extendedProps['sectionId'] as number;
    const start = info.event.start;
    const end = info.event.end;

    if (!start) {
      info.revert();
      return;
    }

    this.documentSectionService.updateSection(sectionId, {
      date_start: start.toISOString(),
      date_end: (end ?? start).toISOString(),
    }).subscribe({
      error: err => {
        console.error('calendar : ' + err);
        info.revert();
      }
    });
  }

}
