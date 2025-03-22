import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const internalUrls = [
  "https://www.easyclinic.io/",
  "https://www.easyclinic.io/kenya/",
  "https://www.easyclinic.io/testimonials/",
  "https://www.easyclinic.io/malaysia/",
  "https://www.easyclinic.io/ent/",
  "https://www.easyclinic.io/cardiology/",
  "https://www.easyclinic.io/emr-landing-page/",
  "https://www.easyclinic.io/psychology/",
  "https://www.easyclinic.io/mental-health/",
  "https://www.easyclinic.io/family-physician/",
  "https://www.easyclinic.io/trichology/",
  "https://www.easyclinic.io/cosmetology/",
  "https://www.easyclinic.io/orthopedic/",
  "https://www.easyclinic.io/rheumatology/",
  "https://www.easyclinic.io/diabetology/",
  "https://www.easyclinic.io/aesthetic/",
  "https://www.easyclinic.io/general-surgery/",
  "https://www.easyclinic.io/dermatology/",
  "https://www.easyclinic.io/endocrinology/",
  "https://www.easyclinic.io/pulmonology/",
  "https://www.easyclinic.io/ophthalmology/",
  "https://www.easyclinic.io/psychiatry/",
  "https://www.easyclinic.io/general-practitioner/",
  "https://www.easyclinic.io/hematology/",
  "https://www.easyclinic.io/obs-gynae/",
  "https://www.easyclinic.io/nephrology/",
  "https://www.easyclinic.io/gastroenterology/",
  "https://www.easyclinic.io/paediatric/",
  "https://www.easyclinic.io/neurology/",
  "https://www.easyclinic.io/urology/",
  "https://www.easyclinic.io/ivf/",
  "https://www.easyclinic.io/immunology/",
  "https://www.easyclinic.io/oncology/",
  "https://www.easyclinic.io/sexology/",
  "https://www.easyclinic.io/allergy/",
  "https://www.easyclinic.io/physiotherapy/",
  "https://www.easyclinic.io/pathology/",
  "https://www.easyclinic.io/radiology/",
  "https://www.easyclinic.io/dental/",
  "https://www.easyclinic.io/ayurveda/",
  "https://www.easyclinic.io/alternative-medicine/",
  "https://www.easyclinic.io/revolutionizing-emr-documentation-how-easy-clinics-ai-powered-transcription-improves-healthcare-efficiency/",
  "https://www.easyclinic.io/how-ai-contributes-to-minimizing-medical-billing-errors/",
  "https://www.easyclinic.io/ai-for-dental-clinic-management-revolutionizing-patient-care-with-easy-clinic/",
  "https://www.easyclinic.io/ai-for-diabetologists-the-future-of-diabetes-care-with-advanced-technology/",
  "https://www.easyclinic.io/how-ai-powered-emr-software-is-transforming-clinic-management/",
  "https://www.easyclinic.io/how-ai-for-doctors-is-transforming-clinical-practice/",
  "https://www.easyclinic.io/ai-enabled-telemedicine-solutions-the-future-of-digital-healthcare/",
  "https://www.easyclinic.io/ai-in-health-data-analytics-smarter-insights-for-clinics/",
  "https://www.easyclinic.io/easy-clinic-patient-engagement-with-ai-smart-healthcare-solutions/",
  "https://www.easyclinic.io/ai-powered-medical-billing-software-transforming-healthcare-finance/",
  "https://www.easyclinic.io/why-legacy-systems-need-an-upgrade-the-hidden-costs-of-staying-behind/",
  "https://www.easyclinic.io/how-to-kickstart-your-doctorpreneur-journey-finding-the-ultimate-clinic-management-solution/",
  "https://www.easyclinic.io/tips-to-help-you-deliver-professional-care-online/",
  "https://www.easyclinic.io/how-to-make-your-waiting-room-more-patient-friendly/",
  "https://www.easyclinic.io/why-clinic-management-solution-is-must-for-clinics/",
  "https://www.easyclinic.io/top-strategies-to-boost-patient-acquisition-in-2024/",
  "https://www.easyclinic.io/streamlining-clinic-administration-the-key-to-increased-revenue/",
  "https://www.easyclinic.io/questions-to-ask-your-clinic-emr-software-provider/",
  "https://www.easyclinic.io/navigating-legacy-system-ehr-data-migration/",
  "https://www.easyclinic.io/how-ai-can-enhance-patient-engagement-across-the-clinic-journey/",
  "https://www.easyclinic.io/features-that-your-telemedicine-software-should-have/",
  "https://www.easyclinic.io/faqs-on-emr-medical-software/",
  "https://www.easyclinic.io/check-these-useful-insights-on-running-a-clinic-efficiently/",
  "https://www.easyclinic.io/bridging-the-gap-how-tech-is-transforming-indian-healthcare/",
]

