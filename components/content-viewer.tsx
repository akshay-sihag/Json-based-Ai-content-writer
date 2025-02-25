"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import DOMPurify from "dompurify"

interface ContentViewerProps {
  content: string
  title?: string
  metaTitle?: string
  metaDescription?: string
  slug?: string
  focusKeyword?: string
}

export function ContentViewer({ content, title, metaTitle, metaDescription, slug, focusKeyword }: ContentViewerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Function to sanitize HTML content while preserving allowed tags
  const sanitizeContent = (html: string) => {
    // Configure DOMPurify to only allow specific tags and attributes
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p", "h2", "h3", "h4", "h5", "h6", "strong", "br", "a", "ul", "li", "ol"],
      ALLOWED_ATTR: ["href"], // Allow href attribute for links
    })
    return clean
  }

  // Process the content to ensure proper HTML formatting
  const processContent = (rawContent: string) => {
    // Remove any potential code block markers
    let processed = rawContent
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim()

    // Ensure content is wrapped in proper HTML tags if it isn't already
    if (!processed.startsWith("<")) {
      processed = `<p>${processed}</p>`
    }

    return sanitizeContent(processed)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          <Eye className="h-4 w-4 mr-2" />
          View Content
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title || "Generated Content"}</DialogTitle>
          <DialogDescription>View the complete generated content with all formatting and links.</DialogDescription>
        </DialogHeader>

        {/* Add SEO metadata section */}
        {(metaTitle || metaDescription || slug || focusKeyword) && (
          <div className="mb-4 p-3 border rounded-md bg-slate-50">
            <h3 className="text-sm font-medium mb-2">SEO Metadata</h3>
            <div className="space-y-2 text-sm">
              {metaTitle && (
                <div>
                  <span className="font-semibold">Meta Title:</span> {metaTitle}
                  <span className="text-xs text-muted-foreground ml-2">({metaTitle.length} chars)</span>
                </div>
              )}
              {metaDescription && (
                <div>
                  <span className="font-semibold">Meta Description:</span> {metaDescription}
                  <span className="text-xs text-muted-foreground ml-2">({metaDescription.length} chars)</span>
                </div>
              )}
              {slug && (
                <div>
                  <span className="font-semibold">Slug:</span> {slug}
                </div>
              )}
              {focusKeyword && (
                <div>
                  <span className="font-semibold">Focus Keyword:</span> {focusKeyword}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 overflow-y-auto max-h-[calc(80vh-16rem)] px-2">
          <div
            className="prose prose-slate max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-strong:text-primary prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-blue-600 hover:prose-a:text-blue-500"
            dangerouslySetInnerHTML={{
              __html: processContent(content),
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

