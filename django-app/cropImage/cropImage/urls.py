from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('check-crop/', views.check_crop),
    path('generate-excel/', views.generate_excel)
]
