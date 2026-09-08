import { Component, computed, inject, OnInit, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectButton } from 'primeng/selectbutton';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { ProjectService } from '../project.service';
import { ClientService } from '../../clients/client.service';
import { Client } from '../../../shared/models/client';
import { Project, ProjectType } from '../../../shared/models/project';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Textarea, FloatLabel, SelectButton, Select, Button],
  templateUrl: './project-form.html',
  styleUrl: './project-form.css',
})
export class ProjectForm implements OnInit {

  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private clientService = inject(ClientService);

  // When set (see "Dupliquer" in project-list.ts), pre-fills the form with
  // an existing project's data - nothing on projects is unique, so unlike
  // client/supplier/resource duplication this can prefill everything,
  // including the type (resolved from its label once project types load).
  duplicateFrom = input<Project | null>(null);

  saved = output<void>();
  cancelled = output<void>();

  clients = signal<Client[]>([]);
  projectTypes = signal<ProjectType[]>([]);
  newTypeVisible = signal(false);

  clientOptions = computed(() =>
    this.clients().map(client => ({
      label: client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim(),
      value: client.id
    }))
  );

  typeOptions = computed(() =>
    this.projectTypes().map(type => ({ label: type.label, value: type.id }))
  );

  addressOptions = [
    { label: 'Adresse du client', value: true },
    { label: 'Autre adresse', value: false }
  ];

  form = this.fb.nonNullable.group({
    client_id: [null as number | null, Validators.required],
    project_type_id: [null as number | null, Validators.required],
    name: ['', Validators.required],
    note: [''],
    same_address_as_client: [true],
    street: [''],
    postal_code: [''],
    city: [''],
    country: [''],
  });

  constructor() {
    this.form.controls.same_address_as_client.valueChanges.subscribe(sameAddress => {
      if (sameAddress) {
        this.form.patchValue({ street: '', postal_code: '', city: '', country: '' });
      }
    });
  }

  get sameAddressAsClient(): boolean {
    return this.form.controls.same_address_as_client.value;
  }

  ngOnInit(): void {
    this.clientService.getClients().subscribe({
      next: data => {
        this.clients.set(data);
      },
      error: err => {
        console.error("project-form : " + err);
      }
    });

    this.loadProjectTypes();

    const source = this.duplicateFrom();
    if (source) {
      this.form.patchValue({
        client_id: source.client_id,
        name: source.name,
        note: source.note ?? '',
        same_address_as_client: source.same_address_as_client,
        street: source.street ?? '',
        postal_code: source.postal_code ?? '',
        city: source.city ?? '',
        country: source.country ?? '',
      });
    }
  }

  private loadProjectTypes(): void {
    this.projectService.getProjectTypes().subscribe({
      next: data => {
        this.projectTypes.set(data);

        // project_type_id can only be resolved once the types are loaded -
        // the source Project only carries the type's label, not its id.
        const source = this.duplicateFrom();
        if (source) {
          const matchingType = data.find(type => type.label === source.project_type);
          if (matchingType) {
            this.form.patchValue({ project_type_id: matchingType.id });
          }
        }
      },
      error: err => {
        console.error("project-form : " + err);
      }
    });
  }

  toggleNewType(): void {
    this.newTypeVisible.update(visible => !visible);
  }

  addProjectType(label: string): void {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }

    this.projectService.createProjectType(trimmed).subscribe({
      next: projectType => {
        this.projectTypes.update(types => [...types, projectType]);
        this.form.patchValue({ project_type_id: projectType.id });
        this.newTypeVisible.set(false);
      },
      error: err => {
        console.error("project-form : " + err);
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

    const { client_id, project_type_id, ...rest } = this.form.getRawValue();

    this.projectService.createProject({
      ...rest,
      client_id: client_id!,
      project_type_id: project_type_id!,
    }).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('project-form : ' + err);
      }
    });
  }

}
