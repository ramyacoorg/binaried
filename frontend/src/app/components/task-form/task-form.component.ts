import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../services/task.service';

// This component is used both for creating a new task and editing an
// existing one. If an input task is provided, the form is pre-filled and
// acts as "edit mode"; otherwise it starts blank for "create mode".
@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.css'],
})
export class TaskFormComponent implements OnChanges {
  @Input() task: Task | null = null;
  @Output() save = new EventEmitter<Partial<Task>>();
  @Output() close = new EventEmitter<void>();

  title = '';
  description = '';
  status: Task['status'] = 'todo';
  priority: Task['priority'] = 'medium';
  errorMessage = '';

  ngOnChanges(): void {
    if (this.task) {
      this.title = this.task.title;
      this.description = this.task.description || '';
      this.status = this.task.status;
      this.priority = this.task.priority;
    } else {
      this.title = '';
      this.description = '';
      this.status = 'todo';
      this.priority = 'medium';
    }
  }

  get isEditMode(): boolean {
    return !!this.task;
  }

  onSubmit(): void {
    if (!this.title.trim()) {
      this.errorMessage = 'Title is required.';
      return;
    }

    this.save.emit({
      title: this.title.trim(),
      description: this.description.trim(),
      status: this.status,
      priority: this.priority,
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}
