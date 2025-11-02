from flask import jsonify


def error_response(message: str, status: int = 400):
    return jsonify({"error": message}), status
