from flask import Blueprint

model_bp = Blueprint("model", __name__)


# Create and name a model
@model_bp.route("/api/model", methods=["POST"])
def create_model():
    pass


# Get Model and Runs
@model_bp.route("/api/model/<id>", methods=["GET"])
def get_model(id: str):
    pass
