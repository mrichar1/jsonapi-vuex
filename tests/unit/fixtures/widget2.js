import { normFormat as createNormWidget1 } from './widget1.js'
import { normFormat as createNormWidget3 } from './widget3.js'

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
      isData: true,
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
  Object.assign(widget, {
    widgets: {
      1: createNormWidget1(),
      3: createNormWidget3(),
    },
  })
  return widget
}

export function storeFormat() {
  return {
    widget: {
      2: {
        ...normFormat(),
      },
    },
  }
}
