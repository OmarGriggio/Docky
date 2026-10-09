import { Component, input, model, output } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [Dialog, Button, TranslocoPipe],
  templateUrl: './confirm-dialog.html'
})
export class ConfirmDialogComponent {

  visible = model<boolean>(false);

  // Empty means "use the translated default" (see confirm-dialog.html) - a
  // literal default string here wouldn't react to a language switch.
  title = input<string>('');
  message = input<string>('');
  confirmLabel = input<string>('');
  cancelLabel = input<string>('');

  confirmed = output<void>();
  cancelled = output<void>();

  onConfirm(): void {
    this.visible.set(false);
    this.confirmed.emit();
  }

  onCancel(): void {
    this.visible.set(false);
    this.cancelled.emit();
  }

}
