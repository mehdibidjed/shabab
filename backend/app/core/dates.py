from datetime import date


def month_start(d: date, back: int = 0) -> date:
    """First day of the month `back` months before `d`'s month."""
    y, m = d.year, d.month - back
    while m <= 0:
        y, m = y - 1, m + 12
    return date(y, m, 1)


def month_key(d: date) -> str:
    return d.strftime("%Y-%m")
