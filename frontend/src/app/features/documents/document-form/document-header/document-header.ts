import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { ClientForm } from '../../../clients/client-form/client-form';
import { Client } from '../../../../shared/models/client';
import { Address } from '../../../../shared/models/address';
import { Company } from '../../../../shared/models/company';
import { DocumentType } from '../../../../shared/models/document';
import { clientDisplayName, addressLabel } from '../../../../shared/utils/display';

// The top of the document form: the company's own block, the page title,
// date/due date/number, then the client column (client, its billing
// address, the "Lieu/Bâtiment" picker, the client's reference). It owns no
// document state: the form's own signals come in as models (the date, the
// due date, the Lieu, the reference) or as inputs + outputs where the form
// has to react (picking or creating a client - it loads that client's
// addresses and resets what depended on the previous one).
@Component({
  selector: 'app-document-header',
  standalone: true,
  imports: [FormsModule, InputText, FloatLabel, Select, DatePicker, Button, Dialog, ClientForm],
  templateUrl: './document-header.html',
  host: { class: 'block' },
})
export class DocumentHeader {

  private router = inject(Router);

  company = input<Company | null>(null);
  logoUrl = input<string | null>(null);
  pageTitle = input.required<string>();
  type = input.required<DocumentType>();
  // Only meaningful in edit mode - a fresh draft always says "généré
  // automatiquement" instead.
  documentNumber = input<string | null>(null);
  // A document past DRAFT/SENT is a frozen record - says so, the form
  // itself disables saving.
  locked = input(false);

  clients = input<Client[]>([]);
  clientId = input<number | null>(null);
  // The selected client's own saved addresses - source for both addresses
  // below: where the document itself is billed to/sent (always the client's
  // own primary one, read-only - see selectedClientAddress) is a different
  // thing from "Lieu/Bâtiment" (addressId/addressOptions), the work site a
  // chantier's own resource ledger belongs to, freely pickable among the
  // same list.
  addresses = input<Address[]>([]);

  // Not two-way: the form recomputes the due date when this one changes, so
  // it handles the change itself (see document-form.ts's onDateChange).
  date = model.required<Date>();
  dueDate = model<Date | null>(null);
  addressId = model<number | null>(null);
  referenceClient = model('');

  clientChange = output<number | null>();
  clientCreated = output<Client>();

  clientOptions = computed(() =>
    this.clients().map(client => ({ label: clientDisplayName(client), value: client.id }))
  );

  // Billing address - read-only, purely informational (where this document
  // itself is sent), unrelated to addressId.
  selectedClientAddress = computed(() =>
    this.addresses().find(a => a.is_primary) ?? this.addresses()[0] ?? null
  );

  addressOptions = computed(() =>
    this.addresses().map(address => ({ label: addressLabel(address), value: address.id }))
  );

  // "Ajouter un client" (the client p-select's own footer, see the
  // template) - for when the client being invoiced/quoted doesn't exist
  // yet. Creating one closes the dialog and hands the new client to the
  // form, which adds it to the list and selects it right away, same as
  // picking an existing one by hand.
  createClientDialogVisible = signal(false);

  onClientCreated(client: Client): void {
    this.createClientDialogVisible.set(false);
    this.clientCreated.emit(client);
  }

  onDateChange(value: Date | null): void {
    if (value) {
      this.date.set(value);
    }
  }

  // "Ajouter une adresse" (the "Lieu/Bâtiment" picker's own footer) - this
  // page has no address form of its own, client-detail.ts already does (its
  // own addresses table). Navigating away loses whatever draft is filled in
  // here, same trade-off as "Annuler" - acceptable since adding a missing
  // address is expected to be rare, not a normal step.
  goToClientAddresses(): void {
    const clientId = this.clientId();
    if (clientId === null) {
      return;
    }
    this.router.navigate(['/clients', clientId]);
  }

}
