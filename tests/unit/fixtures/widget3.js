import { normFormat as createNormWidget1 } from './widget1'

export function jsonFormat() {
  return {
    id: '3',
    type: 'widget',
    attributes: {
      foo: 3,
    },
    relationships: {
      widgets: {
        data: {
          type: 'widget',
          id: '1',
        },
      },
    },
  }
}

export function normFormat() {
  return {
    foo: 3,
    _jv: {
      isData: true,
      type: 'widget',
      id: '3',
      relationships: {
        widgets: {
          data: {
            type: 'widget',
            id: '1',
          },
        },
      },
    },
  }
}

export function normFormatWithRels() {
  const widget = normFormat()
  Object.assign(widget, { widgets: createNormWidget1() })
  return widget
}

export function storeFormat() {
  return {
    widget: {
      3: {
        ...normFormat(),
      },
    },
  }
}
