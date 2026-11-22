"""Substitui a VM OpenSense por uma VM Pontos Fortes de 2 GB na Lightsail.

Sem --apply só imprime o plano. Nunca toca instâncias sem a tag do projeto
esperado (Receita, Oracle etc. ficam fora). Credenciais AWS ficam só na estação,
em .env local (AWS_USER_ID = access key id, AWS_SECRET = secret access key).

    python infra/lightsail.py plan --ssh-cidr 1.2.3.4/32
    python infra/lightsail.py replace --ssh-cidr 1.2.3.4/32 --apply --confirm-delete opensense-web
"""
import argparse
import ipaddress
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / ".runtime" / "infra"
REGION, ACCOUNT = "us-east-1", "273354648668"
OLD, OLD_TAG = "opensense-web", "opensense"
NEW, NEW_TAG = "pontos-fortes", "pontos-fortes"
BUNDLE, MAX_USD = "small_3_0", 12.0  # 2 GB RAM, 2 vCPU, 60 GB


def sdk():
    import boto3
    from botocore.config import Config
    from dotenv import dotenv_values
    env = dotenv_values(ROOT / ".env")
    key, secret = env.get("AWS_USER_ID"), env.get("AWS_SECRET")
    if not key or not secret:
        raise SystemExit("Preencha AWS_USER_ID e AWS_SECRET no .env local (nunca enviar à VM).")
    session = boto3.Session(aws_access_key_id=key, aws_secret_access_key=secret, region_name=REGION)
    cfg = Config(connect_timeout=5, read_timeout=20)
    if session.client("sts", config=cfg).get_caller_identity()["Account"] != ACCOUNT:
        raise SystemExit("Conta AWS diferente da verificada para este projeto.")
    return session.client("lightsail", config=cfg)


def tagged(instance, value):
    return any(t["key"] == "Project" and t["value"] == value for t in instance.get("tags", []))


def instance(ls, name):
    try:
        return ls.get_instance(instanceName=name)["instance"]
    except ls.exceptions.NotFoundException:
        return None


def save(name, value):
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = STATE / name
    path.write_text(value if isinstance(value, str) else json.dumps(value, indent=2, default=str) + "\n")
    path.chmod(0o600)
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("action", choices=["plan", "replace"])
    parser.add_argument("--ssh-cidr", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm-delete", default="")
    args = parser.parse_args()
    cidr = ipaddress.ip_network(args.ssh_cidr)
    if cidr.version != 4 or cidr.prefixlen != 32:
        raise SystemExit("A entrada SSH precisa ser um IPv4 /32.")

    ls = sdk()
    bundle = next(b for b in ls.get_bundles(includeInactive=False)["bundles"] if b["bundleId"] == BUNDLE)
    if bundle["price"] > MAX_USD:
        raise SystemExit(f"Plano custa US$ {bundle['price']}/mês, acima do teto de US$ {MAX_USD}.")
    old, new = instance(ls, OLD), instance(ls, NEW)
    if old and not tagged(old, OLD_TAG):
        raise SystemExit(f"{OLD} existe sem a tag Project={OLD_TAG}; não será apagada.")
    if new and not tagged(new, NEW_TAG):
        raise SystemExit(f"{NEW} existe sem a tag Project={NEW_TAG}; revisar manualmente.")
    plan = {"delete": OLD if old else None, "old_ip": old and old.get("publicIpAddress"),
            "create": None if new else NEW, "bundle": BUNDLE, "ram_gb": bundle["ramSizeInGb"],
            "monthly_usd": bundle["price"], "static_ip": f"{NEW}-ip", "ssh_cidr": str(cidr),
            "ports": ["22/" + str(cidr), "80/any", "443/any"], "applied": False}
    print(json.dumps(plan, indent=2))
    if args.action == "plan" or not args.apply:
        return
    if old and args.confirm_delete != OLD:
        raise SystemExit(f"Para apagar a VM antiga repita o nome: --confirm-delete {OLD}")

    if old:
        ls.delete_instance(instanceName=OLD, forceDeleteAddOns=True)
        print(f"{OLD} apagada.")
    if not new:
        key_name = f"{NEW}-ssh"
        try:
            pair = ls.create_key_pair(keyPairName=key_name, tags=[{"key": "Project", "value": NEW_TAG}])
            save("ssh-key", pair["privateKeyBase64"])
            print("Chave SSH nova salva em .runtime/infra/ssh-key (600).")
        except ls.exceptions.InvalidInputException:
            pass  # já existe; a privada deve estar em .runtime/infra/ssh-key
        ls.create_instances(instanceNames=[NEW], availabilityZone=REGION + "a", blueprintId="ubuntu_24_04",
                            bundleId=BUNDLE, keyPairName=key_name, ipAddressType="ipv4",
                            tags=[{"key": "Project", "value": NEW_TAG}])
        for _ in range(60):
            if instance(ls, NEW)["state"]["name"] == "running":
                break
            time.sleep(5)
    try:
        ls.allocate_static_ip(staticIpName=f"{NEW}-ip")
    except ls.exceptions.InvalidInputException:
        pass
    ls.attach_static_ip(staticIpName=f"{NEW}-ip", instanceName=NEW)
    ls.put_instance_public_ports(instanceName=NEW, portInfos=[
        {"fromPort": 22, "toPort": 22, "protocol": "tcp", "cidrs": [str(cidr)]},
        {"fromPort": 80, "toPort": 80, "protocol": "tcp", "cidrs": ["0.0.0.0/0"]},
        {"fromPort": 443, "toPort": 443, "protocol": "tcp", "cidrs": ["0.0.0.0/0"]}])
    ip = ls.get_static_ip(staticIpName=f"{NEW}-ip")["staticIp"]["ipAddress"]
    save("lightsail.json", {**plan, "applied": True, "ip": ip, "host": f"pontosfortes.{ip}.sslip.io"})
    print(json.dumps({"ip": ip, "host": f"pontosfortes.{ip}.sslip.io"}))


if __name__ == "__main__":
    main()
