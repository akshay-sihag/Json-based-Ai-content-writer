import { GoogleGenerativeAI } from "@google/generative-ai"
import { promises as fs } from 'fs'
import path from 'path'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const BATCH_SAVE_SIZE = 200

// Ensure downloads directory exists
const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads')
const RESUME_FILE = path.join(DOWNLOADS_DIR, 'resume.json')
const INPROGRESS_FILE = path.join(DOWNLOADS_DIR, 'in_progress.json')
async function ensureDownloadsDir() {
  try {
    await fs.mkdir(DOWNLOADS_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating downloads directory:', error)
  }
}

// Save batch to file
async function saveBatch(batch: any[], batchNumber: number) {
  try {
    await ensureDownloadsDir()
    const filename = path.join(DOWNLOADS_DIR, `clinic_${batchNumber}.json`)
    await fs.writeFile(filename, JSON.stringify(batch, null, 2))
    console.log(`Batch ${batchNumber} saved: clinic_${batchNumber}.json (${batch.length} records)`)
    return filename
  } catch (error) {
    console.error(`Error saving batch ${batchNumber}:`, error)
    throw error
  }
}

// Resume utilities
async function readResume(): Promise<{ lastProcessedName?: string, lastSavedBatchNumber?: number } | null> {
  try {
    await ensureDownloadsDir()
    const data = await fs.readFile(RESUME_FILE, 'utf8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function writeResume(update: { lastProcessedName?: string, lastSavedBatchNumber?: number }) {
  try {
    await ensureDownloadsDir()
    const prev = (await readResume()) || {}
    const merged = { ...prev, ...update, updatedAt: new Date().toISOString() }
    await fs.writeFile(RESUME_FILE, JSON.stringify(merged, null, 2))
  } catch (error) {
    console.warn('Failed to write resume state:', error)
  }
}

async function resetResume() {
  try {
    await fs.unlink(RESUME_FILE)
  } catch {}
}

// Persistent accumulation helpers for splitting every BATCH_SAVE_SIZE records
async function readInProgress(): Promise<any[]> {
  try {
    await ensureDownloadsDir()
    const data = await fs.readFile(INPROGRESS_FILE, 'utf8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeInProgress(records: any[]) {
  try {
    await ensureDownloadsDir()
    await fs.writeFile(INPROGRESS_FILE, JSON.stringify(records, null, 2))
  } catch (error) {
    console.warn('Failed to write in-progress buffer:', error)
  }
}

// Generate Google Maps search text
function generateGmapSearchText(clinicData: Record<string, any>): string | undefined {
  const name = findValueByPossibleKeys(clinicData, ["name", "Name", "clinicName"]);
  const county = findValueByPossibleKeys(clinicData, ["county", "County", "location"]);
  const subCounty = findValueByPossibleKeys(clinicData, ["subCounty", "subcounty", "Sub County"]);

  if (name && county && subCounty) {
    return `${name}, ${county}, ${subCounty}`;
  }
  return undefined;
}

// Helper: normalize field values
function findValueByPossibleKeys(data: Record<string, any>, possibleKeys: string[]): string | undefined {
  for (const key of possibleKeys) {
    if (data[key] && typeof data[key] === "string" && data[key].trim() !== "") {
      return data[key]
    }
  }
  return undefined
}

// Extract contact info
function findContactInfo(data: Record<string, any>) {
  const emailKeys = ["email", "Email", "contact_email", "contactEmail"]
  const phoneKeys = ["phone", "Phone", "phoneNumber", "mobile"]
  const websiteKeys = ["website", "Website", "url", "URL"]

  return {
    email: findValueByPossibleKeys(data, emailKeys),
    phone: findValueByPossibleKeys(data, phoneKeys),
    website: findValueByPossibleKeys(data, websiteKeys),
  }
}

// Extract last location word (fallback to Kenya)
function extractLastLocationWord(location: string): string {
  if (!location || location.toLowerCase() === "n/a") return "Kenya"
  const words = location.trim().split(/[\s,\.]+/).filter(Boolean)
  const lastWord = words[words.length - 1]
  if (!lastWord || /^\d+$/.test(lastWord)) return words[words.length - 2] || "Kenya"
  return lastWord
}

// Metadata generators
function generateMetaTitle(clinicData: ClinicData): string {
  const name = findValueByPossibleKeys(clinicData, ["name", "Name", "clinicName"]) || "Clinic"
  const specialty = findValueByPossibleKeys(clinicData, ["specialty", "Specialty", "mainSpecialty"]) || "Medical Clinic"
  const locationFull = findValueByPossibleKeys(clinicData, ["location", "city", "county", "country", "address"]) || "Kenya"
  const location = extractLastLocationWord(locationFull)

  let metaTitle = `${name} - ${specialty} in ${location}`
  if (metaTitle.length > 60) metaTitle = metaTitle.substring(0, 57) + "..."
  return metaTitle
}

function generateMetaDescription(clinicData: ClinicData): string {
  const name = findValueByPossibleKeys(clinicData, ["name", "Name", "clinicName"]) || "Clinic"
  const specialty = findValueByPossibleKeys(clinicData, ["specialty", "Specialty", "mainSpecialty"]) || "healthcare"
  const location = findValueByPossibleKeys(clinicData, ["location", "city", "county", "country", "address"]) || "Kenya"

  let metaDescription = `${name} is a trusted ${specialty} in ${location}, providing quality healthcare services for the community.`
  if (metaDescription.length > 160) metaDescription = metaDescription.substring(0, 157) + "..."
  return metaDescription
}

function generateSlug(clinicData: ClinicData): string {
  const name = findValueByPossibleKeys(clinicData, ["name", "Name", "clinicName"]) || "clinic"
  const specialty = findValueByPossibleKeys(clinicData, ["specialty", "Specialty", "mainSpecialty"]) || "healthcare"
  const location = findValueByPossibleKeys(clinicData, ["location", "city", "county", "country", "address"]) || "Kenya"

  return `${name}-${specialty}-${location}`
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

interface ClinicData {
  [key: string]: string | undefined
}

// Bold <strong> enforcement
function enforceBoldCaps(text: string, clinicData: ClinicData) {
  const name = findValueByPossibleKeys(clinicData, ["name", "Name", "clinicName"])
  const specialty = findValueByPossibleKeys(clinicData, ["specialty", "Specialty", "mainSpecialty"])

  const allowedTerms = [
    name,
    specialty,
    "NHIF",
    "maternity",
    "Caesarean",
    "Obstetrics",
    "pregnancy",
    "delivery",
    "contraception",
    "menopause",
    "prenatal care",
    "family planning",
    "cervical screening",
    "Maternal and Child Health",
    "Reproductive Health",
  ].filter(Boolean)

  const boldCounts = new Map<string, number>()
  return text.replace(/<strong>(.*?)<\/strong>/gi, (match, content) => {
    const exactMatch = allowedTerms.find((term) => term === content)
    if (!exactMatch) return content
    const count = boldCounts.get(content) || 0
    if (count >= 5) return content
    boldCounts.set(content, count + 1)
    return match
  })
}

// Remove HTML shell (doctype, html/head/title/body wrappers)
function stripHtmlShell(html: string) {
  return html
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<head[\s\S]*?>[\s\S]*?<\/head>/gi, "")
    .replace(/<title[\s\S]*?>[\s\S]*?<\/title>/gi, "")
    .replace(/<html[^>]*>/gi, "")
    .replace(/<\/html>/gi, "")
    .replace(/<body[^>]*>/gi, "")
    .replace(/<\/body>/gi, "")
    .trim()
}

// Remove a leading "Introduction" label or heading
function stripLeadingIntroduction(html: string) {
  let out = html
    .replace(/^\s*<h[12]>\s*Introduction\s*<\/h[12]>\s*/i, "")
    .replace(/^\s*<p>\s*Introduction\s*:\s*<\/p>\s*/i, "")
    .replace(/^\s*Introduction\s*:?\s*/i, "")
  return out
}

// Remove disallowed openers (case-insensitive), e.g., "Within Kakamega," at the start
function stripDisallowedOpeners(html: string) {
  let out = html.replace(/^\s*Within\s+Kakamega,\s*/i, "")
  return out
}

// Normalize inline asterisk bullets to proper <ul><li>...</li></ul>
function normalizeAsteriskBullets(html: string) {
  // Encourage line breaks before asterisk bullets
  let working = html.replace(/\s\*\s+/g, "\n* ")
  const lines = working.split(/\n/)
  let inList = false
  const out: string[] = []
  for (const line of lines) {
    const m = line.match(/^\s*\*\s+(.*)$/)
    if (m) {
      if (!inList) {
        out.push("<ul>")
        inList = true
      }
      const item = m[1].trim().replace(/[\s]*\.*\s*$/, "")
      if (item) out.push(`<li>${item}</li>`)
    } else {
      if (inList) {
        out.push("</ul>")
        inList = false
      }
      out.push(line)
    }
  }
  if (inList) out.push("</ul>")
  // Collapse potential duplicate lists or empty lines
  return out.join("\n").replace(/\n{2,}/g, "\n").trim()
}

// AI Agent #1 — Structure Moderator
async function moderateContentStructure(
  rawHtml: string,
  clinicData: ClinicData,
  servicesHeader: string,
  bookingHeader: string,
  contactSection: string,
  wordCount: number
) {
  const name = findValueByPossibleKeys(clinicData, ["name", "Name", "clinicName"]) || "Clinic"
  const specialty = findValueByPossibleKeys(clinicData, ["specialty", "Specialty", "mainSpecialty"]) || "Healthcare"
  const location = findValueByPossibleKeys(clinicData, ["location", "city", "county", "country", "address"]) || "Kenya"

  const moderationPrompt = `You are AI Agent #1: Structure Moderator.
Task: Take the provided HTML content and strictly enforce the structure and formatting rules below, without adding new facts. Correct mislabeled or repeated sections and remove duplicated paragraphs or bullets. Preserve valid details. Output ONLY sanitized HTML (no backticks).

MANDATES:
- EXACT sections and order (no extras, no duplicates):
  1) Introduction (~140 words) — one paragraph. Must begin with a professional declarative sentence and may include a hyperlink to EasyClinic if present.
  2) <h2>Expertise and Facilities</h2> followed by a short paragraph and a <ul> list. Include exactly one affordability bullet for ${specialty} with the clinic software features link.
  3) ${servicesHeader} followed by a short paragraph and a <ul> list. Include exactly one bullet positioning ${name} as the answer for “clinics offering ${specialty} in ${location}.”
  4) ${bookingHeader} followed by one concise paragraph ending with ${contactSection}.

- Remove any meta commentary, labels or headings like “Rendition A/B/C”, “Version”, “Sample”, or prefaces such as “Here are three distinct HTML rewrites…”.
- Deduplicate repeated sentences or bullets; keep the clearest version.
- Remove any outer HTML shell including DOCTYPE, <html>, <head>, <title>, and <body> wrappers; return only the section HTML described above.
- Convert any inline or asterisk-style bullets (e.g., lines beginning with '*') into a proper <ul><li>…</li></ul> list beneath the appropriate section. Ensure bullets are not merged across sections.
- If a section paragraph accidentally contains asterisks inline, split them into a list right after the paragraph, keeping paragraph content intact.
- Keep total word count EXACTLY ${wordCount} words. If needed, adjust phrasing minimally without adding claims.
- Use only 3rd person; no first/second person.
- Keep hyperlink counts: once for EasyClinic, once for clinic software features.
- Respect allowed <strong> terms only. Do not introduce new bolded terms.
- Remove any code fences.

INPUT HTML:
${rawHtml}`

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
  })
  const result = await model.generateContent(moderationPrompt)
  const response = await result.response
  let moderated = response.text().replace(/```html|```/g, "").trim()
  return stripHtmlShell(moderated)
}

// AI Agent #2 — Third-Person/Tone Moderator
async function moderateThirdPersonTone(
  rawHtml: string,
  clinicData: ClinicData,
  wordCount: number
) {
  const name = findValueByPossibleKeys(clinicData, ["name", "Name", "clinicName"]) || "The clinic"
  const specialty = findValueByPossibleKeys(clinicData, ["specialty", "Specialty", "mainSpecialty"]) || "healthcare"

  const personalWords = [
    " I ", " I'm ", " I've ", " I'd ",
    " my ", " me ", " mine ",
    " we ", " we're ", " we've ", " we'd ",
    " our ", " us ", " ours ",
    " you ", " you're ", " you've ", " you'd ",
    " your ", " yours "
  ].join(", ")

  const moderationPrompt = `You are AI Agent #2: Third-Person/Tone Moderator.
Goal: Ensure the HTML is strictly written in third person and never uses first- or second-person language. The content is not owned by ${name}; it is a neutral directory-like description.

Rules:
- Replace any personal or direct-address wording (including: ${personalWords}) with neutral third-person phrasing (e.g., "the clinic", "it", "the facility").
- Remove any meta or instructional chatter such as: “Here are three distinct HTML rewrites…”, “Rendition A/B/C”, “Version”, “Sample output”, or similar labels. Keep only a single, clean rendition of the content.
- If the official clinic name contains personal-looking words (e.g., starts with "My" as in "My Wellness Medical Centre-Litein"), PRESERVE the name exactly, but remove any personal denotation in surrounding phrasing. Always frame sentences in third person, e.g., "<strong>${name}</strong> is recognized as..." or "The facility, <strong>${name}</strong>, provides...". Do NOT shorten or rewrite the official name.
- Scan both the input data and the generated HTML for personal wording. Ensure none remains outside the official clinic name string. Do not allow constructions like "my services", "our team", "visit us", or second-person directives.
- Do NOT allow the content to begin with “Within Kakamega,” (case-insensitive). If it does, rewrite the opening to a professional declarative sentence about ${name} providing ${specialty} in ${location}.
- Preserve facts, links, headings, allowed <strong> terms, and HTML structure.
- Do not add new claims or change meaning. Keep the overall word count EXACTLY ${wordCount} words, adjusting phrasing minimally.
- Output ONLY sanitized HTML (no backticks, no explanations).

INPUT HTML:
${rawHtml}`

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
  })
  const result = await model.generateContent(moderationPrompt)
  const response = await result.response
  let moderated = response.text().replace(/```html|```/g, "").trim()
  return moderated
}

// AI Agent #3 — Humanize and Diversify (SEO-safe uniqueness)
async function humanizeAndDiversify(
  rawHtml: string,
  clinicData: ClinicData,
  wordCount: number
) {
  const name = findValueByPossibleKeys(clinicData, ["name", "Name", "clinicName"]) || "The clinic"
  const specialty = findValueByPossibleKeys(clinicData, ["specialty", "Specialty", "mainSpecialty"]) || "healthcare"
  const location = findValueByPossibleKeys(clinicData, ["location", "city", "county", "country", "address"]) || "Kenya"

  // Lightweight randomness to encourage varied phrasing across records
  const stylisticHints = [
    "Vary sentence length; mix short factual lines with longer descriptive ones.",
    "Use tasteful em dashes or semicolons where appropriate to change cadence.",
    "Prefer precise nouns and verbs over adjectives; avoid hype.",
    "Use occasional parenthetical clarifiers that remain factual (e.g., within limits).",
    "Rotate connective phrases like 'notably', 'in practice', 'as applicable', 'where relevant'.",
    "Favor parallel structure in bullet points with slight lexical variety.",
    "Reorder clauses to avoid repetitive openings while staying grammatical.",
  ]
  const hint = stylisticHints[Math.floor(Math.random() * stylisticHints.length)]

  const moderationPrompt = `You are AI Agent #3: Humanize and Diversify.
Goal: Refine the HTML so it reads naturally like human-written copy while remaining neutral, factual, and third person. Ensure each rendition feels stylistically distinct to improve perceived uniqueness and SEO, without adding new facts.

Constraints:
- Preserve existing facts, section order, headings, links, and allowed <strong> usage.
- Keep word count EXACTLY ${wordCount} words.
- Maintain strict third person (no first/second person). Do not introduce claims of ownership.
- Keep the structural intent enforced previously: Intro paragraph; Expertise heading + short paragraph + bullets; Services heading + short paragraph + bullets; Booking heading + short paragraph.
- Avoid marketing exaggerations; keep directory-like tone but with natural cadence and varied phrasing.
- Do not change URLs or add new links.

Style guidance (apply subtly): ${hint}

INPUT HTML:
${rawHtml}`

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
  })
  const result = await model.generateContent(moderationPrompt)
  const response = await result.response
  let moderated = response.text().replace(/```html|```/g, "").trim()
  return moderated
}

