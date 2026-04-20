import enum


class RolUsuario(str, enum.Enum):
    admin = "admin"
    cajero = "cajero"
    mesero = "mesero"
    cocinero = "cocinero"


class EstadoMesa(str, enum.Enum):
    libre = "libre"
    ocupada = "ocupada"
    reservada = "reservada"
    por_limpiar = "por_limpiar"


class EstadoPedido(str, enum.Enum):
    abierto = "abierto"
    en_cocina = "en_cocina"
    servido = "servido"
    pagado = "pagado"
    cancelado = "cancelado"


class MetodoPago(str, enum.Enum):
    efectivo = "efectivo"
    tarjeta = "tarjeta"
    transferencia = "transferencia"
    nequi = "nequi"
    daviplata = "daviplata"


class UnidadInventario(str, enum.Enum):
    unidad = "unidad"
    kg = "kg"
    g = "g"
    l = "l"
    ml = "ml"
