import { normFormat as createNormWidget2 } from './widget2.js'

export function jsonFormat() {
  return {
    id: '1',
    type: 'widget',
    attributes: {
      foo: 1,
      bar: 'baz',
    },
    links: {
      self: '/weirdPath/1',
    },
    relationships: {
      widgets: {
        data: {
          type: 'widget',
          id: '2',
        },
        links: {
          related: '/widget/1/widgets',
        },
      },
    },
  }
}

export function jsonFormatPatch() {
  return {
    id: '1',
    type: 'widget',
    attributes: {
      foo: 'update',
      bar: 'baz',
    },
    links: {
      self: '/weirdPath/1',
    },
    relationships: {
      widgets: {
        data: {
          type: 'widget',
          id: '2',
        },
        links: {
          related: '/widget/1/widgets',
        },
      },
    },
  }
}

export function normFormat() {
  return {
    foo: 1,
    bar: 'baz',
    _jv: {
      isData: true,
      type: 'widget',
      id: '1',
      links: {
        self: '/weirdPath/1',
      },
      relationships: {
        widgets: {
          data: {
            type: 'widget',
            id: '2',
          },
          links: {
            related: '/widget/1/widgets',
          },
        },
      },
    },
  }
}

export function normFormatWithRels() {
  const widget = normFormat()
  Object.assign(widget, { widgets: createNormWidget2() })
  return widget
}

export function normFormatPatch() {
  return {
    foo: 'update',
    _jv: {
      isData: true,
      type: 'widget',
      id: '1',
    },
  }
}

export function normFormatUpdate() {
  return {
    foo: 'update',
    bar: 'baz',
    _jv: {
      isData: true,
      type: 'widget',
      id: '1',
      links: {
        self: '/weirdPath/1',
      },
      relationships: {
        widgets: {
          data: {
            type: 'widget',
            id: '2',
          },
          links: {
            related: '/widget/1/widgets',
          },
        },
      },
    },
  }
}

export function storeFormat() {
  return {
    widget: {
      1: {
        ...normFormat(),
      },
    },
  }
}
