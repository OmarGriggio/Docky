import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NavLink {
  label: string;
  path: string;
  queryParams?: Record<string, string>;
}

interface NavItem {
  label: string;
  links: NavLink[];
}

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {

  navItems: NavItem[] = [
    {
      label: 'Clients',
      links: [
        { label: 'Liste', path: '/clients' },
        { label: 'Nouveau', path: '/clients/new' }
      ]
    },
    {
      label: 'Fournisseurs',
      links: [
        { label: 'Liste', path: '/fournisseurs' },
        { label: 'Nouveau', path: '/fournisseurs/new' }
      ]
    },
    {
      label: 'Documents',
      links: [
        { label: 'Offres', path: '/documents', queryParams: { type: 'OFFRE' } },
        { label: 'Factures', path: '/documents', queryParams: { type: 'FACTURE' } }
      ]
    },
    {
      label: 'Ressources',
      links: [
        { label: 'Matériel', path: '/ressources', queryParams: { type: 'MATERIEL' } },
        { label: "Main d'oeuvre", path: '/ressources', queryParams: { type: 'MAIN-OEUVRE' } },
        { label: 'Sous-traitance', path: '/ressources', queryParams: { type: 'SOUS-TRAITANCE' } },
        { label: 'Divers', path: '/ressources', queryParams: { type: 'DIVERS' } }
      ]
    }
  ];

}
