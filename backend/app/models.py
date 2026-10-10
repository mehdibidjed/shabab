"""Import every model so SQLAlchemy metadata is complete."""
from app.modules.activities.models import Activity, ActivityAttendance, Booking  # noqa: F401
from app.modules.facilities.models import Facility, Staff  # noqa: F401
from app.modules.members.models import Member  # noqa: F401
from app.modules.org.models import OrgUnit  # noqa: F401
from app.modules.psych.models import (  # noqa: F401
    Alert,
    Appointment,
    Assessment,
    CaseAccessLog,
    CaseFile,
    FollowUpPlan,
    Guidance,
    ParentReport,
    PreventiveProgram,
    Referral,
)
from app.modules.psych.models import Session as CounselingSession  # noqa: F401
