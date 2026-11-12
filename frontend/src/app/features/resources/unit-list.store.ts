import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ResourceUnitService } from './resource-unit.service';
import { ResourceUnit } from '../../shared/models/resource-unit';

// The company's unit list, shared by every app-unit-select of one page -
// provided by that page's component (`providers: [UnitListStore]`), so a
// document with 200 lines loads the list once, not 200 times, and a unit
// added or removed in one picker shows in all of them. A page provides its
// own, so the list is fresh on each visit.
@Injectable()
export class UnitListStore {

  private resourceUnitService = inject(ResourceUnitService);

  readonly units = signal<ResourceUnit[]>([]);

  constructor() {
    this.resourceUnitService.getUnits().subscribe({
      next: data => this.units.set(data),
      error: err => console.error('unit-list : ' + err)
    });
  }

  // Get-or-create (see resource-unit.service.ts).
  add(label: string): Observable<ResourceUnit> {
    return this.resourceUnitService.createUnit(label).pipe(
      tap(unit => this.units.update(units => units.some(u => u.id === unit.id) ? units : [...units, unit]))
    );
  }

  archive(id: number): Observable<ResourceUnit> {
    return this.resourceUnitService.archiveUnit(id).pipe(
      tap(() => this.units.update(units => units.filter(unit => unit.id !== id)))
    );
  }
}
