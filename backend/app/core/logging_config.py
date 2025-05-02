import logging
import sys
from logging.handlers import RotatingFileHandler
import os


def setup_logging():
    # Create logs directory if it doesn't exist
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # Clear any existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers = []

    # Configure root logger
    root_logger.setLevel(logging.DEBUG)

    # Create formatters
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(formatter)

    # Add handler to root logger
    root_logger.addHandler(console_handler)

    # Configure specific loggers
    loggers = [
        "app.core.websocket.manager",
        "app.core.auth",
        "app.main",
        "uvicorn",
        "uvicorn.access",
        "uvicorn.error",
    ]

    for logger_name in loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.DEBUG)
        logger.addHandler(console_handler)
        logger.propagate = False  # Prevent duplicate logs
