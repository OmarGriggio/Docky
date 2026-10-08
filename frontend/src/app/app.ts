import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './shared/nav-bar/nav-bar';
import { Header } from './shared/header/header';
import { DemoBanner } from './shared/demo-banner/demo-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBar, Header, DemoBanner],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
