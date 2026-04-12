# Project Context

The `ascii_renderer` project is a command-line tool and library that converts images into high-quality ASCII art. Unlike simple density-based renderers (which map overall brightness to a character like `@` or `.`), this renderer uses a **shape-based matching algorithm**. It characterizes the "shape" of both the source image cells and the target ASCII characters by sampling their luminance at specific regions (six internal circles) to produce a 6D vector, matching the closest character in this 6-dimensional space.

## File Breakdown

- **`__init__.py` & `__main__.py`**: Entry points that define package metadata and module execution.
- **`cli.py`**: Handles command-line arguments and configuration (width, contrast, color, etc.) and routes them to the main API.
- **`color.py`**: Utilities to wrap text in 24-bit true color ANSI escape sequences.
- **`contrast.py`**: Implements global and directional edge contrast routines, which sharpen the visual output by mathematically stretching the 6D shape vectors.
- **`lookup.py`**: Implements `CharacterLookup`, a nearest-neighbor table (optionally using KDTree for speed) that finds the best matching character for a given 6D vector.
- **`processor.py`**: The core driver of the pipeline. It handles image loading, grid calculation, coordinates bounding, sampling, orchestrating contrast enhancement, lookup, and color rendering.
- **`shape.py`**: Manages the construction of truth/reference 6D vectors for the ASCII characters by rendering them to an off-screen buffer via `PIL` and sampling their density, and defines the constants for internal/external sampling circles.

## Key Data Structures
- **`SamplingCircle(cx, cy, radius)`**: Represents a sampling region relative to a cell bounds (0.0 - 1.0 scale).
- **`CharacterShape(char, vector)`**: A struct binding an ASCII character string to its normalized 6D shape vector.
- **`CharacterLookup`**: The search index holding the generated `CharacterShape`s, optimized for minimum squared Euclidean distance checks.
- **`RenderConfig`**: Configuration dataclass to store user preferences (width, aspect ratio, contrasts, sample quality, invert, color).

## Key Constants
- **`INTERNAL_CIRCLES` (6 items)**: A 2x3 staggered layout of `SamplingCircle`s capturing density inside an individual character cell. Used to build the base 6D shape vector.
- **`EXTERNAL_CIRCLES` (10 items)**: `SamplingCircle`s that lie slightly outside a character cell, matching its top, bottom, left, right, and corner neighbors.
- **`AFFECTING_EXTERNAL`**: A mapping structure linking each of the 6 internal circles to a subset of the 10 external circles that are physically adjacent, used to compute directional contrast.

## Algorithm Summary in Plain English
1. **Precomputation (Shape Vector Generation):**
   For the given ASCII character set, we draw each character using a monospace font to a temporary image. We then divide the image into six specific overlapping circular regions (the `INTERNAL_CIRCLES`) and calculate the average brightness in each to produce a 6D "shape vector". The resulting vectors for all characters are normalized to create a standard reference table.
2. **Image Loading & Slicing:** 
   The source image is loaded, converted to grayscale (luminance), and then conceptually chopped into a grid. The number of columns equals the target terminal width, and the row count is scaled by the character cell aspect ratio.
3. **Sampling (Shape Extraction):** 
   For each cell in the image grid, we measure the luminance at the exact same six internal circular regions to generate a target 6D vector. If edge enhancement is requested, we also measure ten external circles neighboring the cell.
4. **Contrast Enhancement:** 
   Our target 6D vector is optionally enhanced. First, **Directional Contrast**: if a sampled cell component is dimmer than an immediately adjacent *external* region, we scale it relatively down (via an exponent), creating a sharp drop-off at edges. Second, **Global Contrast**: the 6D component values are normalized against their max value, raised to a power to stretch the difference between light and dark spots, and un-normalized.
5. **Matching:** 
   The algorithm cross-references the enhanced 6D shape vector of the cell against our character reference table, looking for the ASCII character whose vector is numerically closest (via minimum Euclidean distance).
6. **Assembling Output:** 
   The matched characters are stitched together row by row. If color is enabled, it grabs the average RGB color of the cell's rectangle from the master image and wraps the character in an ANSI true color code. The compiled block of text is returned.
