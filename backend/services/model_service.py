import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset, random_split

from backend.utils.validation import DEFAULT_HYPERPARAMS, MNIST_INPUT_SIZE


def build_model(architecture):
    layers = []
    for layer_spec in architecture["layers"]:
        layer_type = str(layer_spec["type"]).lower()
        if layer_type == "linear":
            layers.append(nn.Linear(layer_spec["in"], layer_spec["out"]))
        elif layer_type == "relu":
            layers.append(nn.ReLU())
        elif layer_type == "sigmoid":
            layers.append(nn.Sigmoid())
        elif layer_type == "tanh":
            layers.append(nn.Tanh())
        elif layer_type == "softmax":
            layers.append(nn.Softmax(dim=1))
        else:
            raise ValueError(f"Unsupported layer type `{layer_type}`.")
    return nn.Sequential(*layers)


def synthetic_dataset(size, input_size, seed):
    generator = torch.Generator()
    if seed is not None:
        generator.manual_seed(seed)

    data = torch.rand(size, input_size, generator=generator)
    labels = torch.randint(0, 10, (size,), generator=generator)
    return TensorDataset(data, labels)


def prepare_dataloaders(batch_size, train_split, shuffle, max_samples, seed):
    total_samples = max(max_samples or DEFAULT_HYPERPARAMS["max_samples"], batch_size * 2)
    total_samples = max(2, total_samples)
    dataset = synthetic_dataset(total_samples, MNIST_INPUT_SIZE, seed)

    train_len = max(1, int(len(dataset) * train_split))
    if train_len >= len(dataset):
        train_len = len(dataset) - 1
    val_len = max(1, len(dataset) - train_len)

    generator = torch.Generator()
    if seed is not None:
        generator.manual_seed(seed)

    train_dataset, val_dataset = random_split(dataset, [train_len, val_len], generator=generator)

    train_loader = DataLoader(
        train_dataset, batch_size=batch_size, shuffle=shuffle, generator=generator
    )
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, generator=generator)
    return train_loader, val_loader


def configure_optimizer(optimizer_cfg, parameters):
    opt_type = str(optimizer_cfg.get("type", DEFAULT_HYPERPARAMS["optimizer"]["type"])).lower()
    lr = float(optimizer_cfg.get("lr", DEFAULT_HYPERPARAMS["optimizer"]["lr"]))
    if opt_type == "sgd":
        momentum = float(optimizer_cfg.get("momentum", DEFAULT_HYPERPARAMS["optimizer"].get("momentum", 0.0)))
        return torch.optim.SGD(parameters, lr=lr, momentum=momentum)
    if opt_type == "adam":
        beta1 = float(optimizer_cfg.get("beta1", 0.9))
        beta2 = float(optimizer_cfg.get("beta2", 0.999))
        eps = float(optimizer_cfg.get("eps", 1e-8))
        return torch.optim.Adam(parameters, lr=lr, betas=(beta1, beta2), eps=eps)
    raise ValueError(f"Unsupported optimizer `{opt_type}`.")


def tensor_from_pixels(pixels):
    if not isinstance(pixels, (list, tuple)):
        raise ValueError("`pixels` must be a list of numbers.")
    if len(pixels) != MNIST_INPUT_SIZE:
        raise ValueError(f"`pixels` must contain exactly {MNIST_INPUT_SIZE} values.")
    try:
        flattened = [float(value) for value in pixels]
    except (TypeError, ValueError) as exc:
        raise ValueError("`pixels` must be numeric.") from exc
    tensor = torch.tensor(flattened, dtype=torch.float32).view(1, -1)
    return tensor
