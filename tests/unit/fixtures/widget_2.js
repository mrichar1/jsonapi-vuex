export function jsonFormat() {
  return {
    id: '2',
    type: 'widget',
    attributes: {
      'foo': 2
    },
    'relationships': {
      'widgets': {
        'data': [
          {
            'type': 'widget',
            'id': '1'
          },
          {
            'type': 'widget',
            'id': '3'
          }
        ]
      }
    }
  }
}

export function normFormat() {
  return {
    'foo': 2,
    '_jv': {
      'type': 'widget',
      'id': '2',
      'relationships': {
        'widgets': {
          'data': [
            {
              'type': 'widget',
              'id': '1'
            },
            {
              'type': 'widget',
              'id': '3'
            }
          ]
        }
      }
    }
  }
}

export function storeFormat(normalizedFormat = normFormat()) {
  return {
    'widget':{
      '2': {
        ...normalizedFormat
      }
    }
  }
}
