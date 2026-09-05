import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured in .env.local' },
        { status: 500 }
      )
    }

    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 field is required' }, { status: 400 })
    }

    // Strip header prefix if present (e.g., data:image/png;base64,)
    const base64Data = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64

    // Detect mime type
    let mimeType = 'image/jpeg'
    if (imageBase64.startsWith('data:image/png')) mimeType = 'image/png'
    if (imageBase64.startsWith('data:image/webp')) mimeType = 'image/webp'

    const ai = new GoogleGenAI({ apiKey })

    const prompt = `Analyze this receipt image and extract structured expense details.
Return raw JSON ONLY matching this exact structure:
{
  "vendor_name": "Vendor or seller name string",
  "amount": 1250,
  "date": "YYYY-MM-DD",
  "category": "labor|material|equipment|transport|fuel|admin|tendering|other",
  "description": "Short description of items bought",
  "gst_number": "GST number if present or null"
}

If any value cannot be determined, provide a reasonable estimate or null.
Return valid JSON only. Do not format with markdown codeblocks or backticks.`

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [prompt, imagePart],
      config: {
        responseMimeType: 'application/json',
      },
    })

    const responseText = response.text?.trim() ?? ''

    // Clean JSON response (strip markdown wrappers if model added them)
    const cleanJsonStr = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    const extracted = JSON.parse(cleanJsonStr)

    return NextResponse.json({ success: true, data: extracted })
  } catch (err: any) {
    console.error('Receipt Scan Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to analyze receipt image' },
      { status: 500 }
    )
  }
}
