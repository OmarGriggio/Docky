import { Component, input, output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Toolbar } from 'primeng/toolbar';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MenuItem } from 'primeng/api';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';

// The header bar every list page shares: a title on the left; on the right a
// search box, an optional "+" button, and a ⋮ menu with "Afficher/Masquer les
// archivés". It only holds the UI state that's its own (the menu) - the page
// keeps what the list actually depends on: `search` (two-way, the page
// filters its own rows with it), `showArchived` (one-way in, the page
// reloads on `showArchivedChange`) and what "+" does (`add`).
@Component({
  selector: 'app-list-toolbar',
  standalone: true,
  imports: [FormsModule, Toolbar, Button, Menu, InputText, IconField, InputIcon, TranslocoPipe],
  templateUrl: './list-toolbar.html',
})
export class ListToolbarComponent {

  title = input.required<string>();
  search = model('');
  // Empty means "use the translated default" (see list-toolbar.html) - a
  // literal default string here wouldn't react to a language switch.
  searchPlaceholder = input('');
  showArchived = input(false);
  // Off for a list that has nothing to create from here (chantiers).
  addable = input(true);

  showArchivedChange = output<boolean>();
  add = output<void>();

  private showArchivedLabel = translateSignal('common.showArchived');
  private hideArchivedLabel = translateSignal('common.hideArchived');

  // Built on click, not bound live: its label depends on showArchived(), and
  // a live [model] expression breaks p-menu (see user-list.ts's own
  // openActionsMenu - it needs a click, then a second one, to fire).
  menuItems: MenuItem[] = [];

  openMenu(menu: Menu, event: Event): void {
    this.menuItems = [
      {
        label: this.showArchived() ? this.hideArchivedLabel() : this.showArchivedLabel(),
        icon: 'pi pi-archive',
        command: () => this.showArchivedChange.emit(!this.showArchived())
      }
    ];
    menu.toggle(event);
  }

}
