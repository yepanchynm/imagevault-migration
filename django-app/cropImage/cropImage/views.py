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
    """Отримання зображення з URL у вигляді NumPy масиву"""
    response = requests.get(url)
    if response.status_code != 200:
        raise ValueError("Не вдалося завантажити зображення")

    content_type = response.headers.get("Content-Type", "")

    if "image/svg+xml" in content_type or url.lower().endswith(".svg"):
        return convert_svg_to_png(response.content)
    else:
        img_array = np.array(bytearray(response.content), dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)
        
        # Якщо формат не підтримується OpenCV, використовуємо PIL
        if img is None:
            img = convert_with_pil(response.content)

        return img


def convert_svg_to_png(svg_data):
    """Конвертація SVG у PNG"""
    png_data = BytesIO()
    cairosvg.svg2png(bytestring=svg_data, write_to=png_data)
    img_array = np.array(bytearray(png_data.getvalue()), dtype=np.uint8)
    return cv2.imdecode(img_array, cv2.IMREAD_UNCHANGED)


def convert_with_pil(image_data):
    """Перетворення нестандартного формату (TIF, WEBP) у OpenCV"""
    image = Image.open(BytesIO(image_data))
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def find_crop_coordinates(original_url, cropped_url):
    """Пошук координат обрізаного зображення"""
    original = get_image_from_url(original_url)
    cropped = get_image_from_url(cropped_url)

    result = cv2.matchTemplate(original, cropped, cv2.TM_CCOEFF_NORMED)
    _, _, _, max_loc = cv2.minMaxLoc(result)

    x1, y1 = max_loc
    x2, y2 = x1 + cropped.shape[1], y1 + cropped.shape[0]

    return x1, y1, x2, y2


@csrf_exempt
def check_crop(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            original_url = data.get("original_url")
            cropped_url = data.get("cropped_url")

            if not original_url or not cropped_url:
                return JsonResponse({"error": "Не вказано посилання"}, status=400)

            if not is_valid_image_url(original_url) or not is_valid_image_url(cropped_url):
                return JsonResponse({"error": "Неправильний формат файлу"}, status=400)

            x1, y1, x2, y2 = find_crop_coordinates(original_url, cropped_url)

            return JsonResponse({"x1": x1, "y1": y1, "x2": x2, "y2": y2})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


def is_valid_image_url(url):
    """Перевіряє, чи є URL-адреса зображенням"""
    image_extensions = (".jpg", ".jpeg", ".png", ".gif", ".svg", ".tif", ".tiff", ".webp")
    mimetype, _ = mimetypes.guess_type(url)
    return mimetype and mimetype.startswith("image/") or url.lower().endswith(image_extensions)