// Process a single clinic record
async function processClinicData(selectedData: any, selectedHeaders: string[], wordCount: number) {
  const safeClinicName = findValueByPossibleKeys(selectedData, ["name", "Name", "clinicName"]) || "Clinic"
  const clinicMainSpecialty = findValueByPossibleKeys(selectedData, ["specialty", "Specialty", "mainSpecialty"]) || "Healthcare"
  const clinicSubSpecialties = findValueByPossibleKeys(selectedData, ["subSpecialties", "SubSpecialties"]) || clinicMainSpecialty
  const clinicAbout = findValueByPossibleKeys(selectedData, ["about", "About", "description", "Description"]) || "Not provided"
  const clinicLocation = findValueByPossibleKeys(selectedData, ["location", "city", "county", "country", "address"]) || "Kenya"
  const clinicContact = findContactInfo(selectedData)

  const contentContext = selectedHeaders
    .map((header: string) => {
      const value = selectedData[header]
      if (!value) return `${header}: Not provided`
      if (typeof value === "object") return `${header}: [Complex data structure]`
      return `${header}: ${value}`
    })
    .join("\n")

  let contactSection = `<p>For inquiries, please contact <strong>${safeClinicName}</strong> <a href="#contact">here</a></p>`
  if (clinicContact.email) contactSection = `<p>For inquiries, please contact <strong>${safeClinicName}</strong> at <a href="mailto:${clinicContact.email}">${clinicContact.email}</a></p>`
  else if (clinicContact.phone) contactSection = `<p>For inquiries, please contact <strong>${safeClinicName}</strong> at ${clinicContact.phone}</p>`

  const servicesHeader = `<h2>${clinicMainSpecialty} Services Offered by ${safeClinicName}</h2>`
  const bookingHeader = `<h2>Book an Appointment with ${safeClinicName}</h2>`

  const prompt = `
Consider yourself as a professional medical SEO content writer. Create an SEO-optimized article about ${safeClinicName} strictly based on the following data. Use only the provided data and context. Do not fabricate or add details beyond logical extensions of specialties.

Clinic Data

Clinic Name: ${safeClinicName}

Location: ${clinicLocation}

Main Specialty: ${clinicMainSpecialty}

Subspecialties: ${clinicSubSpecialties}

About: ${clinicAbout}
${clinicContact.email ? `- Email: ${clinicContact.email}` : ""}
${clinicContact.phone ? `- Phone: ${clinicContact.phone}` : ""}
${clinicContact.website ? `- Website: ${clinicContact.website}` : ""}

Additional Context: ${contentContext}

STRICT Requirements

Word Count: The content MUST be exactly ${wordCount} words.

Structure: Distribute words exactly (~140 intro, ~140 expertise, ~140 services, ~80 booking).

Keyword Density: Natural flow, avoid overstuffing. Target 2–3 uses of ${safeClinicName} per section, maximum 4 in the intro. Ensure ${clinicMainSpecialty} appears 4–5 times across the full article.

Writing Style Rules

All content MUST be written in 3rd person (e.g., “The clinic provides…”, “It is recognized for…”).

NEVER use “we”, “our”, “us”, “you”.

The Introduction MUST start with a professional declarative statement — not casual or narrative phrases like “In the heart of…” or “Located in…”.

Examples of approved professional openings:

“<strong>${safeClinicName}</strong> is recognized as a trusted provider of ${clinicMainSpecialty} services in ${clinicLocation}.”

“As a designated healthcare facility in ${clinicLocation}, <strong>${safeClinicName}</strong> plays a vital role in delivering ${clinicMainSpecialty}.”

“<strong>${safeClinicName}</strong> is acknowledged within ${clinicLocation} for its focus on ${clinicMainSpecialty} and commitment to reliable patient care.”

Each section must open with a factual context-setting sentence.

Tone: neutral, factual, descriptive — like a professional medical directory.

Keyword Frequency, Highlighting & Linking

Limit each key term ("${clinicMainSpecialty}", "NHIF") to 4–5 uses max.

Use <strong> ONLY for: "${safeClinicName}", "${clinicMainSpecialty}", "NHIF", "maternity", "Caesarean", "Obstetrics", "pregnancy", "delivery", "contraception", "menopause", "prenatal care", "family planning", "cervical screening", "Maternal and Child Health", "Reproductive Health".

Do NOT bold unlisted terms.

Limit <strong> usage to 4–5 times max per term.

Hyperlinking Rules:

“clinic software features” → https://www.easyclinic.io/features/

“EasyClinic” → https://www.easyclinic.io/

Each link must be used once only.

Integration of Generic Queries (with Direct 3rd Person Answers)

Intro (~140 words): Establish authority of <strong>${safeClinicName}</strong> in ${clinicLocation} as one of the best and most trusted clinics. Answer queries: “Which is the best clinic near me?” and “Where can I find a trusted clinic in ${clinicLocation}?” as factual statements. Include <a href="https://www.easyclinic.io/">EasyClinic</a>.

Expertise (~140 words): Highlight staff, facilities, and reliability in a short para + bullet list. Answer: “What clinic offers affordable treatment in ${clinicMainSpecialty}?” naturally. Include <a href="https://www.easyclinic.io/features/">clinic software features</a>.

Services (~140 words): Present available services in a short para + bullet list. Directly cover: “Clinics offering <strong>${clinicMainSpecialty}</strong> in ${clinicLocation}.”

Booking (~80 words): Provide concise summary in paragraph form. Directly cover: “Best private clinic near me” by showing why ${safeClinicName} is a top option. End with ${contactSection}.

Section Breakdown

Introduction (~140 words)

<p>Start with a professional declarative sentence (see examples above). Provide authority and trust context for ${safeClinicName} in ${clinicLocation}. Avoid casual openers like “In the heart of” or “Nestled in.” Ensure ${safeClinicName} is mentioned naturally (max 3–4 times). Answer AEO queries about best clinic near me and trusted clinic in ${clinicLocation}. Include EasyClinic link.</p>

Expertise (~140 words)

<h2>Expertise and Facilities</h2> <p>Short intro paragraph about staff expertise, facilities, and standards.</p> <ul> <li>Bullet points about staff qualifications, patient focus, facilities, and technology.</li> <li>One bullet must clearly mention affordability in ${clinicMainSpecialty} with clinic software features link.</li> </ul>

Services (~140 words)
${servicesHeader}

<p>Short intro paragraph summarizing treatment coverage and patient benefits.</p> <ul> <li>Bullet points describing treatments linked to ${clinicMainSpecialty} and ${clinicSubSpecialties}.</li> <li>One bullet must directly position ${safeClinicName} as the answer for “clinics offering ${clinicMainSpecialty} in ${clinicLocation}.”</li> </ul>

Booking (~80 words)
${bookingHeader}

<p>Professional summary in 3rd person stating why ${safeClinicName} qualifies as the “best private clinic near me.” Must remain concise, natural, and end with ${contactSection}.</p>`

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
  })

  const result = await model.generateContent(prompt)
  const response = await result.response
  let text = response.text()

  text = text.replace(/```html|```/g, "").trim()
  text = enforceBoldCaps(text, selectedData)
  text = stripHtmlShell(text)
  text = stripLeadingIntroduction(text)
  text = stripDisallowedOpeners(text)
  text = normalizeAsteriskBullets(text)

  // AI Agent #3: humanize and diversify phrasing while preserving constraints
  try {
    const humanized = await humanizeAndDiversify(
      text,
      selectedData,
      wordCount
    )
    text = enforceBoldCaps(humanized, selectedData)
    text = stripHtmlShell(text)
    text = stripLeadingIntroduction(text)
    text = stripDisallowedOpeners(text)
    text = normalizeAsteriskBullets(text)
  } catch (e) {
    console.warn("Agent#3 humanize/diversify skipped due to error:", e)
  }

  // AI Agent #2: enforce strict third-person tone (no personal or direct address wording)
  try {
    const toneModerated = await moderateThirdPersonTone(
      text,
      selectedData,
      wordCount
    )
    text = enforceBoldCaps(toneModerated, selectedData)
    text = stripHtmlShell(text)
    text = stripLeadingIntroduction(text)
    text = stripDisallowedOpeners(text)
    text = normalizeAsteriskBullets(text)
  } catch (e) {
    console.warn("Agent#2 tone moderation skipped due to error:", e)
  }

  // AI Agent #1: enforce structure similar to the reference layout and deduplicate
  try {
    const moderated = await moderateContentStructure(
      text,
      selectedData,
      servicesHeader,
      bookingHeader,
      contactSection,
      wordCount
    )
    text = enforceBoldCaps(moderated, selectedData)
    text = stripHtmlShell(text)
    text = stripLeadingIntroduction(text)
    text = stripDisallowedOpeners(text)
    text = normalizeAsteriskBullets(text)
  } catch (e) {
    // If moderation fails, continue with the original text
    console.warn("Agent#1 moderation skipped due to error:", e)
  }

  // Word count validation
  const wordCountValidation = text.split(/\s+/).length
  if (Math.abs(wordCountValidation - wordCount) > wordCount * 0.02) {
    const retryPrompt = `${prompt}\nCRITICAL: Ensure EXACTLY ${wordCount} words.`
    const retryResult = await model.generateContent(retryPrompt)
    const retryResponse = await retryResult.response
    text = retryResponse.text().replace(/```html|```/g, "").trim()
    text = enforceBoldCaps(text, selectedData)
    text = stripHtmlShell(text)
    text = stripLeadingIntroduction(text)
    text = stripDisallowedOpeners(text)
    text = normalizeAsteriskBullets(text)

    // Re-run in the new order: Agent #3 → Agent #2 → Agent #1
    try {
      const humanizedRetry = await humanizeAndDiversify(
        text,
        selectedData,
        wordCount
      )
      text = enforceBoldCaps(humanizedRetry, selectedData)
      text = stripHtmlShell(text)
      text = stripLeadingIntroduction(text)
      text = stripDisallowedOpeners(text)
      text = normalizeAsteriskBullets(text)
    } catch (e) {
      console.warn("Agent#3 humanize/diversify (retry) skipped due to error:", e)
    }

    try {
      const toneModeratedRetry = await moderateThirdPersonTone(
        text,
        selectedData,
        wordCount
      )
      text = enforceBoldCaps(toneModeratedRetry, selectedData)
      text = stripHtmlShell(text)
      text = stripLeadingIntroduction(text)
      text = stripDisallowedOpeners(text)
      text = normalizeAsteriskBullets(text)
    } catch (e) {
      console.warn("Agent#2 tone moderation (retry) skipped due to error:", e)
    }

    try {
      const moderatedRetry = await moderateContentStructure(
        text,
        selectedData,
        servicesHeader,
        bookingHeader,
        contactSection,
        wordCount
      )
      text = enforceBoldCaps(moderatedRetry, selectedData)
      text = stripHtmlShell(text)
      text = stripLeadingIntroduction(text)
      text = stripDisallowedOpeners(text)
      text = normalizeAsteriskBullets(text)
    } catch (e) {
      console.warn("Agent#1 moderation (retry) skipped due to error:", e)
    }
  }

  // Metadata
  const metaTitle = generateMetaTitle(selectedData)
  const metaDescription = generateMetaDescription(selectedData)
  const slug = generateSlug(selectedData)
  const focusKeyword = `${clinicMainSpecialty} in ${clinicLocation}`
  const gmapSearchText = generateGmapSearchText(selectedData)

  return {
    content: text,
    metaTitle,
    metaDescription,
    slug,
    focusKeyword,
    gmapSearchText,
    originalData: selectedData
  }
}

