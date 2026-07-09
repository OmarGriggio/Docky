import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NavLink {
  label: string;
  path: string;
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
        { label: 'Documents', path: '/documents' }
      ]
    }
  ];

}
