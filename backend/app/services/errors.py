class ServiceError(Exception):
    """Erro de regra de negócio com mensagem segura para a pessoa usuária."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def not_found(what: str = "Registro") -> ServiceError:
    return ServiceError(404, f"{what} não encontrado.")


def forbidden() -> ServiceError:
    return ServiceError(403, "Você não tem acesso a este recurso.")
