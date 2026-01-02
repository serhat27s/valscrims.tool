# ValScrim.Tools


<p align="center">
  <img src="https://i.gyazo.com/122ef6dee17010f948054bb527244619.png" width="700" />
  <img src="https://i.gyazo.com/db27f79def966914207c62c7d30abe34.png" width="700" />
</p>



**ValScrim.Tools** is a scrims tool for map selection and team generation, designed for VALORANT custom games and tournaments. 

## Features

-   **Map Picker**: Randomly generate map pools for Best of 1, Best of 3, or Best of 5 series.
    -   **Instant Generate**: Skip the roulette animation for quick results.
    -   **Exclusions**: Ban specific maps from the pool.
-   **Team Generator**: Easily balance teams with a random draw.
    -   **Instant Draw**: Quickly assign players to teams.
    -   **Wheel Spin**: Animate the process with a spinning wheel for added suspense.
-   **Coin Toss**: Built-in coin flip for side selection (Attacker/Defender).
-   **Modern UI**: Sleek, Valorant-inspired aesthetics with dark mode support.

## Tech Stack

Built with modern web technologies:
-   [React](https://react.dev/)
-   [Vite](https://vitejs.dev/)
-   [Tailwind CSS](https://tailwindcss.com/)
-   [shadcn/ui](https://ui.shadcn.com/)
-   [Lucide React](https://lucide.dev/) (Icons)

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/serhat27s/valscrim-tools.git
    cd valscrim-tools
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open http://localhost:8080 to view the app.

### Easy self-hosting

For a hassle-free experience, **just double-click `start-local.bat`** to launch the development server.
Alternatively, in your IDE **right-click `start-local.bat`** and select **"Open in integrated terminal"**.

**How `start-local.bat` works:**
- The batch file automatically runs `npm run dev` in the correct directory
- No need to open terminals or use command-line tools
- Works regardless of where you clone the repository
- The dev server will start in a Command Prompt window


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Not affiliated with Riot Games. VALORANT is a registered trademark of Riot Games, Inc.*
