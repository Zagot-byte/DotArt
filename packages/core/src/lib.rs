mod contrast;
mod matcher;
mod sampler;
mod shape;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn from_buffer(
    rgba: &[u8],
    width: u32,
    height: u32,
    cols: u32,
    charset: &str,
    global_contrast: f32,
    edge_contrast: f32,
) -> Vec<u8> {
    if cols == 0 || width == 0 || height == 0 || rgba.is_empty() {
        return Vec::new();
    }

    let cell_w: u32 = 8;
    let cell_h: u32 = 16;
    let rows = height / cell_h;

    let shapes = match shape::build_shape_table(charset, cell_w, cell_h) {
        Some(s) => s,
        None => return Vec::new(),
    };

    let mut out = Vec::with_capacity((cols * rows * 4) as usize);

    for row in 0..rows {
        for col in 0..cols {
            let x = col * cell_w;
            let y = row * cell_h;

            let actual_w = cell_w.min(width.saturating_sub(x)).max(1);
            let actual_h = cell_h.min(height.saturating_sub(y)).max(1);

            let (mut internal, external) = sampler::get_vectors(rgba, width, height, x, y, actual_w, actual_h);
            
            // apply exponents
            contrast::enhance_vector(&mut internal, &external, global_contrast, edge_contrast);

            let (idx, _) = matcher::find_best(&internal, &shapes);

            let [r, g, b] = sampler::avg_color(rgba, width, x, y, actual_w, actual_h);

            out.push(idx as u8);
            out.push(r);
            out.push(g);
            out.push(b);
        }
    }

    out
}

#[wasm_bindgen]
pub fn debug_shapes(charset: &str) -> String {
    let shapes = match shape::build_shape_table(charset, 8, 16) {
        Some(s) => s,
        None => return "failed to build shape table".to_string(),
    };
    shapes.iter()
        .map(|(ch, v)| format!("{}: [{:.2},{:.2},{:.2},{:.2},{:.2},{:.2}]",
            ch, v[0], v[1], v[2], v[3], v[4], v[5]))
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_basic() {
        let rgba = vec![255u8; 8 * 16 * 4];
        let res = from_buffer(&rgba, 8, 16, 1, " .", 1.0, 1.0);
        assert_eq!(res.len(), 4);
    }
}
