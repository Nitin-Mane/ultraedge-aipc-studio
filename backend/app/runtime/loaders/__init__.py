"""Model loader registry.

Importing this module auto-registers all built-in loaders.  To add a new model
family, create a loader module in this package and import it here.
"""

from app.runtime.loaders.base import get_all_loaders, get_loader, register_loader  # noqa: F401
from app.runtime.loaders.genai_loader import TextLoader, VisionLoader  # noqa: F401
from app.runtime.loaders.omni_loader import OmniLoader  # noqa: F401

# Auto-register built-in loaders
register_loader(OmniLoader())
register_loader(TextLoader())
register_loader(VisionLoader())
