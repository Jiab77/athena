import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpointUrl, apiKey, messages } = body

    if (!endpointUrl || !apiKey || !messages) {
      return NextResponse.json({ error: 'Missing required fields: endpointUrl, apiKey, messages' }, { status: 400 })
    }

    console.log('[BioLLM Proxy] Forwarding request to:', endpointUrl)

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    })

    console.log('[BioLLM Proxy] Response status:', response.status, response.ok)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }))
      console.log('[BioLLM Proxy] API error response:', errorData)
      return NextResponse.json(errorData, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.log('[BioLLM Proxy] Caught error:', error)
    return NextResponse.json({ error: { message: 'BioLLM proxy request failed' } }, { status: 500 })
  }
}
