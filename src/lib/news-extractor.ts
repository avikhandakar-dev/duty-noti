import { JSDOM } from "jsdom";
import puppeteer from "puppeteer";

interface CoverPhoto {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  source?: string; // e.g., 'og:image', 'twitter:image', 'article img'
}

interface ExtractedContent {
  content: string;
  title?: string;
  coverPhoto?: CoverPhoto;
  wordCount: number;
  characterCount: number;
}

interface ExtractionResult {
  success: boolean;
  data?: ExtractedContent;
  error?: string;
}

type ExtractionMethod = () => string | null;

class NewsContentExtractor {
  private readonly contentSelectors: readonly string[];
  private readonly removeSelectors: readonly string[];

  constructor() {
    // Common selectors for main content across different news sites
    this.contentSelectors = [
      "article",
      '[role="main"]',
      ".article-content",
      ".post-content",
      ".entry-content",
      ".content",
      ".story-body",
      ".article-body",
      ".post-body",
      "#main-content",
      ".main-content",
      ".article-text",
      ".story-content",
    ] as const;

    // Selectors to remove (ads, navigation, etc.)
    this.removeSelectors = [
      "nav",
      "header",
      "footer",
      "aside",
      ".advertisement",
      ".ad",
      ".ads",
      ".social-share",
      ".share-buttons",
      ".related-articles",
      ".recommended",
      ".comments",
      ".comment-section",
      ".newsletter-signup",
      ".subscription",
      "script",
      "style",
      "iframe",
      ".menu",
      ".navigation",
      ".nav",
      ".sidebar",
      ".widget",
    ] as const;
  }