// Process a batch of clinic records
async function processBatch(batch: any[], selectedHeaders: string[], wordCount: number) {
  return Promise.all(
    batch.map(selectedData => 
      processClinicData(selectedData, selectedHeaders, wordCount)
        .catch(error => ({
          error: `Failed to process record: ${error.message}`,
          originalData: selectedData
        }))
    )
  )
}

// API route
export async function POST(req: Request) {
  try {
    const { selectedData, selectedHeaders, wordCount = 500, resume: resumeOptions, moderateOnly, existingContent } = await req.json()
    if (!selectedData || !selectedHeaders || selectedHeaders.length === 0) {
      throw new Error("Missing required data fields")
    }
    
    // Initialize batch tracking
    let currentBatch: any[] = []
    let batchNumber = 1
    const savedFiles: string[] = []
    await ensureDownloadsDir()

    // Manual moderation path for a single record/content
    if (moderateOnly && existingContent && !Array.isArray(selectedData)) {
      const processed = await processClinicData(selectedData, selectedHeaders, wordCount)
      // Replace generated content with moderated existing content by reusing the agent pipeline
      // We feed existingContent through the same post-generation sanitation/agents by adjusting at the end
      const name = findValueByPossibleKeys(selectedData, ["name", "Name", "clinicName"]) || "Clinic"
      const specialty = findValueByPossibleKeys(selectedData, ["specialty", "Specialty", "mainSpecialty"]) || "Healthcare"
      const location = findValueByPossibleKeys(selectedData, ["location", "city", "county", "country", "address"]) || "Kenya"

      // Re-run the agents directly using the same helpers
      let text = String(existingContent)
      text = text.replace(/```html|```/g, "").trim()
      text = enforceBoldCaps(text, selectedData)
      text = stripHtmlShell(text)
      text = stripLeadingIntroduction(text)
      text = stripDisallowedOpeners(text)
      text = normalizeAsteriskBullets(text)

      try {
        const humanized = await humanizeAndDiversify(text, selectedData, wordCount)
        text = enforceBoldCaps(humanized, selectedData)
        text = stripHtmlShell(text)
        text = stripLeadingIntroduction(text)
        text = stripDisallowedOpeners(text)
        text = normalizeAsteriskBullets(text)
      } catch {}

      try {
        const toned = await moderateThirdPersonTone(text, selectedData, wordCount)
        text = enforceBoldCaps(toned, selectedData)
        text = stripHtmlShell(text)
        text = stripLeadingIntroduction(text)
        text = stripDisallowedOpeners(text)
        text = normalizeAsteriskBullets(text)
      } catch {}

      const servicesHeader = `<h2>${specialty} Services Offered by ${name}</h2>`
      const bookingHeader = `<h2>Book an Appointment with ${name}</h2>`
      const contactInfo = findContactInfo(selectedData)
      let contactSection = `<p>For inquiries, please contact <strong>${name}</strong> <a href="#contact">here</a></p>`
      if (contactInfo.email) contactSection = `<p>For inquiries, please contact <strong>${name}</strong> at <a href="mailto:${contactInfo.email}">${contactInfo.email}</a></p>`
      else if (contactInfo.phone) contactSection = `<p>For inquiries, please contact <strong>${name}</strong> at ${contactInfo.phone}</p>`

      try {
        const structured = await moderateContentStructure(
          text,
          selectedData,
          servicesHeader,
          bookingHeader,
          contactSection,
          wordCount
        )
        text = enforceBoldCaps(structured, selectedData)
        text = stripHtmlShell(text)
        text = stripLeadingIntroduction(text)
        text = stripDisallowedOpeners(text)
        text = normalizeAsteriskBullets(text)
      } catch {}

      const metaTitle = generateMetaTitle(selectedData)
      const metaDescription = generateMetaDescription(selectedData)
      const slug = generateSlug(selectedData)
      const focusKeyword = `${specialty} in ${location}`
      const gmapSearchText = generateGmapSearchText(selectedData)

      return Response.json({
        content: text,
        metaTitle,
        metaDescription,
        slug,
        focusKeyword,
        gmapSearchText,
        originalData: selectedData
      })
    }

    // Convert single record to array for consistent processing
    const dataArrayFull = Array.isArray(selectedData) ? selectedData : [selectedData]
    const enableResume = resumeOptions?.enable !== false
    const shouldResetResume = resumeOptions?.reset === true
    if (shouldResetResume) {
      await resetResume()
    }
    let dataArray = dataArrayFull
    if (enableResume && Array.isArray(selectedData)) {
      const state = await readResume()
      if (state?.lastProcessedName) {
        const lastIdx = dataArrayFull.findIndex((d) => {
          const n = findValueByPossibleKeys(d, ["name", "Name", "clinicName"]) || ""
          return n === state.lastProcessedName
        })
        const startIdx = lastIdx >= 0 ? lastIdx + 1 : 0
        dataArray = dataArrayFull.slice(startIdx)
        if (state.lastSavedBatchNumber && state.lastSavedBatchNumber > 0) {
          batchNumber = state.lastSavedBatchNumber + 1
        }
      }
    }
    const BATCH_SIZE = 10
    const results = []

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
      const batch = dataArray.slice(i, i + BATCH_SIZE)
      const batchResults = await processBatch(batch, selectedHeaders, wordCount)
      results.push(...batchResults)
      
      // Add to current batch and save if needed (in-memory for this request)
      currentBatch.push(...batchResults)
      // Update resume per processed record
      if (enableResume) {
        for (const record of batch) {
          const lastName = findValueByPossibleKeys(record, ["name", "Name", "clinicName"]) || undefined
          if (lastName) await writeResume({ lastProcessedName: lastName })
        }
      }

      // Persistently accumulate across requests and split every BATCH_SAVE_SIZE
      let buffer = await readInProgress()
      buffer.push(...batchResults)
      while (buffer.length >= BATCH_SAVE_SIZE) {
        const toSave = buffer.slice(0, BATCH_SAVE_SIZE)
        const saved = await saveBatch(toSave, batchNumber)
        savedFiles.push(saved)
        if (enableResume) await writeResume({ lastSavedBatchNumber: batchNumber })
        buffer = buffer.slice(BATCH_SAVE_SIZE)
        batchNumber++
      }
      await writeInProgress(buffer)
    }
    
    // Save any remaining records in the current batch
    // Do not force-save the trailing remainder; keep it in in_progress until it reaches BATCH_SAVE_SIZE

    // If single record was passed in, return single result (backwards compatibility)
    const responseData = Array.isArray(selectedData) ? { results, savedFiles } : results[0]
    return Response.json(responseData)

    const safeClinicName = findValueByPossibleKeys(selectedData, ["name", "Name", "clinicName"]) || "Clinic"
    const clinicMainSpecialty = findValueByPossibleKeys(selectedData, ["specialty", "Specialty", "mainSpecialty"]) || "Healthcare"
    const clinicSubSpecialties = findValueByPossibleKeys(selectedData, ["subSpecialties", "SubSpecialties"]) || clinicMainSpecialty
    const clinicAbout = findValueByPossibleKeys(selectedData, ["about", "About", "description", "Description"]) || "Not provided"
    const clinicLocation = findValueByPossibleKeys(selectedData, ["location", "city", "county", "country", "address"]) || "Kenya"
    const clinicContact = findContactInfo(selectedData)

    const contentContext = selectedHeaders
      .map((header: string) => {
        const value = selectedData[header]
        if (!value) return `${header}: Not provided`
        if (typeof value === "object") return `${header}: [Complex data structure]`
        return `${header}: ${value}`
      })
      .join("\n")

    let contactSection = `<p>For inquiries, please contact <strong>${safeClinicName}</strong> <a href="#contact">here</a></p>`
    if (clinicContact.email) contactSection = `<p>For inquiries, please contact <strong>${safeClinicName}</strong> at <a href="mailto:${clinicContact.email}">${clinicContact.email}</a></p>`
    else if (clinicContact.phone) contactSection = `<p>For inquiries, please contact <strong>${safeClinicName}</strong> at ${clinicContact.phone}</p>`

    const servicesHeader = `<h2>${clinicMainSpecialty} Services Offered by ${safeClinicName}</h2>`
    const bookingHeader = `<h2>Book an Appointment with ${safeClinicName}</h2>`

    // === FINAL PROMPT (REVISED) ===
    const prompt = `
Consider yourself as a professional medical SEO content writer. Create an SEO-optimized article about ${safeClinicName} strictly based on the following data. Use only the provided data and context. Do not fabricate or add details beyond logical extensions of specialties.

Clinic Data
Clinic Name: ${safeClinicName}
Location: ${clinicLocation}
Main Specialty: ${clinicMainSpecialty}
Subspecialties: ${clinicSubSpecialties}
About: ${clinicAbout}
${clinicContact.email ? `- Email: ${clinicContact.email}` : ""}
${clinicContact.phone ? `- Phone: ${clinicContact.phone}` : ""}
${clinicContact.website ? `- Website: ${clinicContact.website}` : ""}

Additional Context: ${contentContext}

STRICT Requirements
Word Count: The content MUST be exactly ${wordCount} words.
Structure: Distribute words exactly (~140 intro, ~140 expertise, ~140 services, ~80 booking).

Writing Style Rules
All content MUST be written in 3rd person (e.g., “The clinic provides…”, “It is recognized for…”).
NEVER use “we”, “our”, “us”, “you”.
The article must directly answer queries in 3rd person.
Each section must open with a unique contextual statement instead of repeating the search query.
Tone: neutral, factual, descriptive — like an independent medical reference.

Keyword Frequency, Highlighting & Linking
Limit each key term ("${clinicMainSpecialty}", "NHIF") to 4–5 uses max.
Use <strong> ONLY for: "${safeClinicName}", "${clinicMainSpecialty}", "NHIF", "maternity", "Caesarean", "Obstetrics", "pregnancy", "delivery", "contraception", "menopause", "prenatal care", "family planning", "cervical screening", "Maternal and Child Health", "Reproductive Health".
Do NOT bold unlisted terms.
Limit <strong> usage to 4–5 times per term.

Hyperlinking Rules:
“clinic software features” → https://www.easyclinic.io/features/
“EasyClinic” → https://www.easyclinic.io/
Each link must be used once only.

Integration of Generic Queries (with Direct 3rd Person Answers)
Intro (~140 words): Establish authority and trust, showing why <strong>${safeClinicName}</strong> is considered among the best in ${clinicLocation}. Directly cover “Which is the best clinic near me?” and “Where can I find a trusted clinic in ${clinicLocation}?” as facts. Include hyperlink to EasyClinic.

Expertise (~140 words): Explain staff expertise, facilities, and reliability. Directly cover: “What clinic offers affordable treatment in ${clinicMainSpecialty}?” as a fact. Include hyperlink to clinic software features.

Services (~140 words): Describe treatments linked to specialties. Directly cover: “Clinics offering <strong>${clinicMainSpecialty}</strong> in ${clinicLocation}”.

Booking (~80 words): Summarize convenience and access. Directly cover: “Best private clinic near me”. End with ${contactSection}.

Section Breakdown
Introduction (~140 words)
<p>Open with a strong contextual statement about ${safeClinicName} in ${clinicLocation}, establishing why it is trusted and considered among the best. Include EasyClinic link.</p>

Expertise (~140 words)
<h2>Expertise and Facilities</h2><ul><li>Bullet points on staff, facilities, technology</li><li>One bullet must state affordability in ${clinicMainSpecialty}</li></ul>

Services (~140 words)
${servicesHeader}<ul><li>Bullet points describing treatments</li><li>One bullet must position ${safeClinicName} as the answer for clinics offering ${clinicMainSpecialty} in ${clinicLocation}</li></ul>

Booking (~80 words)
${bookingHeader}<p>Concise summary of why ${safeClinicName} qualifies as the best private clinic near me. End with ${contactSection}.</p>`

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text()

    text = text.replace(/```html|```/g, "").trim()
    text = enforceBoldCaps(text, selectedData)

    // Word count validation
    const wordCountValidation = text.split(/\s+/).length
    if (Math.abs(wordCountValidation - wordCount) > wordCount * 0.1) {
      const retryPrompt = `${prompt}\nCRITICAL: Ensure EXACTLY ${wordCount} words.`
      const retryResult = await model.generateContent(retryPrompt)
      const retryResponse = await retryResult.response
      text = retryResponse.text().replace(/```html|```/g, "").trim()
      text = enforceBoldCaps(text, selectedData)
    }

    // Metadata
    const metaTitle = generateMetaTitle(selectedData)
    const metaDescription = generateMetaDescription(selectedData)
    const slug = generateSlug(selectedData)
    const focusKeyword = `${clinicMainSpecialty} in ${clinicLocation}`
    const gmapSearchText = generateGmapSearchText(selectedData)

    return Response.json({ 
      content: text, 
      metaTitle, 
      metaDescription, 
      slug, 
      focusKeyword, 
      gmapSearchText 
    })
  } catch (error: unknown) {
    console.error("Detailed error:", error)
    return Response.json({ error: "Failed to generate content", details: String(error) }, { status: 500 })
  }
}
