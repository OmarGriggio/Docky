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
    this.confirmMessage.set(`Supprimer l'utilisateur ${user.prenom} ${user.nom} ?`);
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
