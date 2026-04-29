import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiagramNodeType } from '../../models/diagram-node-type.type';

type PaletteSectionKey = 'conexion' | 'basicos' | 'control' | 'final';

@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './palette.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
  `]
})
export class PaletteComponent {
  @Output() nodeSelected = new EventEmitter<DiagramNodeType>();

  sections: Record<PaletteSectionKey, boolean> = {
    conexion: true,
    basicos: true,
    control: true,
    final: true
  };

  toggleSection(section: PaletteSectionKey): void {
    this.sections[section] = !this.sections[section];
  }

  selectNode(type: DiagramNodeType): void {
    this.nodeSelected.emit(type);
  }

  onDragStart(event: DragEvent, type: DiagramNodeType): void {
    if (!event.dataTransfer) return;

    event.dataTransfer.setData('nodeType', type);
    event.dataTransfer.effectAllowed = 'copy';
  }
}