  // Main method to extract content
  public extractContent(html: string): ExtractedContent | null {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Remove unwanted elements first
      this.removeUnwantedElements(document);

      // Try different extraction methods
      const methods: ExtractionMethod[] = [
        () => this.extractBySelectors(document),
        () => this.extractByTextDensity(document),
        () => this.extractByParagraphCount(document),
        () => this.fallbackExtraction(document),
      ];

      for (const method of methods) {
        const content = method();
        if (content && this.isValidContent(content)) {
          const cleanedContent = this.cleanText(content);
          const title = this.extractTitle(document);
          const coverPhoto = this.extractCoverPhoto(document, html);

          return {
            content: cleanedContent,
            title,
            coverPhoto,
            wordCount: this.countWords(cleanedContent),
            characterCount: cleanedContent.length,
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Error during content extraction:", error);
      return null;
    }
  }

  // Extract cover photo from the document
  private extractCoverPhoto(
    document: Document,
    html: string
  ): CoverPhoto | undefined {
    // Method 1: Open Graph image
    const ogImage = this.extractOgImage(document);
    if (ogImage) return ogImage;

    // Method 2: Twitter Card image
    const twitterImage = this.extractTwitterImage(document);
    if (twitterImage) return twitterImage;

    // Method 3: JSON-LD structured data
    const jsonLdImage = this.extractJsonLdImage(document);
    if (jsonLdImage) return jsonLdImage;

    // Method 4: Article/main content first image
    const articleImage = this.extractArticleImage(document);
    if (articleImage) return articleImage;

    // Method 5: Featured image selectors
    const featuredImage = this.extractFeaturedImage(document);
    if (featuredImage) return featuredImage;

    return undefined;
  }

  // Extract Open Graph image
  private extractOgImage(document: Document): CoverPhoto | undefined {
    const ogImageMeta = document.querySelector('meta[property="og:image"]');
    const ogImageContent = ogImageMeta?.getAttribute("content");

    if (ogImageContent) {
      const ogImageAlt = document
        .querySelector('meta[property="og:image:alt"]')
        ?.getAttribute("content");
      const ogImageWidth = document
        .querySelector('meta[property="og:image:width"]')
        ?.getAttribute("content");
      const ogImageHeight = document
        .querySelector('meta[property="og:image:height"]')
        ?.getAttribute("content");

      return {
        url: this.resolveUrl(ogImageContent),
        alt: ogImageAlt || undefined,
        width: ogImageWidth ? parseInt(ogImageWidth, 10) : undefined,
        height: ogImageHeight ? parseInt(ogImageHeight, 10) : undefined,
        source: "og:image",
      };
    }

    return undefined;
  }

  // Extract Twitter Card image
  private extractTwitterImage(document: Document): CoverPhoto | undefined {
    const twitterImageMeta = document.querySelector(
      'meta[name="twitter:image"], meta[property="twitter:image"]'
    );
    const twitterImageContent = twitterImageMeta?.getAttribute("content");

    if (twitterImageContent) {
      const twitterImageAlt = document
        .querySelector(
          'meta[name="twitter:image:alt"], meta[property="twitter:image:alt"]'
        )
        ?.getAttribute("content");

      return {
        url: this.resolveUrl(twitterImageContent),
        alt: twitterImageAlt || undefined,
        source: "twitter:image",
      };
    }

    return undefined;
  }

  // Extract image from JSON-LD structured data
  private extractJsonLdImage(document: Document): CoverPhoto | undefined {
    const jsonLdScripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );

    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent || "");
        const image = this.findImageInJsonLd(data);
        if (image) {
          return {
            url: this.resolveUrl(image),
            source: "json-ld",
          };
        }
      } catch (error) {
        // Continue to next script if parsing fails
        continue;
      }
    }

    return undefined;
  }

  // Recursively search for image in JSON-LD data
  private findImageInJsonLd(data: any): string | null {
    if (!data || typeof data !== "object") return null;

    // Direct image property
    if (data.image) {
      if (typeof data.image === "string") return data.image;
      if (Array.isArray(data.image) && data.image.length > 0) {
        const firstImage = data.image[0];
        return typeof firstImage === "string"
          ? firstImage
          : firstImage.url || null;
      }
      if (typeof data.image === "object" && data.image.url) {
        return data.image.url;
      }
    }

    // Search in nested objects and arrays
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const result = this.findImageInJsonLd(data[key]);
        if (result) return result;
      }
    }

    return null;
  }

  // Extract first significant image from article content
  private extractArticleImage(document: Document): CoverPhoto | undefined {
    const contentSelectors = [
      "article",
      '[role="main"]',
      ".article-content",
      ".post-content",
      ".content",
    ];

    for (const selector of contentSelectors) {
      const contentElement = document.querySelector(selector);
      if (contentElement) {
        const img = contentElement.querySelector("img");
        if (img && this.isValidImage(img)) {
          return this.createCoverPhotoFromImg(img, "article content");
        }
      }
    }

    return undefined;
  }

  // Extract featured image using common selectors
  private extractFeaturedImage(document: Document): CoverPhoto | undefined {
    const featuredSelectors = [
      ".featured-image img",
      ".hero-image img",
      ".article-image img",
      ".post-image img",
      ".cover-image img",
      ".thumbnail img",
      '[data-testid="featured-image"] img',
      ".article-header img",
      ".story-image img",
    ];

    for (const selector of featuredSelectors) {
      const img = document.querySelector(selector);
      if (img && this.isValidImage(img)) {
        return this.createCoverPhotoFromImg(img, "featured image");
      }
    }

    return undefined;
  }

  // Check if image is valid (not too small, has src)
  private isValidImage(img: any): boolean {
    if (img.tagName.toLowerCase() !== "img") return false;

    const src =
      img.src || img.getAttribute("src") || img.getAttribute("data-src");
    if (!src) return false;

    // Filter out very small images (likely icons/ads)
    const width = parseInt(img.getAttribute("width") || "0", 10);
    const height = parseInt(img.getAttribute("height") || "0", 10);

    if (width > 0 && height > 0 && (width < 100 || height < 100)) {
      return false;
    }

    // Filter out common ad/icon patterns
    const srcLower = src.toLowerCase();
    const excludePatterns = [
      "icon",
      "logo",
      "avatar",
      "profile",
      "ad",
      "banner",
      "widget",
      "button",
      "pixel",
      "tracker",
      "1x1",
    ];

    return !excludePatterns.some((pattern) => srcLower.includes(pattern));
  }

  // Create CoverPhoto object from img element
  private createCoverPhotoFromImg(img: Element, source: string): CoverPhoto {
    const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
    const alt = img.getAttribute("alt") || undefined;
    const width = parseInt(img.getAttribute("width") || "0", 10) || undefined;
    const height = parseInt(img.getAttribute("height") || "0", 10) || undefined;

    return {
      url: this.resolveUrl(src),
      alt,
      width: width || undefined,
      height: height || undefined,
      source,
    };
  }

  // Resolve relative URLs to absolute URLs
  private resolveUrl(url: string): string {
    try {
      // If already absolute, return as is
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }

      // For protocol-relative URLs
      if (url.startsWith("//")) {
        return "https:" + url;
      }

      // For relative URLs, we can't resolve without base URL
      // Return as is and let the caller handle it
      return url;
    } catch (error) {
      return url;
    }
  }
  private extractTitle(document: Document): string | undefined {
    const titleSelectors = [
      "h1",
      ".article-title",
      ".post-title",
      ".entry-title",
      '[data-testid="headline"]',
      ".headline",
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback to page title
    const pageTitle = document.querySelector("title")?.textContent?.trim();
    return pageTitle;
  }

  // Remove unwanted elements
  private removeUnwantedElements(document: Document): void {
    this.removeSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    });
  }

  // Method 1: Try common content selectors
  private extractBySelectors(document: Document): string | null {
    for (const selector of this.contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.getTextContent(element);
        if (text.length > 200) {
          // Minimum content length
          return text;
        }
      }
    }
    return null;
  }

  // Method 2: Find element with highest text density
  private extractByTextDensity(document: Document): string | null {
    const candidates = document.querySelectorAll("div, section, main");
    let bestElement: Element | null = null;
    let highestScore = 0;

    candidates.forEach((element) => {
      const score = this.calculateTextDensity(element);
      if (score > highestScore) {
        highestScore = score;
        bestElement = element;
      }
    });

    return bestElement ? this.getTextContent(bestElement) : null;
  }

  // Method 3: Find container with most paragraphs
  private extractByParagraphCount(document: Document): string | null {
    const candidates = document.querySelectorAll("div, section, main, article");
    let bestElement: Element | null = null;
    let maxScore = 0;

    candidates.forEach((element) => {
      const paragraphs = element.querySelectorAll("p");
      const textLength = this.getTextContent(element).length;

      // Score based on paragraph count and total text length
      const score = paragraphs.length * Math.log(textLength + 1);

      if (score > maxScore) {
        maxScore = score;
        bestElement = element;
      }
    });

    return bestElement ? this.getTextContent(bestElement) : null;
  }

  // Method 4: Fallback - get all paragraphs
  private fallbackExtraction(document: Document): string | null {
    const paragraphs = document.querySelectorAll("p");
    let content = "";

    paragraphs.forEach((p) => {
      const text = p.textContent?.trim() ?? "";
      if (text.length > 50) {
        // Only substantial paragraphs
        content += text + "\n\n";
      }
    });

    const trimmedContent = content.trim();
    return trimmedContent.length > 0 ? trimmedContent : null;
  }

  // Calculate text density (text vs HTML ratio)
  private calculateTextDensity(element: Element): number {
    const textLength = element.textContent?.length ?? 0;
    const htmlLength = element.innerHTML.length;

    if (htmlLength === 0) return 0;

    const density = textLength / htmlLength;
    const paragraphCount = element.querySelectorAll("p").length;

    // Bonus for elements with more paragraphs
    return density * (1 + paragraphCount * 0.1);
  }

  // Extract clean text content
  private getTextContent(element: Element): string {
    // Create a clone to avoid modifying original
    const clone = element.cloneNode(true) as Element;

    // Remove any remaining unwanted elements
    this.removeSelectors.forEach((selector) => {
      const unwanted = clone.querySelectorAll(selector);
      unwanted.forEach((el) => el.remove());
    });

    return clone.textContent ?? "";
  }

  // Validate if content seems legitimate
  private isValidContent(content: string): boolean {
    if (!content || content.length < 100) return false;

    // Check for reasonable word count
    const words = content.split(/\s+/).filter((word) => word.length > 0);
    if (words.length < 20) return false;

    // Check for reasonable sentence structure
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    if (sentences.length < 3) return false;

    return true;
  }

  // Clean and format the extracted text
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n\s*\n/g, "\n\n") // Clean up line breaks
      .trim();
  }

  // Count words in text
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }
}

