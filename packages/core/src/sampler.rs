pub const INTERNAL_CIRCLES: [(f32, f32, f32); 6] = [
    (0.30, 0.20, 0.22),
    (0.70, 0.15, 0.22),
    (0.30, 0.50, 0.22),
    (0.70, 0.50, 0.22),
    (0.30, 0.80, 0.22),
    (0.70, 0.85, 0.22),
];

pub const EXTERNAL_CIRCLES: [(f32, f32, f32); 10] = [
    (0.30, -0.15, 0.18), (0.70, -0.15, 0.18), // top
    (-0.15, 0.25, 0.18), (-0.15, 0.75, 0.18), // left
    (1.15, 0.25, 0.18),  (1.15, 0.75, 0.18),  // right
    (0.30, 1.15, 0.18),  (0.70, 1.15, 0.18),  // bottom
    (-0.10, -0.10, 0.15),(1.10, 1.10, 0.15),  // corners
];

pub fn sample_circle_stratified(
    rgba: &[u8], img_w: u32, img_h: u32,
    cell_x: u32, cell_y: u32, cell_w: u32, cell_h: u32,
    cx_n: f32, cy_n: f32, r_n: f32
) -> f32 {
    let samples_per_dim = 4;
    let mut ink = 0.0f32;
    let mut total = 0.0f32;

    let fw = cell_w as f32;
    let fh = cell_h as f32;
    let cx = cell_x as f32 + cx_n * fw;
    let cy = cell_y as f32 + cy_n * fh;
    let radius = r_n * fh.min(fw);

    for i in 0..samples_per_dim {
        for j in 0..samples_per_dim {
            let fx = (i as f32 + 0.5) / samples_per_dim as f32 * 2.0 - 1.0;
            let fy = (j as f32 + 0.5) / samples_per_dim as f32 * 2.0 - 1.0;

            if fx*fx + fy*fy <= 1.0 {
                let px = (cx + fx * radius).round() as i32;
                let py = (cy + fy * radius).round() as i32;

                let px = px.clamp(0, img_w as i32 - 1) as u32;
                let py = py.clamp(0, img_h as i32 - 1) as u32;

                let idx = ((py * img_w + px) * 4) as usize;
                if idx + 2 < rgba.len() {
                    let r = rgba[idx] as f32 / 255.0;
                    let g = rgba[idx + 1] as f32 / 255.0;
                    let b = rgba[idx + 2] as f32 / 255.0;
                    let a = rgba[idx + 3] as f32 / 255.0;
                    let l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    // darkness: dark pixels = high value
                    ink += (1.0 - l) * a;
                    total += 1.0;
                }
            }
        }
    }

    if total < 0.1 { 0.0 } else { ink / total }
}

pub fn get_vectors(
    rgba: &[u8], img_w: u32, img_h: u32,
    x: u32, y: u32, w: u32, h: u32
) -> ([f32; 6], [f32; 10]) {
    let mut internal = [0.0f32; 6];
    for (i, &(cx, cy, r)) in INTERNAL_CIRCLES.iter().enumerate() {
        internal[i] = sample_circle_stratified(rgba, img_w, img_h, x, y, w, h, cx, cy, r);
    }

    let mut external = [0.0f32; 10];
    for (i, &(cx, cy, r)) in EXTERNAL_CIRCLES.iter().enumerate() {
        external[i] = sample_circle_stratified(rgba, img_w, img_h, x, y, w, h, cx, cy, r);
    }

    (internal, external)
}

pub fn avg_color(rgba: &[u8], img_w: u32, x: u32, y: u32, w: u32, h: u32) -> [u8; 3] {
    let mut r = 0.0f32;
    let mut g = 0.0f32;
    let mut b = 0.0f32;
    let mut count = 0.0f32;
    for row in 0..h {
        for col in 0..w {
            let px = (x + col).min(img_w - 1);
            let py = (y + row).min((rgba.len() as u32 / 4 / img_w).saturating_sub(1));
            let idx = ((py * img_w + px) * 4) as usize;
            if idx + 2 < rgba.len() {
                r += rgba[idx] as f32;
                g += rgba[idx+1] as f32;
                b += rgba[idx+2] as f32;
                count += 1.0;
            }
        }
    }
    if count < 1.0 { return [0,0,0]; }
    [(r/count) as u8, (g/count) as u8, (b/count) as u8]
}
