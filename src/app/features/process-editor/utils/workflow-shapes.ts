import * as joint from '@joint/core';

const shapes = joint.shapes as any;

shapes.custom = shapes.custom || {};

shapes.custom.ActivityFinal = joint.dia.Element.define(
  'custom.ActivityFinal',
  {
    size: {
      width: 40,
      height: 40
    },
    attrs: {
      body: {
        cx: 20,
        cy: 20,
        r: 18,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2
      },
      inner: {
        cx: 20,
        cy: 20,
        r: 10,
        fill: '#000000',
        stroke: 'none'
      }
    }
  },
  {
    markup: [
      { tagName: 'circle', selector: 'body' },
      { tagName: 'circle', selector: 'inner' }
    ]
  }
);

shapes.custom.FlowFinal = joint.dia.Element.define(
  'custom.FlowFinal',
  {
    size: {
      width: 30,
      height: 30
    },
    attrs: {
      body: {
        cx: 15,
        cy: 15,
        r: 13,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2
      },
      cross: {
        d: 'M 10 10 L 20 20 M 20 10 L 10 20',
        stroke: '#000000',
        strokeWidth: 2,
        strokeLinecap: 'round'
      }
    }
  },
  {
    markup: [
      { tagName: 'circle', selector: 'body' },
      { tagName: 'path', selector: 'cross' }
    ]
  }
);