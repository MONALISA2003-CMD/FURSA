from django.db import connection
from django.db.utils import DatabaseError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def root(request):
    """Provide a helpful response when someone opens the API base URL."""
    return Response({
        "service": "fursa-api",
        "status": "ok",
        "health": "/api/v1/health/",
        "api_prefix": "/api/v1/",
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Check API liveness and verify Django can query its configured database."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return Response(
            {"status": "error", "service": "fursa-api", "database": "unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({
        "status": "ok",
        "service": "fursa-api",
        "version": "1",
        "database": "connected",
    })
