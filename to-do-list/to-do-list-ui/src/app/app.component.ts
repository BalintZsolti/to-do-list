import { Component, OnInit } from '@angular/core';
import { Task } from './models/task.model';
import { TaskService } from './services/task.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AppComponent implements OnInit {
  newTaskTitle: string = '';
  newTaskDescription: string = '';
  showDescriptionInput: boolean = false;
  tasks: Task[] = [];
  doing: Task[] = [];
  done: Task[] = [];
  taskIdCounter: number = 0;
  selectedTask: Task | null = null;
  showTitleError: boolean = false;

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.getTasks();
  }

  getTasks(): void {
    this.taskService.getTasks()
      .subscribe(response => {
        this.tasks = response.tasks.map((task: Task) => {
          return { ...task, id: task.id };
        });
        this.doing = this.tasks.filter(task => task.status === 'doing');
        this.done = this.tasks.filter(task => task.status === 'done');
        this.tasks = this.tasks.filter(task => task.status === 'tasks');
      });
      console.log(this.tasks);
  }

  addTask() {
    if (this.newTaskTitle.trim() === '') {
      this.showTitleError = true;
      setTimeout(() => {
        this.showTitleError = false;
      }, 3000);
      return;
    }

    const newTask: Task = {
      id: '',
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      status: 'tasks'
    };

    this.taskService.createTask(newTask)
      .subscribe(response => {
        this.tasks.push(response);
        this.newTaskTitle = '';
        this.newTaskDescription = '';
        this.showDescriptionInput = false;
      });
    this.getTasks();
  }

  toggleDescriptionInput() {
    this.showDescriptionInput = !this.showDescriptionInput;
  }

  private updateTaskInList(taskList: Task[], updatedTask: Task): Task[] {
    const index = taskList.findIndex(task => task.id === updatedTask.id);
    if (index !== -1) {
      taskList[index] = updatedTask;
    }
    return taskList;
  }

  deleteTask(task: Task) {
    if (!task.id) {
      console.error('Task id is missing or undefined:', task);
      return;
    }

    this.taskService.deleteTask(task.id)
      .subscribe(
        () => {
          console.log('Deleted task:', task.id);
          this.tasks = this.tasks.filter(t => t.id !== task.id);
          this.doing = this.doing.filter(t => t.id !== task.id);
          this.done = this.done.filter(t => t.id !== task.id);
        },
        error => {
          console.error('Error deleting task:', error);
        }
      );
  }

  openEditModal(task: Task): void {
    this.selectedTask = { ...task };
    const modal = document.getElementById('editTaskModal');
    if (modal) {
      modal.style.display = 'block';
      this.getTasks();
    }
  }

  closeEditModal(): void {
    const modal = document.getElementById('editTaskModal');
    if (modal) {
      modal.style.display = 'none';
      this.getTasks();
    }
  }

  saveTask(): void {
    if (this.selectedTask) {
      this.taskService.editTask(this.selectedTask.id, this.selectedTask).subscribe(
        response => {
          this.updateTaskInList(this.tasks, response);
          this.updateTaskInList(this.doing, response);
          this.updateTaskInList(this.done, response);

          this.closeEditModal();
        },
        error => {
          console.error('Error updating task', error);
        }
      );
    }
  }

  onDragStart(event: DragEvent, task: Task) {
    event.dataTransfer?.setData('text/plain', task.id);
    event.dataTransfer?.setData('text/target', (event.target as HTMLElement).parentElement?.id ?? '');
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, container: string) {
    event.preventDefault();
    const taskId = event.dataTransfer?.getData('text/plain') ?? '';
    const sourceContainerId = event.dataTransfer?.getData('text/target');

    let task: Task | undefined;

    switch (sourceContainerId) {
      case 'tasks':
        task = this.tasks.find(t => t.id === taskId);
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        break;
      case 'doing':
        task = this.doing.find(t => t.id === taskId);
        this.doing = this.doing.filter(t => t.id !== taskId);
        break;
      case 'done':
        task = this.done.find(t => t.id === taskId);
        this.done = this.done.filter(t => t.id !== taskId);
        break;
    }

    if (task) {
      task.status = container;

      this.taskService.editTask(task.id, task)
        .subscribe(response => {
          console.log('Edited task:', response);

          switch (container) {
            case 'tasks':
              this.tasks.push(task);
              break;
            case 'doing':
              this.doing.push(task);
              break;
            case 'done':
              this.done.push(task);
              break;
          }
        });
    }
  }
}
