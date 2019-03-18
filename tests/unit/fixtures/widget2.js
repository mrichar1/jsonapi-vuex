import { normFormat as createNormWidget1 } from './widget1'
import { normFormat as createNormWidget3 } from './widget3'

export function jsonFormat() {
  return {
    id: '2',
    type: 'widget',
    attributes: {
      foo: 2,
    },
    relationships: {
      widgets: {
        data: [
          {
            type: 'widget',
            id: '1',
          },
          {
            type: 'widget',
            id: '3',
          },
        ],
      },
    },
  }
}

export function normFormat() {
  return {
    foo: 2,
    _jv: {
      type: 'widget',
      id: '2',
      relationships: {
        widgets: {
          data: [
            {
              type: 'widget',
              id: '1',
            },
            {
              type: 'widget',
              id: '3',
            },
          ],
        },
      },
    },
  }
}

export function normFormatWithRels() {
  const widget = normFormat()
  widget._jv.rels = {
    widgets: {
      1: createNormWidget1(),
      3: createNormWidget3(),
    },
  }
  return widget
}

export function storeFormat() {
  return {
    widget: {
      '2': {
        ...normFormat(),
      },
    },
  }
}
