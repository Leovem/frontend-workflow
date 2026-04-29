import { Injectable } from '@angular/core';
import * as joint from '@joint/core';

@Injectable({
  providedIn: 'root'
})
export class DiagramPersistenceService {
  save(graph: joint.dia.Graph): string {
    return JSON.stringify(graph.toJSON());
  }

  load(graph: joint.dia.Graph, json: string): void {
    graph.clear();
    graph.fromJSON(JSON.parse(json));
  }
}