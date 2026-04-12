use fontdue::Font;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;

static FONT: Lazy<Font> = Lazy::new(|| {
    let bytes = include_bytes!("../assets/font.ttf") as &[u8];
    Font::from_bytes(bytes, fontdue::FontSettings::default())
        .expect("failed to load font")
});

static CACHE: Lazy<Mutex<HashMap<String, Vec<(char, [f32; 6])>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

pub const CIRCLES: [(f32, f32, f32); 6] = [
    (0.30, 0.20, 0.22),
    (0.70, 0.15, 0.22),
    (0.30, 0.50, 0.22),
    (0.70, 0.50, 0.22),
    (0.30, 0.80, 0.22),
    (0.70, 0.85, 0.22),
];

fn rasterize(font: &Font, ch: char, font_size: f32, cell_w: u32, cell_h: u32) -> (Vec<f32>, u32, u32) {
    let scale = 8u32;
    let render_w = cell_w * scale;
    let render_h = cell_h * scale;
    let (metrics, bitmap) = font.rasterize(ch, font_size * scale as f32);
    let mut cell = vec![0.0f32; (render_w * render_h) as usize];

    if bitmap.is_empty() || metrics.width == 0 { return (cell, render_w, render_h); }

    let ox = ((render_w as i32 - metrics.width as i32) / 2).max(0) as u32;
    let oy = ((render_h as i32 - metrics.height as i32) / 2).max(0) as u32;

    for gy in 0..metrics.height {
        for gx in 0..metrics.width {
            let tx = ox + gx as u32;
            let ty = oy + gy as u32;
            if tx < render_w && ty < render_h {
                cell[(ty * render_w + tx) as usize] =
                    bitmap[gy * metrics.width + gx] as f32 / 255.0;
            }
        }
    }
    (cell, render_w, render_h)
}

fn compute_vector(bitmap: &[f32], w: u32, h: u32) -> [f32; 6] {
    let mut vec6 = [0.0f32; 6];
    for (i, &(cx, cy, r)) in CIRCLES.iter().enumerate() {
        vec6[i] = sample_circle_stratified(bitmap, w, h, cx, cy, r);
    }
    vec6
}

/// Stratified sampling for character bitmap (already grayscale, 0..1)
fn sample_circle_stratified(bitmap: &[f32], w: u32, h: u32, cx_n: f32, cy_n: f32, r_n: f32) -> f32 {
    let samples_per_dim = 4;
    let mut ink = 0.0f32;
    let mut total = 0.0f32;

    let fw = w as f32;
    let fh = h as f32;
    let cx = cx_n * fw;
    let cy = cy_n * fh;
    let radius = r_n * fh.min(fw);

    for i in 0..samples_per_dim {
        for j in 0..samples_per_dim {
            let fx = (i as f32 + 0.5) / samples_per_dim as f32 * 2.0 - 1.0;
            let fy = (j as f32 + 0.5) / samples_per_dim as f32 * 2.0 - 1.0;

            if fx*fx + fy*fy <= 1.0 {
                let px = (cx + fx * radius).round() as i32;
                let py = (cy + fy * radius).round() as i32;

                if px >= 0 && px < w as i32 && py >= 0 && py < h as i32 {
                    ink += bitmap[(py as u32 * w + px as u32) as usize];
                    total += 1.0;
                }
            }
        }
    }

    if total < 0.1 { 0.0 } else { ink / total }
}

pub fn build_shape_table(charset: &str, cell_w: u32, cell_h: u32) -> Option<Vec<(char, [f32; 6])>> {
    let key = format!("{}:{}x{}", charset, cell_w, cell_h);
    {
        let cache = CACHE.lock().ok()?;
        if let Some(cached) = cache.get(&key) {
            return Some(cached.clone());
        }
    }

    let mut table = Vec::new();

    for ch_char in charset.chars() {
        let (bitmap, bw, bh) = rasterize(&FONT, ch_char, cell_h as f32, cell_w, cell_h);

        if !ch_char.is_whitespace() {
            let has_ink = bitmap.iter().any(|&v| v > 0.0);
            if !has_ink { continue; }
        }

        let vec6 = compute_vector(&bitmap, bw, bh);
        table.push((ch_char, vec6));
    }

    if table.is_empty() {
        return None;
    }

    let mut maxes = [0.0f32; 6];
    for (_, vec) in &table {
        for i in 0..6 { maxes[i] = maxes[i].max(vec[i]); }
    }
    for (_, vec) in &mut table {
        for i in 0..6 {
            if maxes[i] > 1e-6 { vec[i] /= maxes[i]; }
        }
    }
    let mut cache = CACHE.lock().ok()?;
    cache.insert(key, table.clone());
    Some(table)
}
