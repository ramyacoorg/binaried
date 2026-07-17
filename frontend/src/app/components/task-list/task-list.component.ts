import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Task, TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { TaskFormComponent } from '../task-form/task-form.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, TaskFormComponent],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css'],
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];
  loading = false;
  errorMessage = '';

  showForm = false;
  taskBeingEdited: Task | null = null;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  get userName(): string {
    return this.authService.getUser()?.name || '';
  }

  loadTasks(): void {
    this.loading = true;
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Could not load tasks.';
      },
    });
  }

  openCreateForm(): void {
    this.taskBeingEdited = null;
    this.showForm = true;
  }

  openEditForm(task: Task): void {
    this.taskBeingEdited = task;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.taskBeingEdited = null;
  }

  onSaveTask(task: Partial<Task>): void {
    if (this.taskBeingEdited?._id) {
      this.taskService.updateTask(this.taskBeingEdited._id, task).subscribe({
        next: () => {
          this.closeForm();
          this.loadTasks();
        },
        error: (err) => (this.errorMessage = err.error?.message || 'Could not update task.'),
      });
    } else {
      this.taskService.createTask(task).subscribe({
        next: () => {
          this.closeForm();
          this.loadTasks();
        },
        error: (err) => (this.errorMessage = err.error?.message || 'Could not create task.'),
      });
    }
  }

  deleteTask(task: Task): void {
    if (!task._id) return;
    const confirmed = confirm(`Delete "${task.title}"? This cannot be undone.`);
    if (!confirmed) return;

    this.taskService.deleteTask(task._id).subscribe({
      next: () => this.loadTasks(),
      error: (err) => (this.errorMessage = err.error?.message || 'Could not delete task.'),
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
