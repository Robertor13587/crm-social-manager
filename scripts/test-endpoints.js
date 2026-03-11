import fs from 'fs/promises'

const BASE_URL = 'https://workflow.robdev.website'
const OUTPUT_FILE = 'endpoint_tests_results.txt'

const tests = [
  {
    name: '1. Lista Contatti',
    method: 'GET',
    url: '/webhook/crm/whatsapp/contacts'
  },
  {
    name: '2. Lista Messaggi (filtro phone)',
    method: 'GET',
    url: '/webhook/crm/whatsapp/messages?phone=%2B393330000000'
  },
  {
    name: '3. Lista Conversazioni',
    method: 'GET',
    url: '/webhook/crm/whatsapp/conversations'
  },
  {
    name: '4. Status Numeri WhatsApp',
    method: 'GET',
    url: '/webhook/whatsapp/phone-numbers'
  },
  {
    name: '5. Crea Contatto',
    method: 'POST',
    url: '/webhook/crm/whatsapp/contact/create',
    body: {
      name: 'Test Script Contact',
      phone: '+393339998888',
      tags: 'test-script',
      note: 'Created via test script'
    }
  },
  {
    name: '6. Aggiorna Contatto',
    method: 'POST', // Assuming POST as per update in messagingConnector
    url: '/webhook/crm/whatsapp/contact/update',
    body: {
      id: 1, // Assuming ID 1 exists or mocked
      name: 'Test Script Updated',
      phone: '+393339998888'
    }
  },
  {
    name: '7. Invia Messaggio',
    method: 'POST',
    url: '/webhook/crm/whatsapp/send',
    body: {
      phone: '+393330000000',
      text: 'Test message from script'
    }
  },
  {
    name: '8. Import Google Contacts',
    method: 'POST',
    url: '/webhook/contacts/import/google',
    body: {
      sheet_id: 'TEST_ID'
    }
  }
]

async function runTests() {
  let output = `TEST REPORT - ${new Date().toISOString()}\n`
  output += `Base URL: ${BASE_URL}\n`
  output += `==================================================\n\n`

  console.log('🚀 Starting endpoint tests...')

  for (const test of tests) {
    console.log(`👉 Testing: ${test.name}...`)
    output += `TEST: ${test.name}\n`
    output += `URL: ${test.method} ${BASE_URL}${test.url}\n`
    if (test.body) {
      output += `BODY: ${JSON.stringify(test.body)}\n`
    }

    try {
      const start = Date.now()
      const res = await fetch(`${BASE_URL}${test.url}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: test.body ? JSON.stringify(test.body) : undefined
      })
      const duration = Date.now() - start
      
      const contentType = res.headers.get('content-type')
      let responseBody = ''
      if (contentType && contentType.includes('application/json')) {
        const json = await res.json()
        responseBody = JSON.stringify(json, null, 2)
      } else {
        responseBody = await res.text()
      }

      output += `STATUS: ${res.status} ${res.statusText}\n`
      output += `DURATION: ${duration}ms\n`
      output += `RESPONSE:\n${responseBody}\n`
      output += `--------------------------------------------------\n\n`
      
      console.log(`   ✅ Status: ${res.status}`)
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`)
      output += `ERROR: ${err.message}\n`
      output += `--------------------------------------------------\n\n`
    }
  }

  await fs.writeFile(OUTPUT_FILE, output)
  console.log(`\n📄 Results saved to ${OUTPUT_FILE}`)
}

runTests()
