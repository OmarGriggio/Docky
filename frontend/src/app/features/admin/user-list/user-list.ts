import { Component, inject, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { UserService } from '../user.service';
import { User } from '../../../shared/models/user';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [TableModule, Menu, Button, ConfirmDialogComponent],
  templateUrl: './user-list.html'
})
export class UserListComponent implements OnInit {

  private userService = inject(UserService);

  users = signal<User[]>([]);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private userPendingDelete: User | null = null;

  // Computed once, right when the ⋮ button is clicked - not as a live
  // [model]="getActions(user)" template expression, which Angular
  // re-evaluates on every change-detection cycle. That handed p-menu a
  // brand new array of brand new MenuItem objects (with their own command
  // closures) constantly, including mid-interaction - p-menu rebuilding its
  // own items right as/after you click one is why a first click seemed to
  // do nothing and a second one (once things had settled) actually worked.
  menuItems: MenuItem[] = [];

  openActionsMenu(menu: Menu, event: Event, user: User): void {
    this.menuItems = this.getActions(user);
    menu.toggle(event);
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: data => {
        this.users.set(data);
      },
      error: err => {
        console.error("user-list : " + err);
      }
    });
  }

  getActions(user: User): MenuItem[] {
    return [
      {
        label: 'Supprimer',
        command: () => this.deleteUser(user)
      }
    ];
  }

  private deleteUser(user: User): void {
    this.userPendingDelete = user;
    this.confirmMessage.set(`Supprimer l'utilisateur ${user.first_name} ${user.last_name} ?`);
    this.confirmVisible.set(true);
  }

  onDeleteConfirmed(): void {
    const user = this.userPendingDelete;
    if (!user) {
      return;
    }
    this.userPendingDelete = null;

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: err => {
        console.error("user-list : " + err);
      }
    });
  }

}
