#!/usr/bin/env node

/**
 * Universal Link Analyzer
 * Detects link type and fetches metadata/content
 * Usage: node tools/link-analyzer.js "https://..."
 */

const https = require("https");
const http = require("http");
const url = require("url");

class LinkAnalyzer {
  static detectLinkType(urlString) {
    const urlObj = new URL(urlString);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return "youtube";
    }
    if (hostname.includes("drive.google.com")) {
      return "google-drive";
    }
    if (hostname.includes("vimeo.com")) {
      return "vimeo";
    }
    if (hostname.includes("ted.com")) {
      return "ted";
    }
    if (hostname.includes("docs.google.com")) {
      return "google-docs";
    }
    if (hostname.includes("github.com")) {
      return "github";
    }
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      return "twitter";
    }

    return "unknown";
  }

  static async fetchYouTubeMetadata(urlString) {
    return new Promise((resolve, reject) => {
      const videoIdMatch = urlString.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
      );
      if (!videoIdMatch) {
        reject(new Error("Invalid YouTube URL"));
        return;
      }

      const videoId = videoIdMatch[1];
      const oembedUrl = `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`;

      https
        .get(oembedUrl, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              const metadata = JSON.parse(data);
              resolve({
                type: "youtube",
                title: metadata.title,
                channel: metadata.author_name,
                channelUrl: metadata.author_url,
                thumbnailUrl: metadata.thumbnail_url,
                videoId: videoId,
              });
            } catch (e) {
              reject(new Error("Failed to parse YouTube metadata"));
            }
          });
        })
        .on("error", reject);
    });
  }

  static parseGoogleDriveUrl(urlString) {
    // Extract file ID from Google Drive URL
    const fileIdMatch = urlString.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!fileIdMatch) {
      throw new Error("Invalid Google Drive URL");
    }

    const fileId = fileIdMatch[1];
    return {
      type: "google-drive",
      fileId: fileId,
      downloadUrl: `https://drive.google.com/uc?id=${fileId}&export=download`,
      viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    };
  }

  static async analyze(urlString) {
    try {
      const linkType = this.detectLinkType(urlString);

      console.log(`\n🔍 Analyzing link: ${urlString}`);
      console.log(`📋 Type detected: ${linkType.toUpperCase()}\n`);

      switch (linkType) {
        case "youtube":
          const ytMetadata = await this.fetchYouTubeMetadata(urlString);
          return this.formatOutput(ytMetadata);

        case "google-drive":
          const gdInfo = this.parseGoogleDriveUrl(urlString);
          return this.formatOutput(gdInfo);

        case "ted":
          return {
            type: "ted",
            info: "TED Talk video - use YouTube oEmbed for metadata if available",
          };

        default:
          return {
            type: linkType,
            url: urlString,
            info: `Link type detected: ${linkType} (specific fetching not yet implemented)`,
          };
      }
    } catch (error) {
      throw new Error(`Failed to analyze link: ${error.message}`);
    }
  }

  static formatOutput(data) {
    console.log("━".repeat(60));
    console.log("📊 LINK METADATA");
    console.log("━".repeat(60));

    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === "string") {
        console.log(`${key.padEnd(20)}: ${value}`);
      }
    });

    console.log("━".repeat(60));
    return data;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node tools/link-analyzer.js <URL>");
    console.log("\nSupported platforms:");
    console.log("  • YouTube (youtube.com, youtu.be)");
    console.log("  • Google Drive");
    console.log("  • Google Docs");
    console.log("  • Vimeo");
    console.log("  • TED Talks");
    console.log("  • GitHub");
    console.log("  • Twitter/X");
    console.log("\nExample:");
    console.log(
      '  node tools/link-analyzer.js "https://www.youtube.com/watch?v=dQw4w9WgXcQ"'
    );
    process.exit(1);
  }

  try {
    const urlString = args[0];
    const result = await LinkAnalyzer.analyze(urlString);
    console.log("\n✅ Analysis complete\n");
    console.log("Full data:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
