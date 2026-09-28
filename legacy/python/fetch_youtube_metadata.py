#!/usr/bin/env python3
"""
YouTube Metadata Fetcher CLI
Usage: python fetch_youtube_metadata.py "https://www.youtube.com/watch?v=..."
"""

import sys
import json
from utils.youtube_utils import get_youtube_metadata, print_youtube_info

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_youtube_metadata.py <YouTube_URL>")
        print("\nExample:")
        print('  python fetch_youtube_metadata.py "https://www.youtube.com/watch?v=vNDYUlxNIAA"')
        return

    url = sys.argv[1]
    print(f"\n🔍 Fetching metadata for: {url}\n")

    metadata = get_youtube_metadata(url)

    if not metadata:
        print("❌ Failed to fetch metadata. Is the YouTube URL valid?")
        return

    print_youtube_info(url)
    print("\n📋 Full Metadata (JSON):")
    print(json.dumps(metadata, indent=2))
    print("\n✅ Success!\n")


if __name__ == "__main__":
    main()
