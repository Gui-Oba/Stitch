import json

MNIST_INPUT_SIZE = 28 * 28
DEFAULT_HYPERPARAMS = {
    "epochs": 5,
    "batch_size": 64,
    "optimizer": {"type": "sgd", "lr": 0.1, "momentum": 0.0},
    "loss": "cross_entropy",
    "seed": None,
    "train_split": 0.9,
    "shuffle": True,
    "max_samples": 4096,
}


def validate_architecture(payload):
    if not isinstance(payload, dict):
        raise ValueError("`architecture` must be an object.")

    input_size = payload.get("input_size", MNIST_INPUT_SIZE)
    layers = payload.get("layers") or []
    if not layers:
        raise ValueError("`architecture.layers` must contain at least one layer.")

    try:
        input_size = int(input_size)
    except (TypeError, ValueError) as exc:
        raise ValueError("`architecture.input_size` must be convertible to int.") from exc

    sanitized_layers = []
    prev_out = input_size

    for layer in layers:
        if not isinstance(layer, dict):
            raise ValueError("Each layer must be described by an object.")

        layer_type = str(layer.get("type", "linear")).lower()
        if layer_type == "linear":
            in_dim = layer.get("in", prev_out)
            out_dim = layer.get("out", in_dim)
            try:
                in_dim = int(in_dim)
                out_dim = int(out_dim)
            except (TypeError, ValueError) as exc:
                raise ValueError("Linear layer dimensions must be integers.") from exc
            sanitized_layers.append({"type": "linear", "in": in_dim, "out": out_dim})
            prev_out = out_dim
        else:
            sanitized_layers.append({"type": layer_type})

    return {"input_size": input_size, "layers": sanitized_layers}


def validate_hyperparams(payload):
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        raise ValueError("`hyperparams` must be an object.")

    result = json.loads(json.dumps(DEFAULT_HYPERPARAMS))

    if "epochs" in payload:
        try:
            result["epochs"] = int(payload["epochs"])
        except (TypeError, ValueError) as exc:
            raise ValueError("`hyperparams.epochs` must be an integer.") from exc

    if "batch_size" in payload:
        try:
            result["batch_size"] = int(payload["batch_size"])
        except (TypeError, ValueError) as exc:
            raise ValueError("`hyperparams.batch_size` must be an integer.") from exc

    if "train_split" in payload:
        try:
            result["train_split"] = float(payload["train_split"])
        except (TypeError, ValueError) as exc:
            raise ValueError("`hyperparams.train_split` must be numeric.") from exc

    if "shuffle" in payload:
        result["shuffle"] = bool(payload["shuffle"])

    if "loss" in payload:
        result["loss"] = str(payload["loss"])

    if "seed" in payload:
        seed = payload["seed"]
        if seed is None:
            result["seed"] = None
        else:
            try:
                result["seed"] = int(seed)
            except (TypeError, ValueError) as exc:
                raise ValueError("`hyperparams.seed` must be integer or null.") from exc

    if "max_samples" in payload:
        try:
            result["max_samples"] = int(payload["max_samples"])
        except (TypeError, ValueError) as exc:
            raise ValueError("`hyperparams.max_samples` must be an integer.") from exc

    optimizer = payload.get("optimizer")
    if isinstance(optimizer, dict):
        merged_optimizer = dict(DEFAULT_HYPERPARAMS["optimizer"])
        for key, value in optimizer.items():
            merged_optimizer[key] = value
        result["optimizer"] = merged_optimizer

    opt_cfg = result["optimizer"]
    opt_cfg["type"] = str(opt_cfg.get("type", DEFAULT_HYPERPARAMS["optimizer"]["type"])).lower()
    if "lr" in opt_cfg:
        try:
            opt_cfg["lr"] = float(opt_cfg["lr"])
        except (TypeError, ValueError):
            opt_cfg["lr"] = float(DEFAULT_HYPERPARAMS["optimizer"]["lr"])
    if opt_cfg["type"] == "sgd":
        if "momentum" in opt_cfg:
            try:
                opt_cfg["momentum"] = float(opt_cfg["momentum"])
            except (TypeError, ValueError):
                opt_cfg["momentum"] = float(DEFAULT_HYPERPARAMS["optimizer"].get("momentum", 0.0))
    elif opt_cfg["type"] == "adam":
        for key, fallback in [("beta1", 0.9), ("beta2", 0.999), ("eps", 1e-8)]:
            if key in opt_cfg:
                try:
                    opt_cfg[key] = float(opt_cfg[key])
                except (TypeError, ValueError):
                    opt_cfg[key] = float(fallback)

    return result
