import { ComponentFixture, TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { ClientForm } from './client-form';

describe('ClientForm', () => {
  let component: ClientForm;
  let fixture: ComponentFixture<ClientForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientForm],
      providers: [
        // ClientService needs an HttpClient context; the typeOptions labels
        // (translateSignal) need Transloco - the testing loader resolves
        // synchronously, no HTTP involved, see app.spec.ts's own comment.
        provideHttpClient(),
        provideHttpClientTesting(),
        importProvidersFrom(TranslocoTestingModule.forRoot({ langs: { fr: {} } })),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
