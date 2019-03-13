export default function() {
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
