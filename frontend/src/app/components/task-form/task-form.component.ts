import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskService } from '../../services/task.service';

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
  tagsInput = ''; // comma-separated tags as typed by the user
  dueDate = '';
  errorMessage = '';

  aiLoading = false;
  aiSuggestedSubtasks: string[] = [];

  constructor(private taskService: TaskService) {}

  ngOnChanges(): void {
    if (this.task) {
      this.title = this.task.title;
      this.description = this.task.description || '';
      this.status = this.task.status;
      this.priority = this.task.priority;
      this.tagsInput = (this.task.tags || []).join(', ');
      this.dueDate = this.task.dueDate ? this.task.dueDate.substring(0, 10) : '';
    } else {
      this.title = '';
      this.description = '';
      this.status = 'todo';
      this.priority = 'medium';
      this.tagsInput = '';
      this.dueDate = '';
    }
    this.aiSuggestedSubtasks = [];
  }

  // Calls the backend AI endpoint to generate a description + subtasks
  // from just the title. Requires a title to be typed first.
  getAiSuggestion(): void {
    if (!this.title.trim()) {
      this.errorMessage = 'Type a title first, then ask AI to suggest details.';
      return;
    }

    this.errorMessage = '';
    this.aiLoading = true;

    this.taskService.getAiSuggestion(this.title.trim()).subscribe({
      next: (result) => {
        this.aiLoading = false;
        if (result.description) this.description = result.description;
        this.aiSuggestedSubtasks = result.subtasks || [];
      },
      error: (err) => {
        this.aiLoading = false;
        this.errorMessage =
          err.error?.message || 'Could not get an AI suggestion right now.';
      },
    });
  }

  get isEditMode(): boolean {
    return !!this.task;
  }

  onSubmit(): void {
    if (!this.title.trim()) {
      this.errorMessage = 'Title is required.';
      return;
    }

    const tags = this.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    this.save.emit({
      title: this.title.trim(),
      description: this.description.trim(),
      status: this.status,
      priority: this.priority,
      tags,
      dueDate: this.dueDate ? this.dueDate : null,
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}
