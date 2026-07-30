import { Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectButton } from 'primeng/selectbutton';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { ChantierService } from '../chantier.service';
import { ClientService } from '../../clients/client.service';
import { Client } from '../../../shared/models/client';
import { TypeChantier } from '../../../shared/models/chantier';

@Component({
  selector: 'app-chantier-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Textarea, FloatLabel, SelectButton, Select, Button],
  templateUrl: './chantier-form.html',
  styleUrl: './chantier-form.css',
})
export class ChantierForm implements OnInit {

  private fb = inject(FormBuilder);
  private chantierService = inject(ChantierService);
  private clientService = inject(ClientService);

  saved = output<void>();
  cancelled = output<void>();

  clients = signal<Client[]>([]);
  typesChantier = signal<TypeChantier[]>([]);
  newTypeVisible = signal(false);

  clientOptions = computed(() =>
    this.clients().map(client => ({
      label: client.societe || `${client.prenom ?? ''} ${client.nom ?? ''}`.trim(),
      value: client.id
    }))
  );

  typeOptions = computed(() =>
    this.typesChantier().map(type => ({ label: type.libelle, value: type.id }))
  );

  addresseOptions = [
    { label: 'Adresse du client', value: true },
    { label: 'Autre adresse', value: false }
  ];

  form = this.fb.nonNullable.group({
    id_client: [null as number | null, Validators.required],
    id_type_chantier: [null as number | null, Validators.required],
    nom: ['', Validators.required],
    remarque: [''],
    adresse_identique_client: [true],
    rue: [''],
    npa: [''],
    ville: [''],
    pays: [''],
  });

  constructor() {
    this.form.controls.adresse_identique_client.valueChanges.subscribe(identique => {
      if (identique) {
        this.form.patchValue({ rue: '', npa: '', ville: '', pays: '' });
      }
    });
  }

  get adresseIdentiqueClient(): boolean {
    return this.form.controls.adresse_identique_client.value;
  }

  ngOnInit(): void {
    this.clientService.getClients().subscribe({
      next: data => {
        this.clients.set(data);
      },
      error: err => {
        console.error("chantier-form : " + err);
      }
    });

    this.loadTypesChantier();
  }

  private loadTypesChantier(): void {
    this.chantierService.getTypesChantier().subscribe({
      next: data => {
        this.typesChantier.set(data);
      },
      error: err => {
        console.error("chantier-form : " + err);
      }
    });
  }

  toggleNewType(): void {
    this.newTypeVisible.update(visible => !visible);
  }

  addTypeChantier(libelle: string): void {
    const trimmed = libelle.trim();
    if (!trimmed) {
      return;
    }

    this.chantierService.createTypeChantier(trimmed).subscribe({
      next: typeChantier => {
        this.typesChantier.update(types => [...types, typeChantier]);
        this.form.patchValue({ id_type_chantier: typeChantier.id });
        this.newTypeVisible.set(false);
      },
      error: err => {
        console.error("chantier-form : " + err);
      }
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const { id_client, id_type_chantier, ...rest } = this.form.getRawValue();

    this.chantierService.createChantier({
      ...rest,
      id_client: id_client!,
      id_type_chantier: id_type_chantier!,
    }).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('chantier-form : ' + err);
      }
    });
  }

}
