import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { RadioButton } from 'primeng/radiobutton';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { ToggleButton } from 'primeng/togglebutton';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';
import { SelectButton } from 'primeng/selectbutton';

@Component({
  selector: 'app-uitest',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    SelectButton,
    Card,
    Checkbox,
    Dialog,
    FloatLabel,
    InputText,
    RadioButton,
    Select,
    Tag,
    Textarea,
    ToggleButton,
    ConfirmDialogComponent
  ],
  templateUrl: './uitest.html',
  styleUrl: './uitest.css'
})
export class UiTest {

  private fb = new FormBuilder();

  severities = ['primary', 'secondary', 'success', 'info', 'warn', 'danger', 'contrast'] as const;

  priorites = ['basse', 'normale', 'haute'];

  categories = [
    { label: 'Matériel', value: 'MATERIEL' },
    { label: "Main d'oeuvre", value: 'MAIN-OEUVRE' },
    { label: 'Sous-traitance', value: 'SOUS-TRAITANCE' }
  ];

  form = this.fb.group({
    nom: [''],
    categorie: [null as string | null],
    actif: [true],
    priorite: ['normale'],
    remarque: ['']
  });

  dialogVisible = signal(false);
  confirmVisible = signal(false);

  actifOptions = [
    { label: 'Actif', value: true },
    { label: 'Inactif', value: false }
  ];

  openDialog(): void {
    this.dialogVisible.set(true);
  }

  openConfirm(): void {
    this.confirmVisible.set(true);
  }

}
