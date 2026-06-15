import sys
from pathlib import Path

# Add project root (two directories up) to PYTHONPATH
# env.py is at backend/alembic; two parents up is the repository root.
BASE_DIR = Path(__file__).resolve().parents[2]
# Prepend to sys.path so project imports take precedence
sys.path.insert(0, str(BASE_DIR))

from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
from backend.shared.db.connections import Base
from backend.services.auth.models import User # noqa: F401
from backend.services.partner.schema.models import Partner, Agent, PartnerServiceablePincode, PartnerHold # noqa: F401
from backend.services.admin.schema.models import AdminCreditConfiguration, Admin, PartnerCreditTransaction, PartnerVerificationHistory, PartnerPaymentRequest# noqa: F401
from backend.services.sell_phone.schema.models import PhoneList, LeadLock, Order, OrderStatusHistory # noqa: F401

from backend.services.sell_phone.schema.agent_pickup_details import AgentPickupDetails  # noqa: F401
from backend.services.referral.models import ReferralSettings, ReferralCode, ReferralHistory  # noqa: F401
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
