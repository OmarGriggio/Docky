import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CalendarNote, CalendarNoteData } from '../../shared/models/calendar-note';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class CalendarNoteService {

  private http = inject(HttpClient);

  getNotes() {
    return this.http.get<CalendarNote[]>(`${API_BASE}/calendar-note`);
  }

  createNote(data: CalendarNoteData) {
    return this.http.post<CalendarNote>(`${API_BASE}/calendar-note`, data);
  }

  updateNote(id: number, data: CalendarNoteData) {
    return this.http.put<CalendarNote>(`${API_BASE}/calendar-note/${id}`, data);
  }

  deleteNote(id: number) {
    return this.http.delete<CalendarNote>(`${API_BASE}/calendar-note/${id}`);
  }

}
