"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pause, Play, Download } from "lucide-react"
import { ContentViewer } from "@/components/content-viewer"
import type { DoctorData } from "@/types"

// Update the interface definition
interface JsonData {
  headers: string[]
  sampleData: Record<string, string>
  rawData: DoctorData[]
}

// Update the GeneratedContent interface to include the new fields
interface GeneratedContent {
  id: number
  content: string
  keywords: string[]
  status: "pending" | "completed" | "failed"
  metaTitle?: string
  metaDescription?: string
  slug?: string
  focusKeyword?: string
}

export default function ContentGenerator() {
  const [jsonData, setJsonData] = useState<JsonData | null>(null)
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([])
  const [tone, setTone] = useState<string>("")
  const [customTone, setCustomTone] = useState<string>("")
  const [characterLength, setCharacterLength] = useState<string>("")
  const [batchSize, setBatchSize] = useState<string>("10")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedContents, setGeneratedContents] = useState<GeneratedContent[]>([])
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0)
  const [visibleEntries, setVisibleEntries] = useState<number>(10)

  // Add a ref to track the active processing state
  const processingRef = React.useRef(false)

  // Add a ref to track the last processed entry
  const lastProcessedRef = React.useRef<number>(0)

  // Load saved progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem("contentGenerationProgress")
    if (savedProgress) {
      const { contents, currentIndex } = JSON.parse(savedProgress)
      setGeneratedContents(contents)
      setCurrentBatchIndex(currentIndex)
    }
  }, [])

  // Save progress to localStorage
  useEffect(() => {
    if (generatedContents.length > 0) {
      localStorage.setItem(
        "contentGenerationProgress",
        JSON.stringify({
          contents: generatedContents,
          currentIndex: currentBatchIndex,
        }),
      )
    }
  }, [generatedContents, currentBatchIndex])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.name.endsWith(".json")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string)
          if (Array.isArray(json)) {
            processData(json as DoctorData[])
          } else {
            throw new Error("Invalid JSON format: Expected an array")
          }
        } catch (error) {
          console.error("Error parsing JSON:", error)
          alert("Error parsing JSON file. Please ensure it's a valid JSON array.")
        }
      }
      reader.readAsText(file)
    } else {
      alert("Unsupported file format. Please upload a JSON file.")
    }
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // Rate limiting delay between requests (2000ms)
  const RATE_LIMIT_DELAY = 4000

  // Update the processData function
  const processData = (json: DoctorData[]) => {
    const headers = Object.keys(json[0])
    const sampleData = headers.reduce(
      (acc, header) => {
        acc[header] = json[0][header] as string
        return acc
      },
      {} as Record<string, string>,
    )
    setJsonData({
      headers,
      sampleData,
      rawData: json,
    })
    // Initialize generated contents array with all entries as pending
    setGeneratedContents(
      json.map((_, index) => ({
        id: index,
        content: "",
        keywords: [],
        status: "pending",
      })),
    )
    // Set initial visible entries to 10
    setVisibleEntries(10)
  }

  const processBatch = async () => {
    if (!jsonData) return

    processingRef.current = true

    const batchSizeNum = Number.parseInt(batchSize)
    const totalEntries = jsonData.rawData.length
    let currentStartIndex = lastProcessedRef.current

    try {
      while (currentStartIndex < totalEntries && processingRef.current) {
        const batchEnd = Math.min(currentStartIndex + batchSizeNum, totalEntries)
        const batch = jsonData.rawData.slice(currentStartIndex, batchEnd)

        for (const [index, entry] of batch.entries()) {
          if (!processingRef.current) {
            console.log("Processing stopped")
            lastProcessedRef.current = currentStartIndex + index
            return
          }

          const currentIndex = currentStartIndex + index

          if (generatedContents[currentIndex]?.status === "completed") {
            continue
          }

          try {
            console.log("Processing entry:", currentIndex)

            const response = await fetch("/api/generate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                selectedData: entry,
                selectedHeaders,
                tone: tone === "custom" ? customTone : tone,
                wordCount: Number.parseInt(characterLength),
              }),
            })

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()

            if (data.error) {
              throw new Error(data.error)
            }

            if (!processingRef.current) {
              lastProcessedRef.current = currentIndex
              return
            }

            setGeneratedContents((prev) => {
              const newContents = [...prev]
              newContents[currentIndex] = {
                id: currentIndex,
                content: data.content || "",
                keywords: [],
                status: "completed",
                metaTitle: data.metaTitle || "",
                metaDescription: data.metaDescription || "",
                slug: data.slug || "",
                focusKeyword: data.focusKeyword || "",
              }
              return newContents
            })

            lastProcessedRef.current = currentIndex + 1
          } catch (error) {
            console.error("Error processing entry:", currentIndex, error)

            if (!processingRef.current) {
              lastProcessedRef.current = currentIndex
              return
            }

            setGeneratedContents((prev) => {
              const newContents = [...prev]
              newContents[currentIndex] = {
                id: currentIndex,
                content: "",
                keywords: [],
                status: "failed",
              }
              return newContents
            })

            lastProcessedRef.current = currentIndex + 1
          }

          setProgress(((currentIndex + 1) / totalEntries) * 100)

          await delay(RATE_LIMIT_DELAY)
        }

        currentStartIndex = batchEnd

        if (!processingRef.current) {
          return
        }

        if (batchEnd < totalEntries) {
          await delay(3000)
        }
      }
    } finally {
      if (currentStartIndex >= totalEntries || !processingRef.current) {
        setIsProcessing(false)
        processingRef.current = false
      }
    }
  }

  const handleStartProcessing = () => {
    setIsProcessing(true)
    setIsPaused(false)
    processingRef.current = true
    lastProcessedRef.current = 0
    processBatch()
  }

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false)
      processingRef.current = true
      processBatch()
    } else {
      setIsPaused(true)
      processingRef.current = false
    }
  }

  const handleExport = () => {
    if (!jsonData) return

    const completedContent = generatedContents
      .filter((item) => item.status === "completed")
      .map((item) => ({
        ...jsonData.rawData[item.id],
        generatedContent: item.content,
        metaTitle: item.metaTitle,
        metaDescription: item.metaDescription,
        slug: item.slug,
        focusKeyword: item.focusKeyword,
      }))

    try {
      const blob = new Blob([JSON.stringify(completedContent, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "generated-content.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export error:", error)
      alert("Failed to export content. Please try again.")
    }
  }

  const handleRetryEntry = async (entryId: number) => {
    if (!jsonData) return

    try {
      const entry = jsonData.rawData[entryId]

      // Update the status to pending
      setGeneratedContents((prev) => {
        const newContents = [...prev]
        newContents[entryId] = {
          ...newContents[entryId],
          status: "pending",
        }
        return newContents
      })

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedData: entry,
          selectedHeaders,
          tone: tone === "custom" ? customTone : tone,
          wordCount: Number.parseInt(characterLength),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setGeneratedContents((prev) => {
        const newContents = [...prev]
        newContents[entryId] = {
          id: entryId,
          content: data.content || "",
          keywords: [],
          status: "completed",
          metaTitle: data.metaTitle || "",
          metaDescription: data.metaDescription || "",
          slug: data.slug || "",
          focusKeyword: data.focusKeyword || "",
        }
        return newContents
      })
    } catch (error) {
      console.error("Error retrying entry:", entryId, error)

      setGeneratedContents((prev) => {
        const newContents = [...prev]
        newContents[entryId] = {
          id: entryId,
          content: "",
          keywords: [],
          status: "failed",
        }
        return newContents
      })
    }
  }

  const tones = ["Professional", "Casual", "Friendly", "Formal", "Informative", "Persuasive", "Custom"]

  const loadMoreEntries = () => {
    setVisibleEntries((prev) => Math.min(prev + 10, generatedContents.length))
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-[900px] px-4 sm:px-6">
        <div className="rounded-xl bg-white shadow-sm p-6 space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bulk SEO Content Generator</h1>
            <p className="text-muted-foreground">Generate SEO optimized content from your JSON data</p>
          </div>

          <div className="space-y-4">
            <Label htmlFor="json-file">Upload JSON File</Label>
            <Input id="json-file" type="file" accept=".json" onChange={handleFileUpload} />
          </div>

          {jsonData && (
            <>
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Select Headers to Include</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {jsonData.headers.map((header) => (
                      <div key={header} className="flex items-center space-x-3">
                        <Checkbox
                          id={header}
                          checked={selectedHeaders.includes(header)}
                          onCheckedChange={() => {
                            setSelectedHeaders((prev) =>
                              prev.includes(header) ? prev.filter((h) => h !== header) : [...prev, header],
                            )
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor={header}>{header}</Label>
                          <p className="text-sm text-muted-foreground">Sample: {jsonData.sampleData[header]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Content Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          {tones.map((t) => (
                            <SelectItem key={t.toLowerCase()} value={t.toLowerCase()}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {tone === "custom" && (
                      <div className="space-y-2">
                        <Label>Custom Tone Description</Label>
                        <Input
                          placeholder="Describe your desired tone..."
                          value={customTone}
                          onChange={(e) => setCustomTone(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Word Count</Label>
                      <Input
                        type="number"
                        placeholder="Enter desired number of words"
                        value={characterLength}
                        onChange={(e) => setCharacterLength(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Batch Size</Label>
                      <Input
                        type="number"
                        placeholder="Number of entries per batch"
                        value={batchSize}
                        onChange={(e) => setBatchSize(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {generatedContents.some((item) => item.status === "failed") && (
                <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4 my-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        Some entries failed to generate. Please check the table for details and try regenerating failed
                        entries.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!isProcessing ? (
                      <Button
                        onClick={handleStartProcessing}
                        disabled={!selectedHeaders.length || !tone || !characterLength}
                        className="w-full sm:w-auto"
                      >
                        Start Processing
                      </Button>
                    ) : (
                      <Button
                        onClick={handlePauseResume}
                        className="w-full sm:w-auto"
                        variant={isPaused ? "default" : "secondary"}
                      >
                        {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                        {isPaused ? "Resume" : "Pause"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleExport}
                      disabled={!generatedContents.some((item) => item.status === "completed")}
                      className="w-full sm:w-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export JSON
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Content Preview</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedContents.slice(0, visibleEntries).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id + 1}</TableCell>
                          <TableCell>
                            {item.status === "pending" && (
                              <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
                            )}
                            {item.status === "completed" && (
                              <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>
                            )}
                            {item.status === "failed" && <Badge className="bg-red-500 hover:bg-red-600">Failed</Badge>}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            {item.status === "completed" ? (
                              <div className="truncate">{item.content.substring(0, 100)}...</div>
                            ) : item.status === "failed" ? (
                              "Generation failed"
                            ) : (
                              "Pending"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.status === "completed" && (
                              <ContentViewer
                                content={item.content}
                                title={item.metaTitle}
                                metaTitle={item.metaTitle}
                                metaDescription={item.metaDescription}
                                slug={item.slug}
                                focusKeyword={item.focusKeyword}
                              />
                            )}
                            {item.status === "failed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetryEntry(item.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                Retry Generation
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {generatedContents.length > visibleEntries && (
                <div className="flex justify-center mt-4 mb-2">
                  <Button variant="outline" onClick={loadMoreEntries}>
                    Load More Results
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