function generateMetaTitle(doctorData: DoctorData): string {
  const name = doctorData.name || doctorData.Name || doctorData.DOCTOR_NAME || ""
  const specialty =
    doctorData.mainSpecialty || doctorData.specialty || doctorData.Specialty || doctorData.SPECIALTY || ""
  let location = doctorData.location || ""

  // Replace N/A with Kenya
  if (!location || location.toLowerCase() === "n/a") {
    location = "Kenya"
  }

  // Combine and limit to 60 characters
  let metaTitle = `${name} - ${specialty} in ${location}`
  if (metaTitle.length > 60) {
    metaTitle = metaTitle.substring(0, 57) + "..."
  }

  return metaTitle
}

function generateMetaDescription(doctorData: DoctorData): string {
  const name = doctorData.name || doctorData.Name || doctorData.DOCTOR_NAME || ""
  const specialty =
    doctorData.mainSpecialty || doctorData.specialty || doctorData.Specialty || doctorData.SPECIALTY || ""
  const qualifications = doctorData.qualifications || ""
  let location = doctorData.location || ""

  // Replace N/A with Kenya
  if (!location || location.toLowerCase() === "n/a") {
    location = "Kenya"
  }

  // Create a meta description using the template
  let metaDescription = `${name} is a `

  // Add a qualifying adjective (randomly selected)
  const adjectives = [
    "highly qualified",
    "experienced",
    "dedicated",
    "skilled",
    "specialized",
    "professional",
    "expert",
  ]
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  metaDescription += `${randomAdjective} ${specialty} in ${location}`

  // Add qualifications if they exist and aren't "N/A"
  if (qualifications && !qualifications.toLowerCase().includes("n/a")) {
    metaDescription += ` with qualifications in ${qualifications.split(",")[0]}`
  }

  // Add a closing phrase (randomly selected)
  const closingPhrases = [
    "dedicated to providing comprehensive medical care.",
    "offering specialized healthcare services.",
    "committed to patient-centered treatment.",
    "providing expert medical services.",
    "focused on delivering quality healthcare.",
  ]
  const randomClosing = closingPhrases[Math.floor(Math.random() * closingPhrases.length)]
  metaDescription += ` ${randomClosing}`

  // Ensure it doesn't exceed 160 characters (maximum limit, not target)
  if (metaDescription.length > 160) {
    metaDescription = metaDescription.substring(0, 157) + "..."
  }

  return metaDescription
}

function generateSlug(doctorData: DoctorData): string {
  const name = doctorData.name || doctorData.Name || doctorData.DOCTOR_NAME || ""
  const specialty =
    doctorData.mainSpecialty || doctorData.specialty || doctorData.Specialty || doctorData.SPECIALTY || ""
  let location = doctorData.location || ""

  // Replace N/A with Kenya
  if (!location || location.toLowerCase() === "n/a") {
    location = "Kenya"
  }

  // Combine, lowercase, and add dashes
  const slug = `${name}-${specialty}-${location}`
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Replace multiple dashes with single dash

  return slug
}

function generateFocusKeyword(doctorData: DoctorData): string {
  const specialty =
    doctorData.mainSpecialty || doctorData.specialty || doctorData.Specialty || doctorData.SPECIALTY || ""
  let location = doctorData.location || ""

  // Replace N/A with Kenya
  if (!location || location.toLowerCase() === "n/a") {
    location = "Kenya"
  }

  // Create focus keyword
  return `${specialty} in ${location}`
}

