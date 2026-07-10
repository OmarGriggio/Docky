import { Component, input, model, output } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [Dialog, Button],
  templateUrl: './confirm-dialog.html'
})
export class ConfirmDialogComponent {

  visible = model<boolean>(false);

  title = input<string>('Confirmation');
  message = input<string>('Êtes-vous sûr ?');
  confirmLabel = input<string>('Confirmer');
  cancelLabel = input<string>('Annuler');

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
