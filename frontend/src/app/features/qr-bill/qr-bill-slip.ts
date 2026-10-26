import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ClientService } from '../clients/client.service';
import { AddressService } from '../addresses/address.service';
import { DocumentService } from '../documents/document.service';
import { Client } from '../../shared/models/client';
import { Address } from '../../shared/models/address';
import { clientDisplayName } from '../../shared/utils/display';
import { qrBillErrorKey } from '../../shared/utils/api-error';

// The slip's official size, and the resolution its copied image is drawn at -
// 300 dpi, enough for the QR code to stay sharp once printed.
const SLIP_WIDTH_MM = 210;
const SLIP_HEIGHT_MM = 105;
const COPY_DPI = 300;
const MM_PER_INCH = 25.4;
// What Word/Excel take an HTML <img>'s pixel width/height as: CSS pixels,
// 96 per inch - so these make the pasted image exactly 210 × 105 mm.
const CSS_PX_PER_MM = 96 / MM_PER_INCH;

// A bare Swiss QR-bill payment slip for whoever's typed in (or picked from
// the clients list), with no document behind it - the amount is optional,
// left empty the payer fills it in. Clicking the slip copies it to the clipboard, to paste into a
// Word or Excel document of one's own.
@Component({
  selector: 'app-qr-bill-slip',
  standalone: true,
  imports: [FormsModule, Card, Select, InputText, InputNumber, FloatLabel, Button, TranslocoPipe],
  templateUrl: './qr-bill-slip.html',
})
export class QrBillSlip implements OnInit {

  private clientService = inject(ClientService);
  private addressService = inject(AddressService);
  private documentService = inject(DocumentService);
  private transloco = inject(TranslocoService);

  private clients = signal<Client[]>([]);
  private addresses = signal<Address[]>([]);

  clientOptions = computed(() =>
    this.clients()
      .filter(client => !client.is_placeholder)
      .map(client => ({ label: clientDisplayName(client), value: client.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  selectedClientId = signal<number | null>(null);
  name = signal('');
  complement = signal('');
  street = signal('');
  postalCodeCity = signal('');
  // Optional - left empty, the slip prints a blank amount box for the payer.
  amount = signal<number | null>(null);
  // Not a field on the page - taken from the picked client's address, so a
  // foreign client's slip still carries the right country code. Dropped once
  // the postcode/town is retyped (likely another place) or the client cleared.
  private country = signal<string | null>(null);

  generating = signal(false);
  errorMessage = signal<string | null>(null);
  copyMessage = signal<string | null>(null);

  private svg = signal<string | null>(null);
  slipUrl = computed(() => {
    const svg = this.svg();
    return svg ? this.svgDataUrl(svg) : null;
  });

  ngOnInit(): void {
    this.clientService.getClients().subscribe({
      next: data => this.clients.set(data),
      error: err => console.error('qr-bill-slip : ' + err)
    });
    this.addressService.getAddresses().subscribe({
      next: data => this.addresses.set(data),
      error: err => console.error('qr-bill-slip : ' + err)
    });
  }

  // Prefills every field from the client and its primary address (its first
  // one if none is primary) - all still editable afterwards.
  onClientChange(clientId: number | null): void {
    this.selectedClientId.set(clientId);
    this.svg.set(null);
    const client = this.clients().find(c => c.id === clientId);
    if (!client) {
      this.name.set('');
      this.complement.set('');
      this.street.set('');
      this.postalCodeCity.set('');
      this.country.set(null);
      return;
    }

    const clientAddresses = this.addresses().filter(a => a.client_id === client.id);
    const address = clientAddresses.find(a => a.is_primary) ?? clientAddresses[0];

    this.name.set(clientDisplayName(client));
    this.complement.set(address?.attention ?? '');
    this.street.set(address?.street ?? '');
    this.postalCodeCity.set(address ? `${address.postal_code ?? ''} ${address.city ?? ''}`.trim() : '');
    this.country.set(address?.country ?? null);
  }

  // Any field typed in by hand: the slip shown below no longer matches it
  // (cleared until generated again, so a stale one can't be copied), and a
  // retyped postcode/town may not be in the picked client's country any more.
  onFieldChange(field: 'name' | 'complement' | 'street' | 'postalCodeCity' | 'amount', value: string | number | null): void {
    if (field === 'amount') {
      this.amount.set(value as number | null);
    } else {
      this[field].set((value as string) ?? '');
      if (field === 'postalCodeCity') {
        this.country.set(null);
      }
    }
    this.svg.set(null);
  }

  generate(): void {
    this.errorMessage.set(null);
    this.copyMessage.set(null);
    this.generating.set(true);

    // Printed in the picked client's own language when there is one (same
    // rule as the PDFs), otherwise in the user's.
    const client = this.clients().find(c => c.id === this.selectedClientId());
    const language = client?.language === 'EN' || (!client && this.transloco.getActiveLang() === 'en') ? 'EN' : 'FR';

    this.documentService.getQrBillSlip({
      name: this.name(),
      complement: this.complement(),
      street: this.street(),
      postalCodeCity: this.postalCodeCity(),
      country: this.country(),
      amount: this.amount(),
      language,
    }).subscribe({
      next: svg => {
        this.svg.set(svg);
        this.generating.set(false);
      },
      error: async (err: HttpErrorResponse) => {
        console.error('qr-bill-slip : ' + err.message);
        this.svg.set(null);
        this.generating.set(false);
        const fallback = err.status === 400 || err.status === 422 ? 'qrBill.invalid' : 'qrBill.generateError';
        this.errorMessage.set(this.transloco.translate(await qrBillErrorKey(err, fallback)));
      }
    });
  }

  // Two formats at once, the paste target picks: an HTML <img> sized to
  // exactly 210 × 105 mm (what Word and Excel use, so the slip lands at its
  // official size), and the same image as a plain PNG for anything else.
  async copy(): Promise<void> {
    const svg = this.svg();
    if (!svg) {
      return;
    }
    this.copyMessage.set(null);
    this.errorMessage.set(null);

    try {
      const png = await this.renderPng(svg);
      const pngDataUrl = await this.blobToDataUrl(png);
      const width = Math.round(SLIP_WIDTH_MM * CSS_PX_PER_MM);
      const height = Math.round(SLIP_HEIGHT_MM * CSS_PX_PER_MM);
      const html = `<img src="${pngDataUrl}" width="${width}" height="${height}" style="width:${SLIP_WIDTH_MM}mm;height:${SLIP_HEIGHT_MM}mm">`;

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': png,
          'text/html': new Blob([html], { type: 'text/html' }),
        })
      ]);
      this.copyMessage.set(this.transloco.translate('qrBill.copied'));
    } catch (err) {
      console.error('qr-bill-slip : ' + err);
      this.errorMessage.set(this.transloco.translate('qrBill.copyError'));
    }
  }

  // Draws the SVG onto a canvas at COPY_DPI - the browser's own SVG renderer
  // does the work, the backend only ever sends vector data.
  private renderPng(svg: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(SLIP_WIDTH_MM / MM_PER_INCH * COPY_DPI);
        canvas.height = Math.round(SLIP_HEIGHT_MM / MM_PER_INCH * COPY_DPI);
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png');
      };
      image.onerror = () => reject(new Error('SVG could not be loaded'));
      image.src = this.svgDataUrl(svg);
    });
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private svgDataUrl(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

}
