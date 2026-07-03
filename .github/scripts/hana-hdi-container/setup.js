import { promisify } from 'node:util'
const sleep = promisify(setTimeout)

import { join as path_join } from 'node:path'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

import { fetch_token } from './token.js'

const token = await fetch_token()
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }

const url = process.env.INPUT_SERVICE_MANAGER_URL

const i_url = url + '/v1/service_instances'
const prefix = process.env.INPUT_INSTANCE_PREFIX + '_ci_'
const i_name = `${prefix}${Math.random().toString(36).substring(2, 15)}`
const servicePlanId = process.env.INPUT_HANA_PLAN_ID
const i_options = {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: i_name,
    service_plan_id: servicePlanId
  })
}
const i_res = await fetch(i_url, i_options)
const i_loc = i_res.headers.get('location')
const service_instance_id = i_loc.split('/')[3]

for (let i = 0; i < 60; i++) {
  await sleep(1000)
  const res = await fetch(url + i_loc, { method: 'GET', headers })
  const { state } = await res.json()
  if (state === 'succeeded') break
}

const b_url = url + '/v1/service_bindings'
const b_name = i_name + '_binding'
const b_options = {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: b_name,
    service_instance_id
  })
}
const b_res = await fetch(b_url, b_options)
const b_loc = b_res.headers.get('location')
const service_binding_id = b_loc.split('/')[3]

for (let i = 0; i < 60; i++) {
  await sleep(1000)
  const res = await fetch(url + b_loc, { method: 'GET', headers })
  const { state } = await res.json()
  if (state === 'succeeded') break
}

const res = await fetch(b_url + '/' + service_binding_id, { method: 'GET', headers })
const { credentials } = await res.json()

const configPath = process.env.INPUT_CONFIG_PATH || ''
const cdsrc = path_join(process.cwd(), configPath, '.cdsrc.json')
// Shallow-merge so that repo-defined profile blocks (e.g. "[metrics]",
// "[logging]", "[tracing-attributes]") and sibling top-level requires
// (messaging, telemetry, queue, ...) survive. `requires.db` is replaced —
// that is the intended override.
const existing = existsSync(cdsrc) ? JSON.parse(readFileSync(cdsrc, 'utf8')) : {}
const merged = {
  ...existing,
  requires: {
    ...(existing.requires ?? {}),
    db: { kind: 'hana', credentials }
  }
}
writeFileSync(cdsrc, JSON.stringify(merged, null, 2))
console.log(`>>> Wrote .cdsrc.json to ${cdsrc}`)

const vcap = path_join(process.cwd(), configPath, 'vcap.json')
writeFileSync(vcap, JSON.stringify({ VCAP_SERVICES: { hana: [{ tags: ['hana'], credentials }] } }, null, 2))
console.log(`>>> Wrote vcap.json to ${vcap}`)
