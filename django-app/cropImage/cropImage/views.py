from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import cv2
import numpy as np
import requests
import mimetypes
import cairosvg
from io import BytesIO
from PIL import Image


def get_image_from_url(url):
    """Retrieve an image from a URL as a NumPy array"""
    response = requests.get(url)
    if response.status_code != 200:
        raise ValueError("Failed to download image")

    content_type = response.headers.get("Content-Type", "")

    if "image/svg+xml" in content_type or url.lower().endswith(".svg"):
        return convert_svg_to_png(response.content)
    else:
        img_array = np.array(bytearray(response.content), dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)

        # If format is unsupported by OpenCV, use PIL
        if img is None:
            img = convert_with_pil(response.content)

        return img


def convert_svg_to_png(svg_data):
    """Convert SVG to PNG"""
    png_data = BytesIO()
    cairosvg.svg2png(bytestring=svg_data, write_to=png_data)
    img_array = np.array(bytearray(png_data.getvalue()), dtype=np.uint8)
    return cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)


def convert_with_pil(image_data):
    """Convert non-standard formats (TIF, WEBP) to OpenCV"""
    image = Image.open(BytesIO(image_data))
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def find_crop_coordinates(original_url, cropped_url, use_sift=True):
    """Find coordinates of a cropped image using SIFT or ORB"""
    original = get_image_from_url(original_url)
    cropped = get_image_from_url(cropped_url)

    # Convert images to grayscale
    gray_original = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
    gray_cropped = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)

    # Initialize feature detector (SIFT or ORB)
    if use_sift:
        detector = cv2.SIFT_create()
    else:
        detector = cv2.ORB_create(nfeatures=5000)

    # Detect keypoints and descriptors
    keypoints1, descriptors1 = detector.detectAndCompute(gray_original, None)
    keypoints2, descriptors2 = detector.detectAndCompute(gray_cropped, None)

    if descriptors1 is None or descriptors2 is None:
        raise ValueError("Feature detection failed. Descriptors not found.")

    # Use FLANN or BFMatcher
    if use_sift:
        index_params = dict(algorithm=1, trees=5)  # FLANN for SIFT
        search_params = dict(checks=50)
        matcher = cv2.FlannBasedMatcher(index_params, search_params)
    else:
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)  # BFMatcher for ORB

    matches = matcher.match(descriptors2, descriptors1)

    if len(matches) < 4:
        raise ValueError("Not enough matches found to determine location")

    # Get matched points
    src_pts = np.float32([keypoints2[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
    dst_pts = np.float32([keypoints1[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)

    # Compute homography
    matrix, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)

    if matrix is None:
        raise ValueError("Homography calculation failed")

    # Get cropped image size
    h, w = gray_cropped.shape

    # Find coordinates in original image
    pts = np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2)
    dst = cv2.perspectiveTransform(pts, matrix)

    x1, y1 = int(dst[0][0][0]), int(dst[0][0][1])
    x2, y2 = int(dst[2][0][0]), int(dst[2][0][1])

    return x1, y1, x2, y2


@csrf_exempt
def check_crop(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            original_url = data.get("original_url")
            cropped_url = data.get("cropped_url")

            if not original_url or not cropped_url:
                return JsonResponse({"error": "Missing URLs"}, status=400)

            if not is_valid_image_url(original_url) or not is_valid_image_url(cropped_url):
                return JsonResponse({"error": "Invalid file format"}, status=400)

            # Use SIFT or ORB (default: SIFT)
            use_sift = data.get("use_sift", True)

            x1, y1, x2, y2 = find_crop_coordinates(original_url, cropped_url, use_sift=use_sift)

            return JsonResponse({"x1": x1, "y1": y1, "x2": x2, "y2": y2})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


def is_valid_image_url(url):
    """Check if a URL is an image"""
    image_extensions = (".jpg", ".jpeg", ".png", ".gif", ".svg", ".tif", ".tiff", ".webp")
    mimetype, _ = mimetypes.guess_type(url)
    return mimetype and mimetype.startswith("image/") or url.lower().endswith(image_extensions)
