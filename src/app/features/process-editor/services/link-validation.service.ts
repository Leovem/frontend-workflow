import { Injectable } from '@angular/core';
import * as joint from '@joint/core';
import { JOINT_META } from '../utils/joint-metadata';

@Injectable({
  providedIn: 'root'
})
export class LinkValidationService {
  isOutputPortGroup(group: string): boolean {
    return group === 'bottom' || group === 'left' || group === 'right';
  }

  isInputPortGroup(group: string): boolean {
    return group === 'top' || group === 'left' || group === 'right';
  }

  canConnect(
    graph: joint.dia.Graph,
    sourceCell: joint.dia.Cell | null,
    targetCell: joint.dia.Cell | null,
    sourcePortId: string | null,
    targetPortId: string | null,
    sourcePortGroup: string | null,
    targetPortGroup: string | null,
    sourceSelector: string | null,
    targetSelector: string | null
  ): { valid: boolean; message?: string } {
    if (!sourceCell || !targetCell) {
      return { valid: false, message: 'La conexión requiere origen y destino.' };
    }

    if (sourceCell.id === targetCell.id) {
      return { valid: false, message: 'Un nodo no puede conectarse consigo mismo.' };
    }

    const sourceType = sourceCell.get(JOINT_META.NODE_TYPE);
    const targetType = targetCell.get(JOINT_META.NODE_TYPE);

    if (sourceType === 'lane' || targetType === 'lane') {
      return { valid: false, message: 'No se puede conectar un Departamento.' };
    }

    const sourceIsBody = sourceSelector === 'body';
    const targetIsBody = targetSelector === 'body';

    if (!sourceIsBody) {
      if (!sourcePortId || !sourcePortGroup) {
        return { valid: false, message: 'La conexión debe salir por un puerto válido.' };
      }

      if (!this.isOutputPortGroup(sourcePortGroup)) {
        return { valid: false, message: 'La conexión debe salir por un puerto de salida.' };
      }
    }

    if (!targetIsBody) {
      if (!targetPortId || !targetPortGroup) {
        return { valid: false, message: 'La conexión debe entrar por un puerto válido.' };
      }

      if (!this.isInputPortGroup(targetPortGroup)) {
        return { valid: false, message: 'La conexión debe entrar por un puerto de entrada.' };
      }
    }

    if (targetType === 'initial') {
      return { valid: false, message: 'El nodo inicial no puede recibir entradas.' };
    }

    if (sourceType === 'activityFinal' || sourceType === 'flowFinal') {
      return { valid: false, message: 'Los nodos finales no pueden tener salidas.' };
    }

    if (this.existsDuplicateLink(
      graph,
      sourceCell,
      targetCell,
      sourcePortId ?? '__body__',
      targetPortId ?? '__body__'
    )) {
      return { valid: false, message: 'Ya existe una conexión entre esos elementos.' };
    }

    return { valid: true };
  }

  private existsDuplicateLink(
    graph: joint.dia.Graph,
    sourceCell: joint.dia.Cell,
    targetCell: joint.dia.Cell,
    sourcePortId: string,
    targetPortId: string
  ): boolean {
    return graph.getLinks().some((link) => {
      const source = link.source();
      const target = link.target();

      return source.id === sourceCell.id &&
        target.id === targetCell.id &&
        (source.port ?? '__body__') === sourcePortId &&
        (target.port ?? '__body__') === targetPortId;
    });
  }
}