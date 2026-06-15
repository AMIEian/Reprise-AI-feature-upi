"""
Utility functions for handling image uploads and conversions.
"""

import base64
import mimetypes
from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple


def encode_image_to_base64(file_content: bytes) -> str:
    """
    Encode binary file content to base64 string.
    
    Args:
        file_content: Binary content of the image file
        
    Returns:
        Base64 encoded string of the image
    """
    return base64.b64encode(file_content).decode('utf-8')


def decode_base64_to_bytes(base64_str: str) -> bytes:
    """
    Decode base64 string back to binary content.
    
    Args:
        base64_str: Base64 encoded string
        
    Returns:
        Binary content
    """
    return base64.b64decode(base64_str)


def get_mime_type(filename: str) -> str:
    """
    Get MIME type from filename.
    
    Args:
        filename: Name of the file
        
    Returns:
        MIME type string (e.g., 'image/jpeg')
    """
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or 'image/jpeg'


def validate_image_file(file_content: bytes, filename: str, max_size_mb: int = 5) -> Tuple[bool, Optional[str]]:
    """
    Validate image file size and type.
    
    Args:
        file_content: Binary content of the file
        filename: Name of the file
        max_size_mb: Maximum allowed file size in MB
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check file size
    size_mb = len(file_content) / (1024 * 1024)
    if size_mb > max_size_mb:
        return False, f"File size {size_mb:.2f}MB exceeds limit of {max_size_mb}MB"
    
    # Check MIME type
    mime_type = get_mime_type(filename)
    if not mime_type or not mime_type.startswith('image/'):
        return False, f"Invalid file type: {mime_type or 'unknown'}. Only images are allowed."
    
    return True, None


def create_base64_data_url(base64_content: str, filename: str) -> str:
    """
    Create a data URL from base64 content.
    
    Args:
        base64_content: Base64 encoded image content
        filename: Name of the file (to determine MIME type)
        
    Returns:
        Data URL string (e.g., 'data:image/jpeg;base64,...')
    """
    mime_type = get_mime_type(filename)
    return f"data:{mime_type};base64,{base64_content}"


def is_valid_url(url: str) -> bool:
    """
    Check if a string is a valid URL.
    
    Args:
        url: URL string to validate
        
    Returns:
        True if valid URL, False otherwise
    """
    if not url:
        return False
    return url.startswith(('http://', 'https://', 'data:'))
