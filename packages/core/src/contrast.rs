const AFFECTING_EXTERNAL: [&[usize]; 6] = [
    &[0, 1, 2, 8], // upper-left
    &[0, 1, 4, 8], // upper-right
    &[2, 3],       // middle-left
    &[4, 5],       // middle-right
    &[3, 6, 7, 9], // lower-left
    &[5, 6, 7, 9], // lower-right
];

pub fn enhance_vector(
    internal: &mut [f32; 6],
    external: &[f32; 10],
    global_exponent: f32,
    edge_exponent: f32
) {
    // 1. Directional Contrast
    for i in 0..6 {
        let affecting = AFFECTING_EXTERNAL[i];
        let mut max_ext = 0.0f32;
        for &idx in affecting {
            max_ext = max_ext.max(external[idx]);
        }
        
        let max_val = internal[i].max(max_ext);
        if max_val > 1e-6 {
            let normalized = internal[i] / max_val;
            internal[i] = normalized.powf(edge_exponent) * max_val;
        }
    }

    // 2. Global Contrast
    let mut max_all = 0.0f32;
    for &v in internal.iter() {
        max_all = max_all.max(v);
    }
    
    if max_all > 1e-6 {
        for v in internal.iter_mut() {
            *v = (*v / max_all).powf(global_exponent) * max_all;
        }
    }
}
