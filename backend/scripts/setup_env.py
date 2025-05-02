import os
import secrets


def setup_environment():
    # Generate a secure secret key
    secret_key = secrets.token_hex(32)

    env_content = f"""SECRET_KEY={secret_key}
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=DEBUG
PORT=8000
"""

    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

    if os.path.exists(env_path):
        print("Warning: .env file already exists. Skipping creation.")
        return

    try:
        with open(env_path, "w") as f:
            f.write(env_content)
        print("Created .env file with secure configuration")
    except Exception as e:
        print(f"Error creating .env file: {e}")


if __name__ == "__main__":
    setup_environment()