function extractKeywords(urls: string[]): { keyword: string; url: string }[] {
  const baseUrl = "https://www.easyclinic.io/"
  return urls
    .map((url) => {
      if (!url.startsWith(baseUrl)) {
        return { keyword: "", url: "" }
      }
      const path = url.substring(baseUrl.length).replace(/\/$/, "")
      if (!path) {
        return { keyword: "", url: "" }
      }
      const segments = path.split("-")
      const keywordMappings: Record<string, string[]> = {
        emr: ["emr", "electronic medical records", "medical records"],
        ai: ["ai", "artificial intelligence", "ai powered"],
        clinic: ["clinic", "clinical", "medical clinic"],
        patient: ["patient", "patient care", "patient engagement"],
        healthcare: ["healthcare", "health care", "medical care"],
        telemedicine: ["telemedicine", "telehealth", "virtual care"],
        medical: ["medical", "medicine", "healthcare"],
        billing: ["billing", "medical billing", "healthcare billing"],
        management: ["management", "administration", "practice management"],
      }
      const specialties = [
        "cardiology",
        "neurology",
        "pediatrics",
        "orthopedic",
        "dermatology",
        "ophthalmology",
        "psychiatry",
        "psychology",
        "dental",
        "oncology",
        "gynecology",
        "urology",
        "endocrinology",
        "gastroenterology",
        "pulmonology",
        "rheumatology",
        "nephrology",
        "hematology",
      ]
      const specialty = segments.find((segment) => specialties.includes(segment.toLowerCase()))
      if (specialty) {
        return { keyword: specialty, url }
      }
      const foundKeywords: string[] = []
      segments.forEach((segment) => {
        Object.entries(keywordMappings).forEach(([key, variations]) => {
          if (variations.some((v) => segment.toLowerCase().includes(v))) {
            foundKeywords.push(key)
          }
        })
      })
      const combinedKeywords = foundKeywords.reduce((acc: string[], curr: string) => {
        const last = acc[acc.length - 1]
        const combination = last ? `${last} ${curr}` : curr
        const validCombinations = [
          "ai powered",
          "medical billing",
          "patient care",
          "healthcare management",
          "clinic management",
          "patient engagement",
          "medical records",
        ]
        if (validCombinations.includes(combination)) {
          acc[acc.length - 1] = combination
        } else {
          acc.push(curr)
        }
        return acc
      }, [])
      const keyword = combinedKeywords[0] || path.replace(/-/g, " ")
      return { keyword, url }
    })
    .filter((item) => item.keyword !== "" && item.keyword.length > 2)
}

function linkKeywords(text: string, keywords: Array<{ keyword: string; url: string }>) {
  const linkedKeywords = new Set()
  const sortedKeywords = [...keywords].sort((a, b) => b.keyword.length - a.keyword.length)
  sortedKeywords.forEach(({ keyword, url }) => {
    const lowerKeyword = keyword.toLowerCase()
    if (linkedKeywords.has(lowerKeyword)) return
    const regex = new RegExp(`(?<!<[^>]*)(\\b${keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b)(?![^<]*>)`, "i")
    let replaced = false
    text = text.replace(regex, (match) => {
      if (replaced) return match
      replaced = true
      linkedKeywords.add(lowerKeyword)
      return `<a href="${url}">${match}</a>`
    })
  })
  return text
}

interface DoctorData {
  name: string
  Name?: string
  DOCTOR_NAME?: string
  specialty?: string
  Specialty?: string
  SPECIALTY?: string
  mainSpecialty: string
  subSpecialties: string
  qualifications: string
  location?: string
  about?: string
  [key: string]: string | undefined
}

function enforceBoldCaps(text: string, selectedData: DoctorData) {
  // Fix: Add null check for selectedData.about before calling match()
  const aboutMatches = selectedData.about
    ? selectedData.about.match(/MB.,ChB.,$$\d{4}$$|MMed$$O\/G$$.,$$\d{4}$$/g) || []
    : []

  const allowedTerms = [
    selectedData.name,
    selectedData.mainSpecialty,
    selectedData.qualifications,
    ...aboutMatches,
    "Maternal and Child Health",
    "Reproductive Health",
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
  ].filter(Boolean)

  const boldCounts = new Map<string, number>()
  return text.replace(/<strong>(.*?)<\/strong>/gi, (match, content) => {
    const exactMatch = allowedTerms.find((term) => term === content)
    if (!exactMatch) return content // Strip if not an exact match
    const count = boldCounts.get(content) || 0
    if (count >= 5) return content // Strip if over 5
    boldCounts.set(content, count + 1)
    return match
  })
}

