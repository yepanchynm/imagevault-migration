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
import pandas as pd
import xlsxwriter
import os

ERROR_LOG_FILE = "error_log.json"

def log_error(error_data):
    try:
        with open(ERROR_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(error_data, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"Cant write logs: {e}")


def get_image_from_url(url):
    """Retrieve an image from a URL as a NumPy array."""
    response = requests.get(url)
    if response.status_code != 200:
        raise ValueError("Failed to download image")

    content_type = response.headers.get("Content-Type", "")
    
    # Handle SVG format
    if "image/svg+xml" in content_type or url.lower().endswith(".svg"):
        return convert_svg_to_png(response.content)
    else:
        img_array = np.array(bytearray(response.content), dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)
        if img is None:
            img = convert_with_pil(response.content)
        return img


def convert_svg_to_png(svg_data):
    """Convert an SVG image to PNG format."""
    png_data = BytesIO()
    cairosvg.svg2png(bytestring=svg_data, write_to=png_data)
    img_array = np.array(bytearray(png_data.getvalue()), dtype=np.uint8)
    return cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)


def convert_with_pil(image_data):
    """Convert non-standard image formats (e.g., TIF, WEBP) to OpenCV format."""
    image = Image.open(BytesIO(image_data)).convert("RGB")
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def enhance_image(img):
    """Enhance contrast using CLAHE and apply edge detection."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply CLAHE (Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    
    # Apply Canny edge detection
    edges = cv2.Canny(gray, 50, 150)
    return gray, edges


def find_crop_coordinates(original_url, cropped_url):
    """Find coordinates of a cropped image inside the original image."""
    original = get_image_from_url(original_url)
    cropped = get_image_from_url(cropped_url)

    # Enhance images for better feature detection
    gray_original, edges_original = enhance_image(original)
    gray_cropped, edges_cropped = enhance_image(cropped)

    # Try SIFT feature matching
    sift = cv2.SIFT_create()
    keypoints1, descriptors1 = sift.detectAndCompute(gray_original, None)
    keypoints2, descriptors2 = sift.detectAndCompute(gray_cropped, None)

    if descriptors1 is None or descriptors2 is None or len(descriptors1) < 10 or len(descriptors2) < 10:
        # Fall back to ORB if SIFT fails
        orb = cv2.ORB_create(nfeatures=10000)
        keypoints1, descriptors1 = orb.detectAndCompute(edges_original, None)
        keypoints2, descriptors2 = orb.detectAndCompute(edges_cropped, None)
        if descriptors1 is None or descriptors2 is None:
            raise ValueError("Feature detection failed with both SIFT and ORB")

    # Use FLANN for SIFT, BFMatcher for ORB
    if len(descriptors1) >= 10 and len(descriptors2) >= 10:
        index_params = dict(algorithm=1, trees=5)
        search_params = dict(checks=50)
        matcher = cv2.FlannBasedMatcher(index_params, search_params)
    else:
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    matches = matcher.knnMatch(descriptors2, descriptors1, k=2)  # KNN matching

    # Lowe’s ratio test to filter matches
    good_matches = []
    for m, n in matches:
        if m.distance < 0.75 * n.distance:
            good_matches.append(m)

    if len(good_matches) < 4:
        raise ValueError("Not enough good matches found")

    # Get matched points
    src_pts = np.float32([keypoints2[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
    dst_pts = np.float32([keypoints1[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

    # Compute homography
    matrix, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 3.0)
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
    """API endpoint to check cropping coordinates."""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            original_url = data.get("original_url")
            cropped_url = data.get("cropped_url")

            if not original_url or not cropped_url:
                return JsonResponse({"error": "Missing URLs"}, status=400)
            
            if not is_valid_image_url(original_url) or not is_valid_image_url(cropped_url):
                return JsonResponse({"error": "Invalid file format"}, status=400)

            x1, y1, x2, y2 = find_crop_coordinates(original_url, cropped_url)
            return JsonResponse({"x1": x1, "y1": y1, "x2": x2, "y2": y2})

        except Exception as e:
            error_data = {"error": str(e), "data": data if 'data' in locals() else "No data"}
            log_error(error_data)
            return JsonResponse({"error": str(e)}, status=500)


def is_valid_image_url(url):
    """Check if a URL points to an image file."""
    image_extensions = (".jpg", ".jpeg", ".png", ".gif", ".svg", ".tif", ".tiff", ".webp")
    mimetype, _ = mimetypes.guess_type(url)
    return mimetype and mimetype.startswith("image/") or url.lower().endswith(image_extensions)


@csrf_exempt
def generate_excel(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            full_path = data.get("full_path")

            if not full_path or not os.path.exists(full_path):
                return JsonResponse({"error": "Invalid or missing path"}, status=400)

            with open(full_path, "r", encoding="utf-8") as file:
                json_data = json.load(file)

            dir_path = os.path.dirname(full_path)
            excel_filename = os.path.join(dir_path, 'report.xlsx')

            create_excel(json_data, excel_filename)

            return JsonResponse({"message": "Excel file created"})
        
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
        

def create_excel(data, file_path):
    rows = []
    for full_slug, images in data.items():
        for image in images:
            rows.append({
                "Full Path": full_slug,
                "Old URL": image["old_url"],
                "New URL": image["new_url"]
            })
    
    df = pd.DataFrame(rows)
    writer = pd.ExcelWriter(file_path, engine="xlsxwriter")
    df.to_excel(writer, index=False, sheet_name="Images")
    
    # Add clickable links
    workbook = writer.book
    worksheet = writer.sheets["Images"]
    
    for row_num, row in enumerate(rows, start=1):
        worksheet.write_url(row_num, 1, row["Old URL"], string="Old Image")
        worksheet.write_url(row_num, 2, row["New URL"], string="New Image")
    
    writer.close()
