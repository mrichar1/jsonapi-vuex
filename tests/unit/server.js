import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

const makeApi = () => {
  // Mock up a fake axios-like api instance
  const api = axios.create({ baseURL: '' })
  const mockApi = new MockAdapter(api)
  return [api, mockApi]
}

export { makeApi }