export async function POST(req: Request) {
  try {
    const { selectedData, selectedHeaders, tone, wordCount } = await req.json()
    if (!selectedData || !selectedHeaders || selectedHeaders.length === 0) {
      throw new Error("Missing required data fields")
    }

    const doctorName = selectedData.name || selectedData.Name || selectedData.DOCTOR_NAME || "the doctor"
    const mainSpecialty = selectedData.specialty || selectedData.Specialty || selectedData.SPECIALTY || "Medical"

    // Add null check for selectedData fields
    const about = selectedData.about || "Not provided"
    const qualifications = selectedData.qualifications || "Not provided"
    const subSpecialties = selectedData.subSpecialties || "Not provided"
    const location = selectedData.location || "Not specified"

    const contentContext = selectedHeaders
      .map((header: string) => {
        // Add null check for selectedData[header]
        return `${header}: ${selectedData[header] || "Not provided"}`
      })
      .join("\n")

    const prompt = `
You are a professional medical content writer. Create SEO-optimized content about ${doctorName} based STRICTLY on the following data. Do not fabricate details beyond logical extensions of specialties explicitly tied to the data. Use only the provided data and context below.

Doctor Data:
- Name: ${selectedData.name}
- Qualifications: ${qualifications}
- Main Specialty: ${selectedData.mainSpecialty}
- Subspecialties: ${subSpecialties}
- Location: ${location}
- About: ${about}

Additional Context:
${contentContext}

STRICT Requirements:
1. Word Count: The content MUST be exactly ${wordCount} words.
2. Structure: Distribute words exactly (~140 intro, ~140 qualifications, ~140 services, ~80 booking).

KEYWORD FREQUENCY AND HIGHLIGHTING:
1. Keyword Usage:
 - Limit each key term (e.g., "${selectedData.mainSpecialty}", "NHIF") to 4-5 uses max in the text, strictly enforced.
 - Spread naturally; no stuffing.
2. Highlighting:
 - Use <strong> ONLY for these exact terms: "${selectedData.name}", "${selectedData.mainSpecialty}", "${qualifications}", "MB.,ChB.,(1985)", "MMed(O/G).,(1992)", "Maternal and Child Health", "Reproductive Health", "NHIF", "maternity", "Caesarean", "Obstetrics", "pregnancy", "delivery", "contraception", "menopause", "prenatal care", "family planning", "cervical screening".
 - Bold each listed term at least once where appropriate in the content.
 - Absolutely no bolding of unlisted terms, including "Gynaecology", "health", "care", "services", or any other generics not specified above.
 - Limit <strong> application to 4-5 times max per term across all sections (e.g., bold "${selectedData.name}" exactly 5 times, no more).

Introduction:
- Start with: <p>
- Write an engaging, ~140-word summary of <strong>${selectedData.name}</strong>.
- Use only data: qualifications, specialty, subspecialties (Don't include this if specialty is same as subspecialties and don't repeat speciality keywords twice or thrice) , location (use location as "Kenya" if "Not specified" or N/A), "About".
- Focus on expertise and unique benefits (e.g., NHIF-covered maternity care).
- Keep natural and conversational.
- End with: </p>

Qualifications and Expertise:
- Start with: <h2>Qualifications and Expertise</h2>
- IMPORTANT: You MUST use HTML bullet list format with <ul> and <li> tags for 8-10 concise bullet pints (~140 words total).:
<ul>
  <li>First qualification point</li>
  <li>Second qualification point</li>
  ...and so on
</ul>
- Base on "${qualifications}" and specialties/"About" (don't repeat same speciality keywords twice or thrice).
- Highlight per rules; no invented details; use "degree" singular for MB.,ChB.

Services Section:
- Start with: <h2>${selectedData.mainSpecialty} Services Offered by ${selectedData.name}</h2>
- IMPORTANT: You MUST use HTML bullet list format with <ul> and <li> tags for 8-10 concise bullets (~140 words total).:
<ul>
  <li>First service point</li>
  <li>Second service point</li>
  ...and so on
</ul>
- Derive from "${selectedData.mainSpecialty}", "${subSpecialties} (Don't include this if specialty is same as subspecialties and don't repeat speciality keywords twice or thrice)", "About".
- Allow logical extensions (e.g., "Reproductive Health" includes contraception) tied to data.
- Highlight per rules.

Booking Information:
- Start with: <h2>Book an Appointment with ${selectedData.name}</h2>
- Write 2 concise, engaging sentences in a single <p> tag (~60 words with contact line).
- Highlight <strong>${selectedData.mainSpecialty}</strong> expertise and benefits; no extra details.
- Use natural tone; no repetition.
- End with: <p>For inquiries, please contact <strong>${selectedData.name}</strong> <a href="#contact">here</a></p>

Style Guidelines:
- Use a ${tone} tone.
- Write clear, concise sentences; correct grammar (e.g., "Caesarean", "non-gynaecological").
- Standardize spelling as "Gynecologist" and "Obstetrics" throughout (e.g., use "Gynecologist" not "Gynaecologist").
- Optimize for SEO with key phrases (e.g., "NHIF maternity care", "prenatal care").

Format Requirements:
- Use ONLY <h2>, <p>, <strong>, <ul> & <li> tags (no <h1> or other tags allowed).
- Do not use <h1> tags under any circumstances.
- For bullet points, you MUST use <ul> and <li> tags (no extra 
).
- Add 
 between sections.
- Return HTML content only.

Strict Instructions:
- Stick to data; logical extensions only for services.
- If location is "Not specified," use "his practice".
- Exactly ${wordCount} words.
- ALWAYS use proper HTML lists with <ul> and <li> tags where mentioned specifically.
`

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    })

    const result = await model.generateContent(prompt)
    const response = await result.response
    let text = response.text()

    text = text
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .replace(/^\s*{\s*"content":\s*"/, "")
      .replace(/"\s*}\s*$/, "")
      .trim()

    const keywords = extractKeywords(internalUrls)
    text = linkKeywords(text, keywords)
    text = enforceBoldCaps(text, selectedData)

    const wordCountValidation = text.split(/\s+/).length
    if (Math.abs(wordCountValidation - wordCount) > wordCount * 0.1) {
      const retryPrompt = `
      ${prompt}

      CRITICAL: The previous attempt did not meet the exact word count requirement.
      Current word count: ${wordCountValidation}
      Required word count: ${wordCount}
      
      Please regenerate the content with EXACTLY ${wordCount} words.
      Maintain the same structure, formatting, and highlighting rules.
      Ensure <strong> is applied ONLY to listed keywords and capped at 4-5 times per term.
      REMEMBER: You MUST use <ul> and <li> tags for lists, NOT paragraphs <p> tags.
    `
      const retryResult = await model.generateContent(retryPrompt)
      const retryResponse = await retryResult.response
      text = retryResponse
        .text()
        .replace(/```html/g, "")
        .replace(/```/g, "")
        .replace(/^\s*{\s*"content":\s*"/, "")
        .replace(/"\s*}\s*$/, "")
        .trim()
      text = linkKeywords(text, keywords)
      text = enforceBoldCaps(text, selectedData)
    }

    text = text
      .replace(/<\/h2>/g, "</h2>\n")
      .replace(/<\/p>/g, "</p>\n")
      .trim()

    // Generate the additional fields
    const metaTitle = generateMetaTitle(selectedData)
    const metaDescription = generateMetaDescription(selectedData)
    const slug = generateSlug(selectedData)

    // For focus keyword, we'll use Gemini to generate a more targeted keyword
    const focusKeywordPrompt = `
Based on the following doctor information, provide a focused SEO keyword phrase (2-3 words) that would be most valuable for search engine optimization. The keyword should be specific to the doctor's main specialty and practice.

Doctor Data:
- Name: ${selectedData.name}
- Main Specialty: ${selectedData.mainSpecialty}
- Subspecialties: ${subSpecialties}
- Location: ${location}

IMPORTANT RULES:
1. Return ONLY the keyword phrase (2-3 words), with no additional text or explanation.
2. The phrase should be natural and commonly searched, like "pediatric cardiology" or "orthopedic surgeon Kenya".
3. Do NOT repeat the same word multiple times in the phrase.
4. NEVER use abbreviations (e.g., use "General Practitioner" instead of "GP").
5. Always use full, complete terms without shortening.
`

    const keywordResult = await model.generateContent(focusKeywordPrompt)
    const keywordResponse = await keywordResult.response
    const focusKeyword = keywordResponse.text().trim()

    return Response.json({
      content: text,
      metaTitle,
      metaDescription,
      slug,
      focusKeyword,
    })
  } catch (error: unknown) {
    console.error("Detailed error:", error)

    const errorMessage = error instanceof Error ? error.message : String(error)

    // Enhanced rate limit detection
    if (
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.includes("429") ||
      errorMessage.includes("too many requests")
    ) {
      return Response.json(
        {
          error: "Rate limit exceeded",
          details: "Please wait a moment before trying again.",
          retryAfter: 60,
          isRateLimit: true,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        },
      )
    }

    return Response.json(
      {
        error: "Failed to generate content",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}

