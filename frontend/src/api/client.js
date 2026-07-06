import axios from 'axios'

const API_BASE = 'http://localhost:8000/api'

const client = axios.create({ baseURL: API_BASE })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || ''
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/signup')

    // A 401 from login/signup just means wrong credentials or a duplicate email,
    // that is a normal form error, not an expired session, so it should NOT
    // force a redirect. Redirecting here was wiping the error message instantly
    // by reloading the page before the user could ever read it.
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client
