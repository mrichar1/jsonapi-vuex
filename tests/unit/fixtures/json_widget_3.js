export default function() {
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
