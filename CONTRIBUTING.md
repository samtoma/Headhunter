# Contributing to Headhunter AI

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to Headhunter AI. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## 🛠️ Development Setup

### Prerequisites
*   **Docker** & **Docker Compose**
*   **Node.js 18+** (for local frontend dev)
*   **Python 3.13+** (for local backend dev)

### Getting Started
1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/headhunter.git
    cd headhunter
    ```
3.  **Create a branch** for your feature or fix:
    ```bash
    git checkout -b feature/amazing-feature
    ```
4.  **Start the stack** using Docker:
    ```bash
    docker compose up -d --build
    ```

## 🧪 Testing

We have a strict "Zero Test Failures" policy. Before submitting a PR, please ensure all tests pass.

### Running Tests
We recommend running tests inside the Docker container to ensure environment consistency.

**Backend Tests:**
```bash
docker exec headhunter_backend python -m pytest
```

**Frontend Tests:**
```bash
docker exec headhunter_frontend npm run test -- --run
```

## 📝 Coding Standards

### Python (Backend)
*   We use **Ruff** for linting and formatting.
*   Run `docker exec headhunter_backend ruff check .` to verify.

### JavaScript (Frontend)
*   We use **ESLint** for linting.
*   Run `docker exec headhunter_frontend npm run lint` to verify.

## 🚀 Pull Request Process

1.  Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2.  Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
3.  Increase the version numbers in any examples files and the README.md to the new version that this Pull Request would represent.
4.  You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## 🐛 Reporting Bugs

Bugs are tracked as GitHub issues. When filing an issue, please include:
*   A clear title and description.
*   Steps to reproduce the issue.
*   Expected vs. actual behavior.
*   Screenshots or logs if possible.

## 💬 Community

Join our community to discuss features, get help, or just hang out:
*   [Discord Server](https://discord.gg/placeholder)
*   [GitHub Discussions](https://github.com/placeholder/headhunter/discussions)

Thanks for hacking on Headhunter AI! 🚀
