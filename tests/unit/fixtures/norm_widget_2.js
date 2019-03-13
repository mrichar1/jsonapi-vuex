export default function() {
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
