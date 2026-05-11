#!/usr/bin/env node

/**
 * YouTube Metadata Fetcher
 * Usage: node tools/youtube-metadata.js "https://www.youtube.com/watch?v=..."
 */

const https = require("https");
const url = require("url");

function extractVideoId(youtubeUrl) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = youtubeUrl.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function getYouTubeMetadata(youtubeUrl) {
  return new Promise((resolve, reject) => {
    const videoId = extractVideoId(youtubeUrl);

    if (!videoId) {
      console.error(`❌ Could not extract video ID from: ${youtubeUrl}`);
      reject(new Error("Invalid YouTube URL"));
      return;
    }

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
              videoId,
              title: metadata.title,
              author: metadata.author_name,
              channelUrl: metadata.author_url,
              thumbnailUrl: metadata.thumbnail_url,
              width: metadata.width,
              height: metadata.height,
            });
          } catch (e) {
            reject(new Error("Failed to parse YouTube response"));
          }
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

function printYouTubeInfo(metadata) {
  console.log("\n" + "=".repeat(60));
  console.log("📺 YOUTUBE VIDEO METADATA");
  console.log("=".repeat(60));
  console.log(`Title:       ${metadata.title}`);
  console.log(`Channel:     ${metadata.author}`);
  console.log(`Channel URL: ${metadata.channelUrl}`);
  console.log(`Video ID:    ${metadata.videoId}`);
  console.log(`Thumbnail:   ${metadata.thumbnailUrl}`);
  console.log(`Dimensions:  ${metadata.width}x${metadata.height}`);
  console.log("=".repeat(60) + "\n");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node tools/youtube-metadata.js <YouTube_URL>");
    console.log("\nExample:");
    console.log(
      '  node tools/youtube-metadata.js "https://www.youtube.com/watch?v=vNDYUlxNIAA"'
    );
    process.exit(1);
  }

  const youtubeUrl = args[0];
  console.log(`\n🔍 Fetching metadata for: ${youtubeUrl}\n`);

  try {
    const metadata = await getYouTubeMetadata(youtubeUrl);
    printYouTubeInfo(metadata);
    console.log("📋 Full Metadata (JSON):");
    console.log(JSON.stringify(metadata, null, 2));
    console.log("\n✅ Success!\n");
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
