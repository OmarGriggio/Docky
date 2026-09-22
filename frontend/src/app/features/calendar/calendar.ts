import { AfterViewInit, Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventDropArg, EventHoveringArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg, Draggable, EventReceiveArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { InputText } from 'primeng/inputtext';
import { DatePicker } from 'primeng/datepicker';
import { FloatLabel } from 'primeng/floatlabel';
import { DocumentSectionService } from '../documents/document-section.service';
import { DocumentLineService } from '../documents/document-line.service';
import { CalendarNoteService } from './calendar-note.service';
import { SectionWithProject } from '../../shared/models/document-section';
import { DocumentLine } from '../../shared/models/document-line';
import { CalendarNote } from '../../shared/models/calendar-note';
import { PricePipe } from '../../shared/pipes/price.pipe';

// Plain calendar entries (this file's own notesById below), not tied to any
// chantier/section - shown in a flat neutral grey so they read as distinct
// from a section's own (future: per-chantier) color.
const NOTE_COLOR = '#9ca3af';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule, Dialog, Button, Textarea, InputText, DatePicker, FloatLabel, RouterLink, FormsModule, PricePipe],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarPage implements OnInit, AfterViewInit {

  private documentSectionService = inject(DocumentSectionService);
  private documentLineService = inject(DocumentLineService);
  private calendarNoteService = inject(CalendarNoteService);

  @ViewChild('fullCalendar') fullCalendar!: FullCalendarComponent;
  @ViewChild('unscheduledList') unscheduledListRef!: ElementRef<HTMLElement>;

  // The sidebar's own draggable source (see ngAfterViewInit/onEventReceive
  // below) - every section still with no schedule, across every
  // IN_PROGRESS chantier (a COMPLETED one's quantities are locked, nothing
  // left to plan).
  unscheduledSections = signal<SectionWithProject[]>([]);

  // Keyed by section id - every section ever put on the calendar (from
  // loadScheduledSections or dropped via onEventReceive), so eventClick
  // below can show full details (description, chantier...) without a
  // round-trip: FullCalendar's own event only carries what toEventInput put
  // in extendedProps, which is just the id.
  private sectionsById = new Map<number, SectionWithProject>();

  detailDialogVisible = signal(false);
  selectedSection = signal<SectionWithProject | null>(null);
  selectedSectionLines = signal<DocumentLine[]>([]);
  // Bound to the dialog's textarea - kept separate from selectedSection so
  // typing doesn't imply it's saved; only saveNote() below persists it.
  noteDraft = signal('');

  // The hover preview (chantier/titre/description) shown while the mouse is
  // over an event - a lighter-weight peek than the click dialog above,
  // which also loads the section's lines. Positioned off the hovered
  // event's own bounding rect (see onEventMouseEnter), not the cursor -
  // steadier while moving across a short event block.
  hoveredSection = signal<SectionWithProject | null>(null);
  hoverPosition = signal({ top: 0, left: 0 });

  // Free-standing calendar notes (see calendar-note.service.ts) - separate
  // from the chantier sections above, keyed the same way (by id, so
  // onEventClick/save/delete below can look one up from the FullCalendar
  // event's own extendedProps).
  private notesById = new Map<number, CalendarNote>();

  noteDialogVisible = signal(false);
  // null while creating a brand new note (see onDateClick) - the id of the
  // note being edited otherwise (see openNoteDialog). Also what the
  // template checks to show the "Supprimer" button only when editing.
  editingNoteId = signal<number | null>(null);
  noteTitleDraft = signal('');
  noteDescriptionDraft = signal('');
  noteStartDraft = signal<Date | null>(null);
  noteEndDraft = signal<Date | null>(null);

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: 'fr',
    firstDay: 1,
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
    eventClick: info => this.onEventClick(info),
    eventMouseEnter: info => this.onEventMouseEnter(info),
    eventMouseLeave: () => this.hoveredSection.set(null),
    dateClick: info => this.onDateClick(info),
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
    this.loadNotes();
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
          this.sectionsById.set(section.id, section);
          calendarApi.addEvent(this.toEventInput(section));
        }
      },
      error: err => console.error('calendar : ' + err)
    });
  }

  // Every already-created note, shown in grey (see NOTE_COLOR) alongside the
  // chantier sections loaded above.
  private loadNotes(): void {
    this.calendarNoteService.getNotes().subscribe({
      next: notes => {
        const calendarApi = this.fullCalendar.getApi();
        for (const note of notes) {
          this.notesById.set(note.id, note);
          calendarApi.addEvent(this.toNoteEventInput(note));
        }
      },
      error: err => console.error('calendar : ' + err)
    });
  }

  private toNoteEventInput(note: CalendarNote): EventInput {
    return {
      id: `note-${note.id}`,
      title: note.title,
      start: new Date(note.date_start),
      end: new Date(note.date_end),
      backgroundColor: NOTE_COLOR,
      borderColor: NOTE_COLOR,
      extendedProps: { noteId: note.id },
    };
  }

  // Clicking an empty date/slot - month view gives a bare date (allDay),
  // week/day view an exact time. Opens the note dialog pre-filled with that
  // as a starting point (still freely editable before saving), same "drop
  // defaults to +1h in timed views, stays a bare date in month view"
  // convention as onEventReceive below for a dropped section.
  private onDateClick(info: DateClickArg): void {
    const start = new Date(info.date);
    const end = info.allDay ? start : new Date(start.getTime() + 60 * 60 * 1000);

    this.editingNoteId.set(null);
    this.noteTitleDraft.set('');
    this.noteDescriptionDraft.set('');
    this.noteStartDraft.set(start);
    this.noteEndDraft.set(end);
    this.noteDialogVisible.set(true);
  }

  private openNoteDialog(noteId: number): void {
    const note = this.notesById.get(noteId);
    if (!note) {
      return;
    }

    this.editingNoteId.set(noteId);
    this.noteTitleDraft.set(note.title);
    this.noteDescriptionDraft.set(note.description ?? '');
    this.noteStartDraft.set(new Date(note.date_start));
    this.noteEndDraft.set(new Date(note.date_end));
    this.noteDialogVisible.set(true);
  }

  saveNoteDialog(): void {
    const title = this.noteTitleDraft().trim();
    const start = this.noteStartDraft();
    const end = this.noteEndDraft();
    if (!title || !start || !end) {
      return;
    }

    const data = {
      title,
      description: this.noteDescriptionDraft().trim() || null,
      date_start: start.toISOString(),
      date_end: end.toISOString(),
    };

    const editingId = this.editingNoteId();
    const request = editingId !== null
      ? this.calendarNoteService.updateNote(editingId, data)
      : this.calendarNoteService.createNote(data);

    request.subscribe({
      next: note => {
        this.notesById.set(note.id, note);
        const calendarApi = this.fullCalendar.getApi();
        calendarApi.getEventById(`note-${note.id}`)?.remove();
        calendarApi.addEvent(this.toNoteEventInput(note));
        this.noteDialogVisible.set(false);
      },
      error: err => console.error('calendar : ' + err)
    });
  }

  deleteNoteDialog(): void {
    const editingId = this.editingNoteId();
    if (editingId === null) {
      return;
    }

    this.calendarNoteService.deleteNote(editingId).subscribe({
      next: () => {
        this.notesById.delete(editingId);
        this.fullCalendar.getApi().getEventById(`note-${editingId}`)?.remove();
        this.noteDialogVisible.set(false);
      },
      error: err => console.error('calendar : ' + err)
    });
  }

  private onEventClick(info: EventClickArg): void {
    const noteId = info.event.extendedProps['noteId'] as number | undefined;
    if (noteId !== undefined) {
      this.openNoteDialog(noteId);
      return;
    }

    const sectionId = info.event.extendedProps['sectionId'] as number;
    const section = this.sectionsById.get(sectionId);
    if (!section) {
      return;
    }

    this.hoveredSection.set(null);
    this.selectedSection.set(section);
    this.selectedSectionLines.set([]);
    this.noteDraft.set(section.note ?? '');
    this.detailDialogVisible.set(true);

    this.documentLineService.getLines(section.document_id).subscribe({
      next: lines => this.selectedSectionLines.set(lines.filter(l => l.section_id === section.id)),
      error: err => console.error('calendar : ' + err)
    });
  }

  private onEventMouseEnter(info: EventHoveringArg): void {
    const sectionId = info.event.extendedProps['sectionId'] as number;
    const section = this.sectionsById.get(sectionId);
    if (!section) {
      return;
    }

    const rect = info.el.getBoundingClientRect();
    this.hoverPosition.set({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    this.hoveredSection.set(section);
  }

  saveNote(): void {
    const section = this.selectedSection();
    if (!section) {
      return;
    }

    const note = this.noteDraft().trim() || null;
    this.documentSectionService.updateSectionNote(section.id, note).subscribe({
      next: () => {
        const updatedSection = { ...section, note };
        this.sectionsById.set(section.id, updatedSection);
        this.selectedSection.set(updatedSection);
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
      title: `${section.title} — ${section.project_name}`,
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
      title: `${section.title} — ${section.project_name}`,
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
        const scheduledSection = { ...section, date_start: dateStartIso, date_end: dateEndIso };
        this.sectionsById.set(sectionId, scheduledSection);
        this.fullCalendar.getApi().addEvent(this.toEventInput(scheduledSection));
      },
      error: err => console.error('calendar : ' + err)
    });
  }

  // Moving or resizing an event already on the calendar (as opposed to a
  // fresh drop from the sidebar - see onEventReceive above) only updates
  // the calendar's own in-memory event by itself; [editable]="true" makes
  // that possible but was never actually wired to persist it, which is
  // exactly why a refresh silently undid it. Branches on noteId vs
  // sectionId (see toNoteEventInput/toEventInput's own extendedProps) -
  // both kinds of event live on this same calendar and are both draggable.
  private onEventDropOrResize(info: EventDropArg | EventResizeDoneArg): void {
    const start = info.event.start;
    const end = info.event.end;

    if (!start) {
      info.revert();
      return;
    }

    const dateStartIso = start.toISOString();
    const dateEndIso = (end ?? start).toISOString();

    const noteId = info.event.extendedProps['noteId'] as number | undefined;
    if (noteId !== undefined) {
      const note = this.notesById.get(noteId);
      if (!note) {
        info.revert();
        return;
      }
      this.calendarNoteService.updateNote(noteId, {
        title: note.title,
        description: note.description,
        date_start: dateStartIso,
        date_end: dateEndIso,
      }).subscribe({
        next: updated => this.notesById.set(noteId, updated),
        error: err => {
          console.error('calendar : ' + err);
          info.revert();
        }
      });
      return;
    }

    const sectionId = info.event.extendedProps['sectionId'] as number;
    this.documentSectionService.updateSection(sectionId, {
      date_start: dateStartIso,
      date_end: dateEndIso,
    }).subscribe({
      next: () => {
        const section = this.sectionsById.get(sectionId);
        if (section) {
          this.sectionsById.set(sectionId, { ...section, date_start: dateStartIso, date_end: dateEndIso });
        }
      },
      error: err => {
        console.error('calendar : ' + err);
        info.revert();
      }
    });
  }

}
