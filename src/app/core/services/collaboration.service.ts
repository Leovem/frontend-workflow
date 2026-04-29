import { Injectable, OnDestroy } from '@angular/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Subject } from 'rxjs';

import { environment } from '../../../environments/environment.prod';

import {
  CollaborativeDiagramState,
  EMPTY_COLLABORATIVE_DIAGRAM_STATE
} from '../../models/collaborative-diagram.model';

@Injectable({
  providedIn: 'root'
})
export class CollaborationService implements OnDestroy {
  private ydoc: Y.Doc | null = null;
  private provider: WebsocketProvider | null = null;
  private diagramMap: Y.Map<any> | null = null;

  private isConnected = false;
  private isApplyingLocalChange = false;

  readonly diagramChanged$ = new Subject<CollaborativeDiagramState>();
  readonly connectionStatus$ = new Subject<'connected' | 'disconnected' | 'connecting'>();

  private readonly websocketUrl = environment.websocket.collaboration;

  connect(roomId: string): void {
    if (this.isConnected) return;

    this.connectionStatus$.next('connecting');

    this.ydoc = new Y.Doc();

    this.provider = new WebsocketProvider(
      this.websocketUrl,
      roomId,
      this.ydoc
    );

    this.diagramMap = this.ydoc.getMap('diagram');

    this.diagramMap.observe(() => {
      if (this.isApplyingLocalChange) return;

      this.diagramChanged$.next(this.getDiagramState());
    });

    this.provider.on(
      'status',
      (event: { status: 'connected' | 'disconnected' | 'connecting' }) => {
        this.isConnected = event.status === 'connected';
        this.connectionStatus$.next(event.status);
      }
    );
  }

  updateDiagram(state: CollaborativeDiagramState): void {
    if (!this.ydoc || !this.diagramMap) return;

    this.isApplyingLocalChange = true;

    this.ydoc.transact(() => {
      this.diagramMap!.set('lanes', state.lanes);
      this.diagramMap!.set('nodes', state.nodes);
      this.diagramMap!.set('links', state.links);
      this.diagramMap!.set('updatedAt', new Date().toISOString());
      this.diagramMap!.set('updatedBy', state.updatedBy ?? 'anonymous');
    });

    this.isApplyingLocalChange = false;
  }

  getDiagramState(): CollaborativeDiagramState {
    if (!this.diagramMap) {
      return EMPTY_COLLABORATIVE_DIAGRAM_STATE;
    }

    return {
      lanes: this.diagramMap.get('lanes') ?? [],
      nodes: this.diagramMap.get('nodes') ?? [],
      links: this.diagramMap.get('links') ?? [],
      updatedAt: this.diagramMap.get('updatedAt'),
      updatedBy: this.diagramMap.get('updatedBy')
    };
  }

  disconnect(): void {
    this.provider?.destroy();
    this.ydoc?.destroy();

    this.provider = null;
    this.ydoc = null;
    this.diagramMap = null;
    this.isConnected = false;
    this.isApplyingLocalChange = false;

    this.connectionStatus$.next('disconnected');
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}