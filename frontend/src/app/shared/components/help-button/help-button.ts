import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';

// Reusable "?" help button - drop it anywhere with an explanation as its
// content, e.g.:
//
//   <app-help-button>
//     Le rabais s'applique sur le montant total après TVA...
//   </app-help-button>
//
// Click toggles a popover with the projected content; PrimeNG's p-popover
// handles positioning and closing on an outside click.
@Component({
  selector: 'app-help-button',
  standalone: true,
  imports: [Button, Popover],
  templateUrl: './help-button.html',
})
export class HelpButton {
}
