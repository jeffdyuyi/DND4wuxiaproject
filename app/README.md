
# Wuxia Resource Maker - App Migration

I have converted the single-file HTML tool (`全资源制作器V4.html`) into a modern, extensible React Application. This structure makes it easier to add new features from existing reference documents in the future.

## Project Structure

The new application is located in the `app/` directory:

- `src/components/`: Contains the UI components.
    - `Sidebar.tsx`: The left navigation bar.
    - `ListPanel.tsx`: The item list management (search, create, delete, import/export).
    - `Editor.tsx`: The main editing form, dynamically rendering fields based on the selected module.
    - `Preview.tsx`: The card preview and image export logic (using `html2canvas`).
    - `FormHelpers.tsx`: Reusable form components like `KeywordSelector` and `RangeBuilder`.
- `src/constants.ts`: Contains the configuration, wuxia terms, and dictionaries from the original tool.
- `src/types.ts`: TypeScript definitions for the data models.
- `src/utils/storage.ts`: LocalStorage wrapper to persist data.
- `src/index.css`: Global styles, including the specific Wuxia card styling.

## How to Run

1. Open a terminal in the `app` directory.
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the link provided (usually `http://localhost:5173`) in your browser.

## Features Preserved

- **Data Persistence**: Uses `localStorage` compatible with the original logic (keys like `db_moves_v5`).
- **Wuxia Terms**: All terms (External/Internal, damage types, etc.) are preserved in `constants.ts`.
- **Card Rendering**: The visual style of the cards is ported to `index.css` to match the original.
- **Image Export**: You can copy or download the generated card images.
- **Import/Export**: Full JSON import/export is supported.

## Next Steps

- You can now easily extend the data models in `types.ts` and add new fields in `Editor.tsx` based on the *DND 4R Player Manual*.
- The `constants.ts` file is the central place to add new classes, keywords, or rules.
