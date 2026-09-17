import { Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';
import { UserRole } from '../models/auth';

interface NavLink {
  label: string;
  path: string;
  queryParams?: Record<string, string>;
}

interface NavItem {
  label: string;
  icon: string;
  links: NavLink[];
  roles?: UserRole[];
}

// Collapsed/expanded is a per-browser display preference, not app state -
// kept in localStorage the same way as auth.service.ts's own tokens, read
// once at construction.
const NAV_EXPANDED_KEY = 'docky_nav_expanded';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {

  private authService = inject(AuthService);
  private location = inject(Location);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;
  isImpersonating = this.authService.isImpersonating;

  expanded = signal(localStorage.getItem(NAV_EXPANDED_KEY) === 'true');

  toggleExpanded(): void {
    const next = !this.expanded();
    this.expanded.set(next);
    localStorage.setItem(NAV_EXPANDED_KEY, String(next));
  }

  // Every rail item (the toggle button itself included) shares this same
  // layout: an icon, centered in a 40px square while collapsed - its label
  // shown only as a hover tooltip (labelClasses() below) - versus icon +
  // always-visible inline label, full-height row, while expanded. Kept as
  // methods returning whole literal class strings (not built up from
  // pieces) so Tailwind's own static-source scan can still find them.
  linkClasses(): string {
    return this.expanded()
      // md:w-full: items-stretch on the ancestor chain (nav > the auth
      // wrapper div) turned out not to be enough on its own - measured live,
      // the profile link stayed sized to its own content (214px) instead of
      // actually filling nav's 224px, 3px short of nav's own right edge once
      // its 12px left padding was added back in. An explicit width:100% is a
      // direct instruction, not dependent on every ancestor's align-items
      // correctly cascading, so it doesn't have the same failure mode.
      // min-w-0 still matters alongside it - width:100% alone doesn't
      // override a flex item's own "never shrink below content size" floor,
      // which is what let a long label (e.g. "Retour vue plateforme" below)
      // keep forcing this button wider than that 100% in the first place.
      ? 'group relative flex items-center gap-3 h-10 px-3 rounded-md text-[1.1rem] text-gray-500 hover:bg-gray-100 transition-colors min-w-0 md:w-full'
      : 'group relative flex items-center justify-center w-10 h-10 rounded-md text-[1.1rem] text-gray-500 hover:bg-gray-100 transition-colors';
  }

  // Collapsed: an absolutely-positioned tooltip, hidden until the parent
  // .group is hovered (replaces the old CSS :hover rule with Tailwind's
  // group-hover). Expanded: a plain static inline label instead - min-w-0 +
  // truncate (rather than whitespace-nowrap alone) so a label too long for
  // nav's own fixed width ellipsizes instead of forcing its parent button
  // wider than nav itself (see linkClasses() above).
  //
  // Uses Tailwind's own gray-* palette, not PrimeNG's surface-* tokens (see
  // linkClasses() above) - same reasoning, this project has no bridge
  // between the two.
  labelClasses(): string {
    return this.expanded()
      ? 'text-sm truncate min-w-0'
      : 'absolute left-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2.5 py-1 rounded whitespace-nowrap opacity-0 invisible pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:visible z-[1]';
  }

  // Lands back on the company picker rather than wherever the impersonated
  // view happened to be - that page wouldn't mean anything once back on the
  // platform admin's own company/token.
  returnToPlatformView(): void {
    this.authService.returnToPlatformView();
    this.router.navigate(['/profile/companies']);
  }

  // A flyout is a plain <details>/<summary> (see nav-bar.html - no PrimeNG
  // overlay here, same eager-bundle-size reasoning as the tooltip). Clicking
  // one of its own links already closes it, but a native <details> doesn't
  // close on its own when you click anywhere else - that has to be done by
  // hand, so this closes any that are open whenever a click lands outside
  // this component's own host element.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    // No more .nav-bar__group marker class now that layout classes are
    // Tailwind utilities computed in linkClasses() - every <details> inside
    // this component's own host is one of the flyout groups above, nothing
    // else uses that element here.
    const openGroups: NodeListOf<HTMLDetailsElement> = this.elementRef.nativeElement.querySelectorAll('details[open]');
    openGroups.forEach(details => {
      if (!details.contains(target)) {
        details.open = false;
      }
    });
  }

  // The flyout <details> wrapper (Documents/Ressources - see nav-bar.html)
  // needs the same md:w-full as linkClasses() above, but ONLY while
  // expanded: unlike a plain <a>/<button>, <details> isn't itself a flex
  // container centering its own <summary>, so forcing it full-width while
  // collapsed left the summary's 40px icon sitting at <details>'s own left
  // edge instead of centered like every sibling icon - a regression caught
  // live (Documents/Ressources icons sat further left than the rest).
  groupClasses(): string {
    return this.expanded() ? 'relative min-w-0 md:w-full' : 'relative';
  }

  // <nav>'s own width - only takes effect at the md breakpoint (see
  // nav-bar.html): below it, nav stays the full-width wrapped top bar it's
  // always been regardless of expanded(), the rail width only being a
  // desktop-sidebar concept.
  navWidthClasses(): string {
    return this.expanded()
      ? 'md:w-56 md:items-stretch md:px-3'
      : 'md:w-16 md:items-center md:px-2';
  }

  // One global "Retour" in the nav-bar (itself present on every page,
  // being part of the app shell - see app.ts) rather than a button
  // repeated on each individual page template. Plain browser-history back,
  // not a fixed route - it goes wherever the user actually came from.
  goBack(): void {
    this.location.back();
  }

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      links: [
        { label: 'Dashboard', path: '/dashboard' }
      ],
      // Matches app.routes.ts's own restriction - a plain USER (employee)
      // has no company-wide figures to look at here.
      roles: ['ADMIN', 'PLATFORM_ADMIN']
    },
    {
      // Matches app.routes.ts's own restriction - a plain USER (employee)
      // doesn't plan chantiers.
      label: 'Calendrier',
      icon: 'pi pi-calendar',
      links: [
        { label: 'Calendrier', path: '/calendar' }
      ],
      roles: ['ADMIN', 'PLATFORM_ADMIN']
    },
    {
      label: 'Clients',
      icon: 'pi pi-address-book',
      links: [
        { label: 'Liste', path: '/clients' }
      ]
    },
    {
      label: 'Documents',
      icon: 'pi pi-receipt',
      links: [
        { label: 'Offres', path: '/documents', queryParams: { type: 'QUOTE' } },
        { label: 'Factures', path: '/documents', queryParams: { type: 'INVOICE' } }
      ]
    },
    {
      label: 'Ressources',
      icon: 'pi pi-box',
      links: [
        { label: 'Matériel', path: '/resources', queryParams: { type: 'MATERIAL' } },
        { label: 'Service', path: '/resources', queryParams: { type: 'SERVICE' } }
      ]
    },
    {
      label: 'Chantiers',
      icon: 'pi pi-hammer',
      links: [
        { label: 'Liste', path: '/projects' }
      ]
    }
  ];

  visibleNavItems = computed(() => {
    const role = this.currentUser()?.role;
    return this.navItems.filter(item => !item.roles || (role && item.roles.includes(role)));
  });

}
