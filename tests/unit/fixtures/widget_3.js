export function jsonFormat() {
  return {
    id: '3',
    type: 'widget',
    attributes: {
      'foo': 3
    },
    'relationships': {
      'widgets': {
        'data': {
          'type': 'widget',
          'id': '1'
        }
      }
    }
  }
}

export function normFormat() {
  return {
    'foo': 3,
    '_jv': {
      'type': 'widget',
      'id': '3',
      'relationships': {
        'widgets': {
          'data': {
            'type': 'widget',
            'id': '1'
          }
        }
      }
    }
  }
}

export function storeFormat(normalizedFormat = normFormat()) {
  return {
    'widget':{
      '3': {
        ...normalizedFormat
      }
    }
  }
}
