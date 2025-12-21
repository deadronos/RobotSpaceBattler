## 2024-05-23 - [Sorting vs Finding]
**Learning:** The codebase often uses `sortEntities(items)[0]` to find the best candidate. This is O(N log N) and memory intensive due to intermediate arrays.
**Action:** Use a linear scan O(N) `findBestEntity` utility when only the top candidate is needed.
