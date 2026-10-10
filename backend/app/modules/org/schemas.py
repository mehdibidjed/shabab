from pydantic import BaseModel


class OrgNode(BaseModel):
    id: int
    code: str
    name_ar: str
    name_fr: str
    type: str
    path: str
    facility_id: int | None = None
    status: str | None = None
    members: int = 0
    children: list["OrgNode"] = []
