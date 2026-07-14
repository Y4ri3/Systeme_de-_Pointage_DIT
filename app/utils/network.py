import ipaddress

from flask import request


def client_ip_in_networks(allowed_networks):
    """Vérifie que l'IP du client (request.remote_addr) appartient à l'un des réseaux CIDR fournis.

    Si allowed_networks est vide, la restriction est considérée comme désactivée (True).
    """
    if not allowed_networks:
        return True

    remote_addr = request.remote_addr
    if not remote_addr:
        return False

    try:
        client_ip = ipaddress.ip_address(remote_addr)
    except ValueError:
        return False

    for cidr in allowed_networks:
        try:
            network = ipaddress.ip_network(cidr, strict=False)
        except ValueError:
            continue
        if client_ip in network:
            return True

    return False
