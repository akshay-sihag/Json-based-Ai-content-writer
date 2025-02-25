export interface DoctorData {
  name: string
  Name?: string
  DOCTOR_NAME?: string
  specialty?: string
  Specialty?: string
  SPECIALTY?: string
  qualifications: string
  mainSpecialty: string
  subSpecialties: string
  location?: string
  about: string
  [key: string]: string | undefined
}

export interface GeneratedContent {
  id: number
  content: string
  keywords: string[]
  status: "pending" | "completed" | "failed"
  metaTitle?: string
  metaDescription?: string
  slug?: string
  focusKeyword?: string
}

export interface JsonData {
  headers: string[]
  sampleData: Record<string, string>
  rawData: DoctorData[]
}

