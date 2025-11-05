import { URLSearchParams } from 'url'

const fetch_token = async () => {
  const url = process.env.INPUT_SERVICE_MANAGER_AUTH_URL

  const encodedParams = new URLSearchParams()
  encodedParams.set('grant_type', 'client_credentials')
  encodedParams.set('client_id', process.env.INPUT_SERVICE_MANAGER_CLIENT_ID)
  encodedParams.set('client_secret', process.env.INPUT_SERVICE_MANAGER_CLIENT_SECRET)

  const options = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: encodedParams
  }

  const response = await fetch(url, options)
  const { access_token } = await response.json()
  return access_token
}

export { fetch_token }
