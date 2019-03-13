export default function() {
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
