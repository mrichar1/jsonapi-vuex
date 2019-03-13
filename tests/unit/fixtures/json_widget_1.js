export default function() {
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