// Usage function with proper error handling
export async function scrapeNews(url: string): Promise<ExtractionResult> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`HTTP ${response.status}: ${response.statusText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();

    const extractor = new NewsContentExtractor();
    let extractedData = extractor.extractContent(html);

    if (!extractedData) {
      // use browserless to extract content
      const browser = await puppeteer.connect({
        browserWSEndpoint:
          "http://browserless-zksowwgs08kcc0s8o8cc80gs.95.111.237.82.sslip.io/?token=XbNgWHV8CxCJOpW05GXhSXDRtda6AtlK",
      });
      const page = await browser.newPage();

      // Set realistic headers and user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      await page.setExtraHTTPHeaders({
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      });

      // Set viewport to simulate a real browser
      await page.setViewport({ width: 1366, height: 768 });

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      const content = await page.content();
      extractedData = extractor.extractContent(content);
      console.log("Extracted content:", extractedData);
      await browser.close();
    }

    if (extractedData) {
      console.log("Extracted content:");
      console.log("==================");
      console.log("Title:", extractedData.title || "No title found");
      console.log(
        "Cover Photo:",
        extractedData.coverPhoto
          ? `${extractedData.coverPhoto.url} (source: ${extractedData.coverPhoto.source})`
          : "No cover photo found"
      );
      console.log(
        "Content length:",
        extractedData.characterCount,
        "characters"
      );
      console.log("Word count:", extractedData.wordCount, "words");
      console.log(
        "Content preview:",
        extractedData.content.substring(0, 200) + "..."
      );
      console.log("==================");

      return {
        success: true,
        data: extractedData,
      };
    } else {
      return {
        success: false,
        error: "Could not extract main content from the page",
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error scraping news:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Export the main class and utility function
export { NewsContentExtractor };
export type { ExtractedContent, ExtractionResult, CoverPhoto };

// Example usage (uncomment to test):
/*
const testUrls: readonly string[] = [
  'https://www.bbc.com/news/world-us-canada-12345678',
  'https://www.reuters.com/world/sample-article',
  'https://edition.cnn.com/2024/01/01/world/sample-news'
] as const;

// Test with multiple URLs
async function runTests(): Promise<void> {
  for (const [index, url] of testUrls.entries()) {
    console.log(`\n--- Testing URL ${index + 1}: ${url} ---`);
    const result = await scrapeNews(url);
    
    if (result.success && result.data) {
      console.log('✅ Success:', result.data.title);
    } else {
      console.log('❌ Failed:', result.error);
    }
  }
}

// Uncomment to run tests
// runTests().catch(console.error);
*/
