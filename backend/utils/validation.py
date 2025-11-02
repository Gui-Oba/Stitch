import json
import math

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


def _infer_image_shape_from_size(size: int):
    side = int(round(math.sqrt(size)))
    if side * side != size:
        return None
    return 1, side, side


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
        raise ValueError(
            "`architecture.input_size` must be convertible to int."
        ) from exc

    input_channels = payload.get("input_channels")
    input_height = payload.get("input_height")
    input_width = payload.get("input_width")

    input_shape = payload.get("input_shape")
    if isinstance(input_shape, (list, tuple)) and len(input_shape) == 3:
        try:
            input_channels = int(input_shape[0])
            input_height = int(input_shape[1])
            input_width = int(input_shape[2])
        except (TypeError, ValueError) as exc:
            raise ValueError("`input_shape` entries must be integers.") from exc

    if input_channels is None or input_height is None or input_width is None:
        inferred = _infer_image_shape_from_size(input_size)
        if inferred is not None:
            input_channels, input_height, input_width = inferred

    if input_channels is not None:
        try:
            input_channels = int(input_channels)
            input_height = int(input_height)
            input_width = int(input_width)
        except (TypeError, ValueError) as exc:
            raise ValueError("Input image shape must be integers.") from exc
        if input_channels <= 0 or input_height <= 0 or input_width <= 0:
            raise ValueError("Input image dimensions must be positive.")

    if input_channels is None:
        current_shape = {"mode": "vector", "size": input_size}
    else:
        current_shape = {
            "mode": "image",
            "channels": input_channels,
            "height": input_height,
            "width": input_width,
        }

    sanitized_layers = []

    for layer in layers:
        if not isinstance(layer, dict):
            raise ValueError("Each layer must be described by an object.")

        layer_type = str(layer.get("type", "linear")).lower()

        if layer_type == "linear":
            if current_shape["mode"] == "image":
                flattened = (
                    current_shape["channels"]
                    * current_shape["height"]
                    * current_shape["width"]
                )
                sanitized_layers.append({"type": "flatten"})
                current_shape = {"mode": "vector", "size": flattened}

            in_dim = layer.get("in", layer.get("input_dim", current_shape["size"]))
            out_dim = layer.get("out", layer.get("units", in_dim))
            try:
                in_dim = int(in_dim)
                out_dim = int(out_dim)
            except (TypeError, ValueError) as exc:
                raise ValueError("Linear layer dimensions must be integers.") from exc
            if in_dim <= 0 or out_dim <= 0:
                raise ValueError("Linear layer dimensions must be positive.")
            sanitized_layers.append({"type": "linear", "in": in_dim, "out": out_dim})
            current_shape = {"mode": "vector", "size": out_dim}

        elif layer_type == "flatten":
            if current_shape["mode"] == "vector":
                sanitized_layers.append({"type": "flatten"})
            else:
                flattened = (
                    current_shape["channels"]
                    * current_shape["height"]
                    * current_shape["width"]
                )
                sanitized_layers.append({"type": "flatten"})
                current_shape = {"mode": "vector", "size": flattened}

        elif layer_type == "conv2d":
            if current_shape["mode"] == "vector":
                inferred = _infer_image_shape_from_size(current_shape["size"])
                if inferred is None:
                    raise ValueError(
                        "Cannot infer image shape for convolution layer input."
                    )
                current_shape = {
                    "mode": "image",
                    "channels": inferred[0],
                    "height": inferred[1],
                    "width": inferred[2],
                }

            in_channels = layer.get("in_channels", current_shape["channels"])
            out_channels = layer.get("out_channels", layer.get("filters"))
            kernel_size = layer.get("kernel_size", layer.get("kernel", 3))
            stride = layer.get("stride", 1)
            padding = layer.get("padding", 0)

            try:
                in_channels = int(in_channels)
                out_channels = int(out_channels)
                kernel_size = int(kernel_size)
                stride = int(stride)
            except (TypeError, ValueError) as exc:
                raise ValueError("Conv2d parameters must be integers.") from exc

            if in_channels <= 0 or out_channels <= 0:
                raise ValueError("Conv2d channels must be positive.")
            if kernel_size <= 0 or stride <= 0:
                raise ValueError("Conv2d kernel size and stride must be positive.")

            if isinstance(padding, str):
                padding = padding.lower()
                if padding not in {"same", "valid"}:
                    raise ValueError(
                        "Conv2d padding must be 'same', 'valid', or integer."
                    )
                padding_for_module = padding if padding == "same" else 0
            else:
                try:
                    padding = int(padding)
                except (TypeError, ValueError) as exc:
                    raise ValueError(
                        "Conv2d padding must be integer or string."
                    ) from exc
                if padding < 0:
                    raise ValueError("Conv2d padding cannot be negative.")
                padding_for_module = padding

            sanitized_layers.append(
                {
                    "type": "conv2d",
                    "in_channels": in_channels,
                    "out_channels": out_channels,
                    "kernel_size": kernel_size,
                    "stride": stride,
                    "padding": padding_for_module,
                }
            )

            if isinstance(padding_for_module, str) and padding_for_module == "same":
                next_he = math.ceil(current_shape["height"] / stride)
                next_wi = math.ceil(current_shape["width"] / stride)
            else:
                pad = int(padding_for_module)
                next_he = max(
                    1,
                    math.floor(
                        (current_shape["height"] + 2 * pad - kernel_size) / stride + 1
                    ),
                )
                next_wi = max(
                    1,
                    math.floor(
                        (current_shape["width"] + 2 * pad - kernel_size) / stride + 1
                    ),
                )

            current_shape = {
                "mode": "image",
                "channels": out_channels,
                "height": next_he,
                "width": next_wi,
            }

        elif layer_type == "maxpool2d":
            if current_shape["mode"] == "vector":
                inferred = _infer_image_shape_from_size(current_shape["size"])
                if inferred is None:
                    raise ValueError(
                        "Cannot infer image shape for pooling layer input."
                    )
                current_shape = {
                    "mode": "image",
                    "channels": inferred[0],
                    "height": inferred[1],
                    "width": inferred[2],
                }

            kernel_size = layer.get("kernel_size", layer.get("pool_size", 2))
            stride = layer.get("stride", kernel_size)
            padding = layer.get("padding", 0)

            try:
                kernel_size = int(kernel_size)
                stride = int(stride)
                padding = int(padding)
            except (TypeError, ValueError) as exc:
                raise ValueError("MaxPool2d parameters must be integers.") from exc

            if kernel_size <= 0 or stride <= 0:
                raise ValueError("MaxPool2d kernel size and stride must be positive.")
            if padding < 0:
                raise ValueError("MaxPool2d padding cannot be negative.")

            sanitized_layers.append(
                {
                    "type": "maxpool2d",
                    "kernel_size": kernel_size,
                    "stride": stride,
                    "padding": padding,
                }
            )

            next_he = max(
                1,
                math.floor(
                    (current_shape["height"] + 2 * padding - kernel_size) / stride + 1
                ),
            )
            next_wi = max(
                1,
                math.floor(
                    (current_shape["width"] + 2 * padding - kernel_size) / stride + 1
                ),
            )

            current_shape = {
                "mode": "image",
                "channels": current_shape["channels"],
                "height": next_he,
                "width": next_wi,
            }

        elif layer_type == "dropout":
            rate = layer.get("p", layer.get("rate", 0.5))
            try:
                rate = float(rate)
            except (TypeError, ValueError) as exc:
                raise ValueError("Dropout probability must be numeric.") from exc
            if not (0 <= rate <= 1):
                raise ValueError("Dropout probability must be between 0 and 1.")
            sanitized_layers.append({"type": "dropout", "p": rate})

        elif layer_type in {"relu", "sigmoid", "tanh", "softmax"}:
            sanitized_layers.append({"type": layer_type})

        else:
            raise ValueError(f"Unsupported layer type `{layer_type}`.")

    result = {"input_size": input_size, "layers": sanitized_layers}

    if current_shape["mode"] == "image":
        result["output_channels"] = current_shape["channels"]
        result["output_height"] = current_shape["height"]
        result["output_width"] = current_shape["width"]

    if input_channels is not None:
        result["input_channels"] = input_channels
        result["input_height"] = input_height
        result["input_width"] = input_width

    return result


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
    opt_cfg["type"] = str(
        opt_cfg.get("type", DEFAULT_HYPERPARAMS["optimizer"]["type"])
    ).lower()
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
                opt_cfg["momentum"] = float(
                    DEFAULT_HYPERPARAMS["optimizer"].get("momentum", 0.0)
                )
    elif opt_cfg["type"] == "adam":
        for key, fallback in [("beta1", 0.9), ("beta2", 0.999), ("eps", 1e-8)]:
            if key in opt_cfg:
                try:
                    opt_cfg[key] = float(opt_cfg[key])
                except (TypeError, ValueError):
                    opt_cfg[key] = float(fallback)

    return result
