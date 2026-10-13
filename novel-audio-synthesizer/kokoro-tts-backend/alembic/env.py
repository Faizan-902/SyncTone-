"""Alembic environment configuration script for SyncTone."""

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

from alembic import context

# ------------------------------------------------------------------------------
# 1. Path Setup & Environment Variable Loading
# ------------------------------------------------------------------------------
backend_dir = Path(__file__).resolve().parents[1]
root_dir = backend_dir.parent.parent
sys.path.insert(0, str(backend_dir))

# Check for root .env or local .env
root_env = root_dir / ".env"
if root_env.exists():
    load_dotenv(dotenv_path=root_env)
else:
    load_dotenv()

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ------------------------------------------------------------------------------
# 2. Target Metadata for 'autogenerate'
# ------------------------------------------------------------------------------
from app.db.base import Base
import app.db.models  # Ensure all models are registered on Base.metadata

target_metadata = Base.metadata

# ------------------------------------------------------------------------------
# 3. Dynamic Database URL Resolution
# ------------------------------------------------------------------------------
def get_url() -> str:
    """Retrieve synchronous database URL from environment or alembic.ini."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        db_url = config.get_main_option("sqlalchemy.url")
    if db_url and db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return db_url or "postgresql://synctone_user:synctone_pass@localhost:5432/synctone"


# ------------------------------------------------------------------------------
# 4. Migration Execution Modes
# ------------------------------------------------------------------------------
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode without an active DB connection."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode with a live DB connection."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
