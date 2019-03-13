export function jsonFormat() {
  return {
    id: '1',
    type: 'widget',
    attributes: {
      'foo': 1,
      'bar': 'baz'
    },
    relationships: {
      'widgets': {
        'data': {
          'type': 'widget',
          'id': '2'
        },
        'links': {
          'related': '/widget/1/widgets'
        }
      }
    }
  }
}

export function jsonFormatPatch() {
  return {
    id: '1',
    type: 'widget',
    attributes: {
      'foo': 'update',
      'bar': 'baz'
    },
    relationships: {
      'widgets': {
        'data': {
          'type': 'widget',
          'id': '2'
        },
        'links': {
          'related': '/widget/1/widgets'
        }
      }
    }
  }
}

export function normFormat() {
  return {
    'foo': 1,
    'bar': 'baz',
    '_jv': {
      'type': 'widget',
      'id': '1',
      'relationships': {
        'widgets': {
          'data': {
            'type': 'widget',
            'id': '2'
          },
          'links': {
            'related': '/widget/1/widgets'
          }
        }
      }
    }
  }
}

export function normFormatPatch() {
  return {
    'foo': 'update',
    '_jv': {
      'type': 'widget',
      'id': '1'
    }
  }
}

export function normFormatUpdate() {
  return {
    'foo': 'update',
    'bar': 'baz',
    '_jv': {
      'type': 'widget',
      'id': '1',
      'relationships': {
        'widgets': {
          'data': {
            'type': 'widget',
            'id': '2'
          },
          'links': {
            'related': '/widget/1/widgets'
          }
        }
      }
    }
  }
}

export function storeFormat(normalizedFormat = normFormat()) {
  return {
    'widget':{
      '1': {
        ...normalizedFormat
      }
    }
  }
}
