import { TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        // NavBar (rendered by App) injects AuthService (HttpClient) and uses
        // RouterLink/RouterOutlet - both need a router/http context to
        // construct without throwing. HttpClientTesting keeps this a real
        // unit test, no network calls actually happen.
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // AuthService also injects TranslocoService (see its syncLanguage
        // effect) - the testing loader resolves synchronously from a plain
        // object, no HTTP involved, same "no HTTP, nothing async" spirit as
        // the rest of this project's tests.
        importProvidersFrom(TranslocoTestingModule.forRoot({ langs: { fr: {} } })),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the layout shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-nav-bar')).toBeTruthy();
    expect(compiled.querySelector('main.content')).toBeTruthy();
  });
});
