import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toolbar.component.html'
})
export class ToolbarComponent {
  @Input() processName = 'Nuevo Proceso de Negocio';
  @Input() lastSaved = 'Sin guardar';

  @Output() save = new EventEmitter<void>();
  @Output() generateAI = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() validate = new EventEmitter<void>();
}