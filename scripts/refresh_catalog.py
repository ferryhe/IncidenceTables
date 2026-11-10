import json
from datetime import date
from html import unescape
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.request import Request, urlopen


SOURCE = "https://mort.soa.org/WebService.asmx/GetListOfTables"
DESTINATION = Path(__file__).resolve().parents[1] / "public" / "catalog.json"
BODY = {
    "page": 1,
    "rows": 10000,
    "sidx": "TableIdentity",
    "sord": "asc",
    "keyWords": "",
    "type": -1,
    "usage": -1,
    "nation": -1,
}


def refresh():
    request = Request(
        SOURCE,
        data=json.dumps(BODY).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "Rate Atlas catalog refresh",
        },
    )
    with urlopen(request, timeout=60) as response:
        catalog = json.load(response)["d"]

    rows = catalog["rows"]
    if not rows or catalog["page"] != 1 or catalog["total"] != 1 or len(rows) != catalog["records"]:
        raise ValueError("The SOA response did not contain the complete catalog.")

    tables = []
    seen = set()
    for row in rows:
        identity = row["TableIdentity"]
        name, separator, description = row["TableName"].partition("&nbsp;<br/>")
        table = {
            "id": identity,
            "name": unescape(name).strip(),
            "description": unescape(description).strip(),
            "nation": unescape(row["Nation"]).strip(),
            "usage": unescape(row["ContentType"]).strip(),
            "layout": unescape(row["Type"]).strip(),
        }
        if (
            type(identity) is not int or identity <= 0 or identity in seen
            or not separator or not all(table[key] for key in ("name", "nation", "usage", "layout"))
        ):
            raise ValueError(f"Invalid or duplicate SOA table record {identity!r}.")
        seen.add(identity)
        tables.append(table)

    as_of = date.today().isoformat()
    with NamedTemporaryFile(
        dir=DESTINATION.parent, encoding="utf-8", mode="w", delete=False
    ) as output:
        temporary_path = Path(output.name)
        try:
            output.write(f'{{"asOf":"{as_of}","rows":[\n')
            output.write(",\n".join(json.dumps(table, ensure_ascii=False) for table in tables))
            output.write("\n]}\n")
            output.close()
            temporary_path.replace(DESTINATION)
        finally:
            temporary_path.unlink(missing_ok=True)
    print(f"Saved {len(tables):,} SOA catalog records dated {as_of}.")


if __name__ == "__main__":
    refresh()
