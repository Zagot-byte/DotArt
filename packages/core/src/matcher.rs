pub fn find_best(lookup: &[f32; 6], table: &[(char, [f32; 6])]) -> (usize, char) {
    let mut best_idx = 0;
    let mut best_ch = ' ';
    let mut best_dist = f32::MAX;

    for (i, (ch, vec)) in table.iter().enumerate() {
        let dist = lookup.iter().zip(vec.iter())
            .map(|(a, b)| (a - b) * (a - b))
            .sum::<f32>()
            .sqrt();

        if dist < best_dist {
            best_dist = dist;
            best_idx = i;
            best_ch = *ch;
        }
    }

    (best_idx, best_ch)
}
