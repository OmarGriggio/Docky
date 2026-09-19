import { Component, HostListener, inject, signal, computed } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { Breadcrumb } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../features/auth/auth.service';

// A route's `data.breadcrumb` (see app.routes.ts): a plain label, or a
// function for the pages whose label depends on the URL (a query param, a
// detail page) - it gets that route's own snapshot and returns the items
// naming it. Only the *last* label of that list names the page for the
// history trail below. Routes without one contribute nothing (e.g. a redirect).
export type RouteBreadcrumb = string | ((route: ActivatedRouteSnapshot) => MenuItem[]);

interface TrailEntry {
  label: string;
  path: string;
  queryParams: Record<string, string>;
  // The full URL - what makes two entries "the same page".
  key: string;
}

// Persisted per tab, so a reload doesn't wipe the trail.
const TRAIL_KEY = 'docky_nav_trail';
// Older entries collapse into a "…" item that lists them.
const MAX_VISIBLE = 4;
const MAX_STORED = 20;

// The app shell's top bar (above every page, beside the nav-bar) - a
// breadcrumb of the pages visited, most recent last. Revisiting a page
// already in the trail cuts it back to that page instead of repeating it.
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [Breadcrumb, RouterLink],
  templateUrl: './header.html',
})
export class Header {

  private router = inject(Router);

  isAuthenticated = inject(AuthService).isAuthenticated;

  home: MenuItem = { icon: 'pi pi-home', routerLink: '/dashboard' };

  private trail = signal<TrailEntry[]>(this.loadTrail());
  hiddenOpen = signal(false);

  hiddenEntries = computed(() => this.trail().slice(0, -MAX_VISIBLE));

  items = computed<MenuItem[]>(() => {
    const trail = this.trail();
    const visible = trail.slice(-MAX_VISIBLE);
    const items: MenuItem[] = visible.map((entry, index) =>
      // The page you're on isn't a link to itself.
      index === visible.length - 1
        ? { label: entry.label }
        : { label: entry.label, routerLink: entry.path, queryParams: entry.queryParams },
    );
    return trail.length > MAX_VISIBLE ? [{ ellipsis: true }, ...items] : items;
  });

  constructor() {
    this.record();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.hiddenOpen.set(false);
        this.record();
      });
  }

  toggleHidden(event: Event): void {
    // Not left to the document listener below, which would close it again.
    event.stopPropagation();
    this.hiddenOpen.update(open => !open);
  }

  @HostListener('document:click')
  closeHidden(): void {
    this.hiddenOpen.set(false);
  }

  private record(): void {
    const label = this.currentLabel();
    const url = this.router.url;

    if (label === null) {
      // No breadcrumb on this route (login/register) - nothing to show, and
      // whoever comes next starts a fresh trail.
      if (url.startsWith('/login') || url.startsWith('/register')) {
        this.setTrail([]);
      }
      return;
    }

    const trail = this.trail();
    const existing = trail.findIndex(entry => entry.key === url);
    if (existing >= 0) {
      this.setTrail(trail.slice(0, existing + 1));
      return;
    }

    const parsed = this.router.parseUrl(url);
    const queryParams: Record<string, string> = {};
    for (const [name, value] of Object.entries(parsed.queryParams)) {
      queryParams[name] = String(value);
    }
    const path = '/' + parsed.root.children['primary']?.segments.map(segment => segment.path).join('/');

    this.setTrail([...trail, { label, path, queryParams, key: url }].slice(-MAX_STORED));
  }

  // The last label the active route chain declares (see RouteBreadcrumb).
  private currentLabel(): string | null {
    let leaf: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
    while (leaf.firstChild) {
      leaf = leaf.firstChild;
    }

    let label: string | null = null;
    for (const snapshot of leaf.pathFromRoot) {
      const breadcrumb = snapshot.data['breadcrumb'] as RouteBreadcrumb | undefined;
      if (typeof breadcrumb === 'string') {
        label = breadcrumb;
      } else if (breadcrumb) {
        label = breadcrumb(snapshot).at(-1)?.label ?? label;
      }
    }
    return label;
  }

  private setTrail(trail: TrailEntry[]): void {
    this.trail.set(trail);
    try {
      sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
    } catch {
      // Storage unavailable - the trail just won't survive a reload.
    }
  }

  private loadTrail(): TrailEntry[] {
    try {
      return JSON.parse(sessionStorage.getItem(TRAIL_KEY) ?? '[]');
    } catch {
      return [];
    }
  }
}
