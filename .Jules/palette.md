## 2024-05-22 - Keyboard Shortcuts
**Learning:** Adding keyboard shortcuts (Space/R) significantly improves the testing loop for simulation games, but must handle key repeats and input focus to avoid UI conflicts.
**Action:** Always check `!e.repeat` for toggle actions and `e.target` for inputs when implementing global shortcuts.
