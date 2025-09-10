export interface DoctorData {
  name?: string
  Name?: string
  DOCTOR_NAME?: string
  Fullname?: string
  specialty?: string
  Specialty?: string
  SPECIALTY?: string
  mainSpecialty?: string
  subSpecialties?: string
  "Sub-Specialty"?: string
  qualifications?: string
  Qualifications?: string
  location?: string
  Address?: string
  about?: string
  "Reg No"?: string
  Discipline?: string
  [key: string]: any
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
  sampleData: Record<string, any>
  rawData: DoctorData[]
}
