"""
YouTube metadata fetcher - Extract video info from YouTube URLs using oEmbed API
"""

import re
import requests
from typing import Optional, Dict, Any
import json

def extract_video_id(url: str) -> Optional[str]:
    """Extract video ID from YouTube URL (supports multiple formats)"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return None


def get_youtube_metadata(url: str) -> Optional[Dict[str, Any]]:
    """
    Fetch YouTube video metadata using oEmbed API

    Returns:
        dict with keys: title, author_name, thumbnail_url, video_id, duration (if available)
        None if URL is invalid or request fails
    """
    video_id = extract_video_id(url)
    if not video_id:
        print(f"❌ Could not extract video ID from: {url}")
        return None

    try:
        # Use oEmbed API - works without authentication
        oembed_url = f"https://www.youtube.com/oembed?url=https://youtube.com/watch?v={video_id}&format=json"
        response = requests.get(oembed_url, timeout=5)
        response.raise_for_status()

        data = response.json()

        return {
            "video_id": video_id,
            "title": data.get("title"),
            "author": data.get("author_name"),
            "channel_url": data.get("author_url"),
            "thumbnail_url": data.get("thumbnail_url"),
            "width": data.get("width"),
            "height": data.get("height"),
            "html": data.get("html"),  # Embed HTML
        }

    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to fetch YouTube metadata: {e}")
        return None
    except json.JSONDecodeError:
        print("❌ Invalid response from YouTube oEmbed API")
        return None


def print_youtube_info(url: str) -> None:
    """Pretty-print YouTube video metadata"""
    metadata = get_youtube_metadata(url)

    if not metadata:
        return

    print("\n" + "="*60)
    print("📺 YOUTUBE VIDEO METADATA")
    print("="*60)
    print(f"Title:       {metadata['title']}")
    print(f"Channel:     {metadata['author']}")
    print(f"Channel URL: {metadata['channel_url']}")
    print(f"Video ID:    {metadata['video_id']}")
    print(f"Thumbnail:   {metadata['thumbnail_url']}")
    print("="*60 + "\n")


if __name__ == "__main__":
    # Test with example
    test_url = "https://www.youtube.com/watch?v=vNDYUlxNIAA"
    print_youtube_info(test_url)

    metadata = get_youtube_metadata(test_url)
    if metadata:
        print(f"Metadata retrieved: {json.dumps(metadata, indent=2)}")
