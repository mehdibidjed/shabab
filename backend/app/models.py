"""Import every model so SQLAlchemy metadata is complete."""
from app.modules.activities.models import Activity, Booking  # noqa: F401
from app.modules.facilities.models import Facility, Staff  # noqa: F401
from app.modules.members.models import Member  # noqa: F401
from app.modules.org.models import OrgUnit  # noqa: F401
